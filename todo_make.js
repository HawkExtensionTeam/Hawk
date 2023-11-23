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

            for (taskData in [taskTitle, taskDescription, taskDate, taskTime]) {
                if (taskData === '') return;
            }

            const date = new Date(taskDate);
            if (date.toString === 'Invalid Date') return;

            if (taskTitle !== '' && taskDescription !== '' && taskDate !== '' && taskTime !== '') {
                chrome.storage.local.get({'tasks': []}, function (result) {
                    const existingTasks = result.tasks || [];
                    let taskId;
                    if (existingTasks.length > 0) {
                        pastTaskIds = Object.keys(existingTasks);
                        taskId = (Number(pastTaskIds[pastTaskIds.length-1]) + 1).toString();
                    } else {
                        taskId = '1';
                    }
                    // store as array for now
                    existingTasks.push({taskId: [taskTitle, taskDescription, taskDate, taskTime]})
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
