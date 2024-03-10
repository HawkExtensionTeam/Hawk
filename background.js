import { BM25F } from './assets/wink-bm25-text-search.js';
import MiniSearch from './assets/minisearch.min.js';

const xmlEscape = require('xml-escape');
const { Mutex } = require('async-mutex');

const indexMutex = new Mutex();

let engine;
const winkNLP = require('wink-nlp');
const model = require('wink-eng-lite-web-model');

const nlp = winkNLP(model);
const { its } = nlp;
const _ = require('lodash');

const { removeStopwords } = require('stopword');

const defaultRegexList = [
  '^https://[^/]+\.amazon\.com/.*$',
  '^https://atoz\.amazon\.work/.*$',
  '^https://quip-amazon\.com/.*$',
  '^https://quip\.com/.*$',
];

const TITLE_BOOST = 3;
const MIN_SEARCH_TERM_LENGTH = 3;
const DEFAULT_WEIGHT = 0.2;
const BM25F_MIN_DOCS = 3;

const prepTask = function prepTask(text) {
  const tokens = [];
  nlp.readDoc(text)
    .tokens()
    .filter((t) => (t.out(its.type) === 'word' && !t.out(its.stopWordFlag)))
    .each((t) => tokens.push((t.out(its.negationFlag)) ? `!${t.out(its.stem)}` : t.out(its.stem)));
  return tokens;
};

let docs;
let runningEngine;

async function setupBM25F() {
  engine = new BM25F();

  await chrome.storage.local.get(['indexed']).then((result) => {
    if (result && result.indexed) {
      docs = result.indexed.corpus;
    }
  });

  engine.defineConfig({ fldWeights: { title: 20, body: 1 } });
  engine.definePrepTasks([prepTask]);
  if (docs && docs.length) {
    docs.forEach((doc, i) => {
      engine.addDoc(doc, i + 1);
    });
    if (docs.length >= BM25F_MIN_DOCS) {
      runningEngine = _.cloneDeep(engine);
      runningEngine.consolidate();
    }
  }
}

setupBM25F();

const miniSearch = new MiniSearch({
  fields: ['title', 'body'],
  storeFields: ['url'],
});

chrome.storage.local.get(['indexed']).then((result) => {
  miniSearch.addAll((result.indexed && result.indexed.corpus) ? result.indexed.corpus : []);
});

const MAX_TAB_REFRESH_ATTEMPTS = 20;
const TAB_REFRESH_DELAY_MS = 50;

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  chrome.storage.local.get(['indexed']).then((result) => {
    if (Object.keys(result).length > 0) {
      const { corpus } = result.indexed;
      if (corpus.length) {
        const suggestions = [];
        let searchResults = [];

        let combinator;
        let searchTerms = text.split(' ');
        const lastTerm = searchTerms[searchTerms.length - 1];
        switch (lastTerm) {
          case '&':
            combinator = 'AND';
            break;
          case '~':
            combinator = 'AND_NOT';
            break;
          default:
            combinator = null;
            break;
        }

        if (combinator && searchTerms.length) {
          searchTerms = searchTerms.slice(0, searchTerms.length - 1);
          text = searchTerms.join(' ');
        }

        if (corpus.length >= MIN_SEARCH_TERM_LENGTH && !combinator) {
          searchResults = runningEngine.search(text);
          for (let docID = 0; docID < 10; docID += 1) {
            if (docID === searchResults.length) break;
            const page = corpus[searchResults[docID][0] - 1];
            suggestions.push({
              content: page.url,
              description: page.title,
              deletable: true,
            });
          }
        }

        if (!suggestions.length) {
          if (combinator) {
            searchResults = miniSearch.search(text, {
              boost: { title: TITLE_BOOST },
              prefix: (term) => term.length > MIN_SEARCH_TERM_LENGTH,
              fuzzy: (term) => (term.length > MIN_SEARCH_TERM_LENGTH ? DEFAULT_WEIGHT : null),
              combineWith: combinator,
            });
          } else {
            searchResults = miniSearch.search(text, {
              boost: { title: TITLE_BOOST },
              prefix: (term) => term.length > MIN_SEARCH_TERM_LENGTH,
              fuzzy: (term) => (term.length > MIN_SEARCH_TERM_LENGTH ? DEFAULT_WEIGHT : null),
            });
          }
          for (let docID = 0; docID < 10; docID += 1) {
            if (docID === searchResults.length) break;
            const searchResult = searchResults[docID];
            const page = corpus[searchResult.id - 1];
            suggestions.push({
              content: page.url,
              description: page.title,
              deletable: true,
            });
          }
        }

        suggest(suggestions);
      }
    }
  });
});

