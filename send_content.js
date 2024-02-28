const currentURL = window.location.href;

const quipRegex = /^https?:\/\/(?:www\.)?quip\.com(?:\/|$)/;

function checkSitesList() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['allowedSites'], (result) => {
      const storedSiteList = result.allowedSites;
      const sitesList = storedSiteList || [];
      const currentHostname = window.location.hostname;
      resolve(sitesList.includes(currentHostname));
    });
  });
}

function checkUrlsList() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['allowedURLs'], (result) => {
      const storedUrlsList = result.allowedURLs;
      const urlsList = storedUrlsList || [];
      resolve(urlsList.includes(currentURL));
    });
  });
}

function checkStringMatchesList() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['allowedStringMatches'], (result) => {
      const storedMatchesList = result.allowedStringMatches;
      const matchesList = storedMatchesList || [];
      resolve(matchesList.some((match) => currentURL.indexOf(match) > -1));
    });
  });
}

function checkRegexList() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['allowedRegex'], (result) => {
      const storedRegexList = result.allowedRegex;
      const regexList = storedRegexList || [];

      const isMatch = regexList.some((regex) => new RegExp(regex).test(currentURL));
      resolve(isMatch);
    });
  });
}

// sometimes params contain invalid characters like underscores
// encode them to avoid the URL constructor throwing an error
const parseURLWithParams = function parseURLWithParams(parts) {
  const baseURL = parts[0];
  const queryParams = parts[1];
  const params = queryParams.split('&');
  let newURL = `${baseURL}?`;
  params.forEach((param, index) => {
    if (index > 0) {
      newURL += '&';
    }

    const [key, value] = param.split('=');
    const encodedKey = encodeURIComponent(key);
    const encodedValue = encodeURIComponent(value);
    newURL += `${encodedKey}=${encodedValue}`;
  });

  return newURL;
};

const indexQuip = function indexQuip() {
  if (quipRegex.test(currentURL)) {
    try {
      chrome.storage.local.get(['indexed']).then((result) => {
        const indexed = result.indexed || {};
        if (Object.keys(indexed).length > 0) {
          indexed.links = new Set(indexed.links);
          if (indexed.links.has(currentURL)) {
            for (let i = 0; i < indexed.corpus.length; i += 1) {
              const page = indexed.corpus[i];
              if (page.url === currentURL) {
                const documentEditor = document.getElementsByClassName('document-editor');
                if (documentEditor.length === 1) {
                  const quipContent = documentEditor[0].innerText;
                  if (page.body !== quipContent) {
                    page.body = quipContent;
                    indexed.links = Array.from(indexed.links);
                    chrome.storage.local.set({ indexed });
                    chrome.runtime.sendMessage({ action: 'updateIndexing' });
                    return;
                  }
                }
              }
            }
          }
        }

        const documentEditor = document.getElementsByClassName('document-editor');
        if (documentEditor.length === 1) {
          const visibleTextContent = documentEditor[0].innerText;
          chrome.runtime.sendMessage({
            action: 'sendVisibleTextContent',
            visibleTextContent,
            currentURL,
          });
        }
      });
    } catch (error) {
      // extension will have been reloaded, ignore
    }
  }
};

$(document).ready(() => {
  Promise.all([checkSitesList(), checkUrlsList(), checkStringMatchesList(), checkRegexList()])
    .then((results) => {
      if (results.some((result) => result)) {
        $(document).on('click', 'a', (event) => {
          let link = $(event.target).prop('href');
          if (!link) return;
          const parts = link.split('?');
          if (parts.length > 1) {
            link = parseURLWithParams(parts);
          }
          const clickedURL = new URL(link);
          const clickedURLPath = clickedURL.pathname.replace(/\/[^\/]+$/, '');
          const currentURLPath = new URL(currentURL).pathname.replace(/\/[^\/]+$/, '');

          // Check if the clicked link is not an anchor link within the same page
          if (clickedURL.origin === new URL(currentURL).origin
          && clickedURLPath === currentURLPath) {
            const visibleTextContent = document.body.innerText;

            // Send a message indicating that the page has navigated
            try {
              chrome.runtime.sendMessage({
                action: 'sendVisibleTextContent',
                visibleTextContent,
                clickedURL,
              });
            } catch (error) {
            // extension will have been reloaded, ignore
            }
          }
        });
        if (quipRegex.test(currentURL)) {
          (async () => {
            await new Promise((resolve) => {
              setTimeout(resolve, 10000);
            });
          })();
          indexQuip();
          setInterval(indexQuip, 60000);
        } else {
          const visibleTextContent = document.body.innerText;
          chrome.runtime.sendMessage({
            action: 'sendVisibleTextContent',
            visibleTextContent,
            currentURL,
          });
        }
      }
    });
});
