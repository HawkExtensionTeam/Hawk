const currentURL = window.location.href;

$(document).on('click', 'a', (event) => {
  const link = $(event.target);
  const clickedURL = new URL(link.prop('href'));
  const clickedURLPath = clickedURL.pathname.replace(/\/[^\/]+$/, '');
  const currentURLPath = new URL(currentURL).pathname.replace(/\/[^\/]+$/, '');

  // Check if the clicked link is not an anchor link within the same page
  if (clickedURL.origin === new URL(currentURL).origin && clickedURLPath === currentURLPath) {
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

$(document).ready(() => {
  const visibleTextContent = document.body.innerText;
  chrome.runtime.sendMessage({
    action: 'sendVisibleTextContent',
    visibleTextContent,
    currentURL,
  });
});
