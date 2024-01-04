if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
    $(document).ready(function () {
        setTime();
        get_tasks();
        $("#new-task-button").click(function () {
            $("#todoForm").toggle();
        });

        $(document).on('click', '.btn.btn-warning.edit-btn', function(event) {
            const $editBtn = $(event.currentTarget);
            const taskId = $editBtn.attr('edit-task-id');
        
            openEditForm(taskId);
        });
		
		$(document).on('click', '.btn.btn-danger.delete-btn', function(event) {
			var $delBtn = $(event.currentTarget);
			chrome.storage.local.get({'tasks': {}}, function (result) {
				const existingTasks = result.tasks || {};
				deleteTask(existingTasks, $delBtn.attr('delete-task-id'));
			});
		});

        

        $("#todoForm").submit(function (event) {
            // prevents default page reload
            event.preventDefault();

            const taskTitle = $("#taskInput").val().trim();
            const taskDescription = $("#descriptionInput").val().trim();
            const taskDate = $("#dateInput").val().trim();
            const taskTime = $("#timeInput").val().trim();
            console.log(taskTitle);
            console.log(taskDescription);
            console.log(taskDate);
            console.log(taskTime);
            for (const taskData of [taskTitle, taskDescription, taskDate, taskTime]) {
                if (taskData === '') return;
            }

            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!timeRegex.test(taskTime)) return;

            const [hoursStr, minutesStr] = taskTime.split(':');
            const hours = parseInt(hoursStr);
            const minutes = parseInt(minutesStr);

            const dateRegex = /^\d{4}\/\d{1,2}\/\d{1,2}$/;
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
                console.log("67");
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
                    updateChecklist(existingTasks);
                });
            });
        });

        $("#editForm").submit(function (event) {
            // prevents default page reload
            event.preventDefault();
            const editedTaskTitle = $("#editTaskInput").val().trim();
            const editedTaskDescription = $("#editDescriptionInput").val().trim();
            const editedTaskDate = $("#editDateInput").val().trim();
            const editedTaskTime = $("#editTimeInput").val().trim();
        
            // Perform validation on edited task data here if needed
        
            const editedTimeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!editedTimeRegex.test(editedTaskTime)) {
                console.log('Invalid Time Format');
                console.log(editedTaskTime)
                return;
            }
        
            const [editedHoursStr, editedMinutesStr] = editedTaskTime.split(':');
            const editedHours = parseInt(editedHoursStr);
            const editedMinutes = parseInt(editedMinutesStr);
        
            const editedDateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
            if (!editedDateRegex.test(editedTaskDate)) {
                console.log('Invalid Date Format');
                return;
            }
        
            const [editedYearsStr, editedMonthsStr, editedDaysStr] = editedTaskDate.split('/');
            const editedYears = parseInt(editedYearsStr);
            const editedMonths = parseInt(editedMonthsStr);
            const editedDays = parseInt(editedDaysStr);
        
            // months start from 0
            const editedDueDate = new Date(editedYears, editedMonths - 1, editedDays, editedHours, editedMinutes, 0);
            if (editedDueDate.toString() === 'Invalid Date') {
                console.log('Invalid Date');
                return;
            }
        
            console.log("Validation Passed");
        
            chrome.storage.local.get({ 'tasks': {} }, function (result) {
                const existingTasks = result.tasks || {};
                const taskIdToEdit = $("#editForm").attr('edit-task-id');
                console.log(taskIdToEdit);
        
                if (existingTasks[taskIdToEdit]) {
                    existingTasks[taskIdToEdit] = {
                        'title': editedTaskTitle,
                        'description': editedTaskDescription,
                        'due': editedDueDate.toISOString(),
                    };
        
                    chrome.storage.local.set({ 'tasks': existingTasks }, function () {
                        console.log('existingTasks', existingTasks);
                        console.log('editedTask', editedTaskTitle);
                        updateChecklist(existingTasks);
        
                        // You can add any other logic or UI updates after editing the task
                        $("#editForm").hide(); // Hide the edit form after submission
                        // Add any additional UI feedback or reset form logic here
                    });
                }
            });
        });
        


        
    });

    function formatTime(time) {
        return time < 10 ? '0' + time : time;
    }

    function setTime() {
        const dateObject = new Date();
        const date =
        dateObject.getFullYear() + "/" +
            (dateObject.getMonth() + 1) + "/" +
            dateObject.getDate();

    const time =
        formatTime(dateObject.getHours()) + ":" +
        formatTime(dateObject.getMinutes());

        // Set the default value using jQuery
        $("#timeInput").val(time);
        $("#dateInput").val(date);
    }

    function get_tasks() {
        chrome.storage.local.get({ 'tasks': [] }, function(result) {
            const existingTasks = result.tasks || [];
            updateChecklist(existingTasks);
        });
    }

    function updateChecklist(tasks) {
        $("#checklist").empty(); // Clear existing items
		if (Object.keys(tasks).length === 0) {
			$("#checklist").append('<h1>There are no tasks!</h1>');
		}
		else {
			for (const taskId in tasks) {
				const task = tasks[taskId];
				const dueDate = new Date(task.due);
				const formattedDueDate = dueDate.toLocaleString();

				$("#checklist").append(
					'<li class="list-group-item"> <div class="form-check">' +
					'<input type="checkbox" class="form-check-input" id="item' + taskId + '">' +
					' <div class="container">' + '<div class="row"> <label class="form-check-label" for="item' + taskId + '">' + task.title + '</label>' +
                    '<label class="form-check-label" for="item' + taskId + '">' + task.description + '</label>' +
					'<label class="form-check-label" for="item' + taskId + '">' + formattedDueDate + '</label>' + 
                    '<div class="row">'+
                    '<div class="col-sm">'+
                    '<button type="button" class="btn btn-danger delete-btn" delete-task-id="' + taskId + '">Delete</button>' + '</div>' +
                    '<div class="col-sm">'+
                    '<button type="button" class="btn btn-warning edit-btn" edit-task-id="' + taskId + '">Edit</button>' + '</div>' +
					'</div> </div> </div>' + '</div>' + '</li>'
				);
			};
		}
    }

    function deleteTask(allTasks, taskId) {
        delete allTasks[taskId];
        chrome.storage.local.set({'tasks': allTasks}, function () {
            console.log('allTasks', allTasks);
            updateChecklist(allTasks);
        });
    }

    function openEditForm(taskId) {
        chrome.storage.local.get({'tasks': {}}, function (result) {
            const allTasks = result.tasks || {};
            const taskToEdit = allTasks[taskId];
    
            // Pre-fill the form with existing task details
            $("#editTaskInput").val(taskToEdit.title);
            $("#editDescriptionInput").val(taskToEdit.description);
            const dueDate = new Date(taskToEdit.due);
            $("#editDateInput").val(`${dueDate.getFullYear()}/${dueDate.getMonth() + 1}/${dueDate.getDate()}`);
            $("#editTimeInput").val(`${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`);
            $("#editForm").attr('edit-task-id', taskId);
    
            // Show the form
            $("#editForm").toggle();
        });
    }
    
}
