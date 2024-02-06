import { BM25F } from './assets/wink-bm25-text-search.js';
import MiniSearch from './assets/minisearch.min.js';

const engine = new BM25F();
const winkNLP = require('wink-nlp');
const model = require('wink-eng-lite-web-model');

const nlp = winkNLP(model);
const { its } = nlp;
const _ = require('lodash');

const { removeStopwords } = require('stopword');

const prepTask = function prepTask(text) {
  const tokens = [];
  nlp.readDoc(text)
    .tokens()
    .filter((t) => (t.out(its.type) === 'word' && !t.out(its.stopWordFlag)))
    .each((t) => tokens.push((t.out(its.negationFlag)) ? `!${t.out(its.stem)}` : t.out(its.stem)));
  return tokens;
};

let docs;
await chrome.storage.local.get(['indexed']).then((result) => {
  if (result && result.indexed) {
    docs = result.indexed.corpus;
  }
});

let runningEngine;

engine.defineConfig({ fldWeights: { title: 20, body: 1 } });
engine.definePrepTasks([prepTask]);
if (docs && docs.length) {
  docs.forEach((doc, i) => {
    engine.addDoc(doc, i + 1);
  });
  if (docs.length >= 3) {
    runningEngine = _.cloneDeep(engine);
    runningEngine.consolidate();
  }
}

const miniSearch = new MiniSearch({
  fields: ['title', 'body'],
  storeFields: ['url'],
});

chrome.storage.local.get(['indexed']).then((result) => {
  miniSearch.addAll((result.indexed && result.indexed.corpus) ? result.indexed.corpus : []);
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  chrome.storage.local.get(['indexed']).then((result) => {
    if (Object.keys(result).length > 0) {
      const { corpus } = result.indexed;
      if (corpus.length) {
        const suggestions = [];
        let searchResults = [];

        if (corpus.length >= 3) {
          searchResults = runningEngine.search(text);
          for (let i = 0; i < 10; i += 1) {
            if (i === searchResults.length) break;
            const page = corpus[searchResults[i][0] - 1];
            suggestions.push({
              content: page.url,
              description: page.title,
              deletable: true,
            });
          }
        }

        if (!suggestions.length) {
          searchResults = miniSearch.search(text, {
            boost: { title: 3 },
            prefix: (term) => term.length > 3,
            fuzzy: (term) => (term.length > 3 ? 0.2 : null),
          });
          for (let i = 0; i < 10; i += 1) {
            if (i === searchResults.length) break;
            const searchResult = searchResults[i];
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

function setURL(request) {
  return new Promise((resolve) => {
    if (request.clickedURL) {
      setTimeout(() => {
        resolve(request.clickedURL);
      }, 500);
    } else {
      resolve(request.currentURL);
    }
  });
}

chrome.runtime.onMessage.addListener(async (request) => {
  if (request.action === 'sendVisibleTextContent' || request.action === 'pageNavigated') {
    const url = await setURL(request);
    const tabs = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (allTabs) => {
        resolve(allTabs);
      });
    });
    if (tabs && tabs.length) {
      chrome.storage.local.get(['indexed']).then((result) => {
        const indexed = result.indexed || {};
        if (Object.keys(indexed).length === 0) {
          indexed.corpus = [];
          indexed.links = new Set();
        }
        // chrome storage serialising and deserialising loses set type
        indexed.links = new Set(indexed.links);
        if (!indexed.links.has(url)) {
          const page = {
            id: indexed.corpus.length + 1,
            url,
            title: tabs[0].title,
            body: request.visibleTextContent,
          };

          const oldBody = page.body.split(/\n|\s/);
          const newBody = removeStopwords(oldBody).join(' ');
          page.body = newBody;
          indexed.corpus.push(page);
          indexed.links.add(url);

          miniSearch.add(page);

          engine.addDoc(page, String(page.id));
          runningEngine = _.cloneDeep(engine);
          if (Object.keys(runningEngine.getDocs()).length >= 3) {
            runningEngine.consolidate();
          }

          // must convert to an array to avoid values being lost when
          // the set is converted to an Object during serialisation
          indexed.links = Array.from(indexed.links);
          chrome.storage.local.set({ indexed });
        }
      });
    }
  }
});
