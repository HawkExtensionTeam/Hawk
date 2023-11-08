document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("newTabButton").addEventListener("click", function () {
      chrome.tabs.create({ url: "new_tab.html" });
    });
  });