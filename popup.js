document.addEventListener("DOMContentLoaded", function () {

    const currentURL = document.location.href;
    if (currentURL.includes("new_tab.html")) {
        setTime();
    }

    document.getElementById("new-tab-button").addEventListener("click", function () {
        chrome.tabs.create({url: "new_tab.html"});
    });

    // prevent errors where popup.js is used on a page other than new_tab
    if (document.getElementById("todoForm")) {
        todoForm.addEventListener("submit", function (event) {
            // prevents default page reload
            event.preventDefault();

            const taskTitle = document.getElementById("taskInput").value;
            const taskDescription = document.getElementById("descriptionInput").value;
            const taskDate = document.getElementById("dateInput").value;
            const taskTime = document.getElementById("timeInput").value;

            // require
            if (taskTitle.length > 0 && taskDescription > 0 && taskDate > 0 && taskTime > 0) {
                chrome.storage.local.get({'tasks': []}, function (result) {
                    // avoid pushing to undefined if there are no previous tasks
                    const existingTasks = result.tasks || [];
                    existingTasks.push(taskTitle);
                    // don't sync with other machines - extension is local
                    chrome.storage.local.set({'tasks': existingTasks}, function () {
                        console.log('existingTasks', existingTasks);
                        console.log('newTask', taskTitle);
                    });
                });
            }
        });
    }
});

function setTime() {
    const dateObject = new Date();
    const date = dateObject.getDate() + "/"
        + (dateObject.getMonth() + 1) + "/"
        + dateObject.getFullYear()

    const time =+ dateObject.getHours() + ":"
        + dateObject.getMinutes() + ":"
        + dateObject.getSeconds();

    // Get the input element
    const timeElement = document.getElementById('timeInput');
    const dateElement = document.getElementById('dateInput');
    // Set the default value
    timeElement.value = time;
    dateElement.value = date;
}
