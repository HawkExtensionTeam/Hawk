document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("new-tab-button").addEventListener("click", function () {
        chrome.tabs.create({url: "new_tab.html"});
    });
});
