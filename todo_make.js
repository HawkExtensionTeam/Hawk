if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
    $(document).ready(function () {
        setTime();

        $("#todoForm").submit(function (event) {
            // prevents default page reload
            event.preventDefault();

            const taskTitle = $("#taskInput").val().trim();
            const taskDescription = $("#descriptionInput").val().trim();
            const taskDate = $("#dateInput").val().trim();
            const taskTime = $("#timeInput").val().trim();

            for (const taskData of [taskTitle, taskDescription, taskDate, taskTime]) {
                if (taskData === '') return;
            }

            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(taskTime)) return;

            const [hoursStr, minutesStr] = taskTime.split(':');
            const hours = parseInt(hoursStr);
            const minutes = parseInt(minutesStr);

            const dateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
            if (!dateRegex.test(taskDate)) return;

            const [yearsStr, monthsStr, daysStr] = taskDate.split('/');
            const years = parseInt(yearsStr);
            const months = parseInt(monthsStr);
            const days = parseInt(daysStr);

            // months start from 0
            const dueDate = new Date(years, months-1, days, hours, minutes, 0);
            if (dueDate.toString === 'Invalid Date') return;

            chrome.storage.local.get({'tasks': {}}, function (result) {
                const existingTasks = result.tasks || {};

                let taskId;
                if (Object.keys(existingTasks).length > 0) {
                    pastTaskIds = Object.keys(existingTasks);
                    taskId = (Number(pastTaskIds[pastTaskIds.length-1]) + 1).toString();
                } else {
                    taskId = '1';
                }

                existingTasks[taskId] = {
                    'title': taskTitle,
                    'description': taskDescription,
                    // ISO strings are consistent between JS engines
                    'due': dueDate.toISOString(),
                };

                // don't sync with other machines - extension is local    
                chrome.storage.local.set({'tasks': existingTasks}, function () {
                    console.log('existingTasks', existingTasks);
                    console.log('newTask', taskTitle);
                });
            });
        });
    });

    function setTime() {
        const dateObject = new Date();
        const date =
        dateObject.getFullYear() + "/" +
            (dateObject.getMonth() + 1) + "/" +
            dateObject.getDate();

    const time =
        dateObject.getHours() + ":" +
        dateObject.getMinutes();

        // Set the default value using jQuery
        $("#timeInput").val(time);
        $("#dateInput").val(date);
    }
}
