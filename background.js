import MiniSearch from './assets/minisearch.min.js';

let miniSearch = new MiniSearch({
    fields: ['title', 'body'],
    storeFields: ['url']
});

$.when(chrome.storage.local.get(['indexed'])).done((result) => {
    miniSearch.addAll((result.indexed && result.indexed.corpus) ? result.indexed.corpus : []);
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    $.when(chrome.storage.local.get(['indexed'])).done((result) => {
        if (result && result.indexed) {
            let corpus = result.indexed.corpus;
            let searchResults = miniSearch.search(text, { 
                boost: { title: 2 },
                prefix: term => term.length > 3,
                fuzzy: term => term.length > 3 ? 0.2 : null
            });

            let suggestions = [];
            let i = 0;
            while (i < 10) {
                if (i === searchResults.length) break;
                const result = searchResults[i];
                const page = corpus[result.id - 1];
                suggestions.push({
                    content: page.url,
                    description: page.title,
                    deletable: true
                });
                i++;
            }

            suggest(suggestions);
        }
    });
});

chrome.omnibox.onInputEntered.addListener((text, disposition) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
            const tabId = tabs[0].id;
            chrome.tabs.update(tabId, { url: text });
        } else {
            chrome.tabs.create({ url: text });
        }
    });
});

chrome.runtime.onMessage.addListener(function (request) {
    if (request.action === 'sendVisibleTextContent' || request.action === 'pageNavigated') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length) {
                $.when(chrome.storage.local.get(['indexed'])).done((result) => {
                    let indexed = result.indexed || {};
                    if (Object.keys(indexed).length === 0) {
                        indexed.corpus = [];
                        indexed.links = new Set();
                    }

                    const url = tabs[0].url;
                    // chrome storage serialising and deserialising loses set type
                    indexed.links = new Set(indexed.links);
                    if (!indexed.links.has(url)) {
                        const page = {
                            'id': indexed.corpus.length + 1,
                            'url': url,
                            'title': tabs[0].title,
                            'body': request.visibleTextContent
                        };

                        indexed.corpus.push(page);
                        indexed.links.add(url);

                        miniSearch.add(page);

                        // must convert to an array to avoid values being lost when
                        // the set is converted to an Object during serialisation
                        indexed.links = Array.from(indexed.links);
                        chrome.storage.local.set({ 'indexed': indexed });
                        console.log('added', page.url);
                    }
                }).catch((error) => {
                    console.error(error);
                });
            }
        });
    }
});