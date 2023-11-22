if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
    $(document).ready(function () {
        setTime();

        $("#todoForm").submit(function (event) {
            // prevents default page reload
            event.preventDefault();

            const taskTitle = $("#taskInput").val();
            const taskDescription = $("#descriptionInput").val();
            const taskDate = $("#dateInput").val();
            const taskTime = $("#timeInput").val();

            // require
            if (taskTitle !== '' && taskDescription !== '' && taskDate !== '' && taskTime !== '') {
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
    });

    function setTime() {
        const dateObject = new Date();
        const date =
            dateObject.getDate() + "/" +
            (dateObject.getMonth() + 1) + "/" +
            dateObject.getFullYear();

        const time =
            dateObject.getHours() + ":" +
            dateObject.getMinutes() + ":" +
            dateObject.getSeconds();

        // Set the default value using jQuery
        $("#timeInput").val(time);
        $("#dateInput").val(date);
    }
}
