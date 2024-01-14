import MiniSearch from './assets/minisearch.min.js';

const miniSearch = new MiniSearch({
  fields: ['title', 'body'],
  storeFields: ['url'],
});

chrome.storage.local.get(['indexed']).then((result) => {
  miniSearch.addAll((result.indexed && result.indexed.corpus) ? result.indexed.corpus : []);
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  chrome.storage.local.get(['indexed']).then((result) => {
    if (result && result.indexed) {
      const { corpus } = result.indexed;
      const searchResults = miniSearch.search(text, {
        boost: { title: 2 },
        prefix: (term) => term.length > 3,
        fuzzy: (term) => (term.length > 3 ? 0.2 : null),
      });

      const suggestions = [];
      let i = 0;
      while (i < 10) {
        if (i === searchResults.length) break;
        const searchResult = searchResults[i];
        const page = corpus[searchResult.id - 1];
        suggestions.push({
          content: page.url,
          description: page.title,
          deletable: true,
        });
        i += 1;
      }

      suggest(suggestions);
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

          indexed.corpus.push(page);
          indexed.links.add(url);

          miniSearch.add(page);

          // must convert to an array to avoid values being lost when
          // the set is converted to an Object during serialisation
          indexed.links = Array.from(indexed.links);
          chrome.storage.local.set({ indexed });
        }
      });
    }
  }
});
