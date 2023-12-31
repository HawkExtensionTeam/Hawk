const visibleTextContent = document.body.innerText;
chrome.runtime.sendMessage({ action: 'sendVisibleTextContent', visibleTextContent });

document.addEventListener('click', function (event) {
    if (event.target.tagName === 'A') {
        const link = event.target;
        const clickedURL = new URL(link.href);
        const currentURL = new URL(window.location.href);

        const clickedURLPath = clickedURL.pathname.replace(/\/[^\/]+$/, '');
        const currentURLPath = currentURL.pathname.replace(/\/[^\/]+$/, '');

        if (clickedURL.origin === currentURL.origin && clickedURLPath === currentURLPath) {
            chrome.runtime.sendMessage({ action: 'pageNavigated' });
        }
    }
});
