const visibleTextContent = $('body').text();
chrome.runtime.sendMessage({ action: 'sendVisibleTextContent', visibleTextContent });

$(document).on('click', 'a', (event) => {
  const link = $(event.target);
  const clickedURL = new URL(link.prop('href'));
  const currentURL = new URL(window.location.href);

  const clickedURLPath = clickedURL.pathname.replace(/\/[^\/]+$/, '');
  const currentURLPath = currentURL.pathname.replace(/\/[^\/]+$/, '');

  if (clickedURL.origin === currentURL.origin && clickedURLPath === currentURLPath) {
    chrome.runtime.sendMessage({ action: 'pageNavigated' });
  }
});