chrome.omnibox.onInputEntered.addListener((text) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      const tabId = tabs[0].id;
      chrome.tabs.update(tabId, { url: text });
    } else {
      chrome.tabs.create({ url: text });
    }
  });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  chrome.storage.local.get('tasks').then((result) => {
    const existingTasks = result || {};
    const foundTask = existingTasks.tasks[alarm.name];
    if (Object.keys(existingTasks).length !== 0 && foundTask && !foundTask.recentlyDeleted) {
      const notification = {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('../images/logo128x128.png'),
        title: `Your task ${foundTask.title} is due`,
        message: foundTask.description,
      };
      chrome.notifications.create(alarm.name, notification);
    }
  });
});

function deleteTask(allTasks, taskIdToRemove) {
  const updatedTasks = Object.fromEntries(
    Object.entries(allTasks).filter(([taskId]) => taskId !== taskIdToRemove),
  );
  if (Object.keys(updatedTasks).length === 0) {
    allTasks = {};
  } else {
    allTasks = updatedTasks;
  }
  chrome.storage.local.set({ tasks: allTasks }, () => {
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  const alarmName = alarm.name;
  if (alarmName.endsWith('_deletion_alarm')) {
    const taskId = alarmName.split('_')[0];
    chrome.storage.local.get({ tasks: {} }, (result) => {
      const existingTasks = result.tasks || {};
      deleteTask(existingTasks, taskId);
    });
  }
});

function removeAnchorLink(url) {
  return url.split('#')[0];
}

async function getLocalStorage(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([key], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result);
      }
    });
  });
}

async function waitForTitleUpdate(title, lastTitle) {
  for (let i = 0; i < MAX_TAB_REFRESH_ATTEMPTS; i += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, TAB_REFRESH_DELAY_MS);
    });

    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (allTabs) => {
        resolve(allTabs);
      });
    });
    if (!(tabs && tabs.length)) return '';

    title = tabs[0].title;
    if (lastTitle !== title) break;

    if (i === MAX_TAB_REFRESH_ATTEMPTS - 1) return '';
  }

  return title;
}

chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === 'sendVisibleTextContent' || request.action === 'pageNavigated') {
    const releaseIndexing = await indexMutex.acquire();
    try {
      const url = removeAnchorLink(request.url);

      const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (allTabs) => {
          resolve(allTabs);
        });
      });
      if (!(tabs && tabs.length)) return;

      let { title } = tabs[0];
      const lastTitleResult = await getLocalStorage('lastTitle');
      const lastTitle = lastTitleResult.lastTitle || null;

      const indexedResult = await getLocalStorage('indexed');
      const indexed = indexedResult.indexed || {};
      if (Object.keys(indexed).length === 0) {
        indexed.corpus = [];
        indexed.links = new Set();
      }
      // chrome storage serialising and deserialising loses set type
      indexed.links = new Set(indexed.links);

      if (indexed.links.has(url)) return;

      if (title === lastTitle) {
        title = await waitForTitleUpdate(title, lastTitle);
        if (title === '') return;
      }
      await chrome.storage.local.set({ lastTitle: title });

      const page = {
        id: indexed.corpus.length + 1,
        url,
        title: xmlEscape(title),
        body: request.visibleTextContent,
      };

      const decodedURL = decodeURIComponent(page.url);
      if (`https://www.${page.title}` === decodedURL) {
        return;
      } if (`https://${page.title}` === decodedURL) {
        return;
      }

      const oldBody = page.body.split(/\n|\s/);
      const newBody = removeStopwords(oldBody).join(' ');
      page.body = newBody;
      indexed.corpus.push(page);
      indexed.links.add(url);

      miniSearch.add(page);

      engine.addDoc(page, String(page.id));
      runningEngine = _.cloneDeep(engine);
      if (Object.keys(runningEngine.getDocs()).length >= BM25F_MIN_DOCS) {
        runningEngine.consolidate();
      }

      // must convert to an array to avoid values being lost when
      // the set is converted to an Object during serialisation
      indexed.links = Array.from(indexed.links);
      await chrome.storage.local.set({ indexed });
    } finally {
      releaseIndexing();
    }
  } else if (request.action === 'updateIndexing') {
    miniSearch.removeAll();
    chrome.storage.local.get(['indexed']).then((result) => {
      miniSearch.addAll((result.indexed && result.indexed.corpus) ? result.indexed.corpus : []);
    });
    setupBM25F();
  }
});

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ allowedSites: [] }, () => {
    });

    chrome.storage.local.set({ allowedURLs: [] }, () => {
    });

    chrome.storage.local.set({ allowedStringMatches: [] }, () => {
    });

    chrome.storage.local.set({ allowedRegex: defaultRegexList }, () => {
    });

    chrome.storage.local.set({ lastTitle: null }, () => {
    });
  }
});
