function formatTime(time) {
  return time < 10 ? `0${time}` : time;
}

function setTime() {
  const dateObject = new Date();
  const date = `${dateObject.getFullYear()}/${
    dateObject.getMonth() + 1}/${
    dateObject.getDate()}`;

  const time = `${formatTime(dateObject.getHours())}:${
    formatTime(dateObject.getMinutes())}`;

  // Set the default value using jQuery
  $('#timeInput').val(time);
  $('#dateInput').val(date);
}

function sortTasks(tasks) {
  const tasksArray = Object.entries(tasks).map(([id, task]) => ({ id, ...task }));
  tasksArray.sort((taskA, taskB) => new Date(taskA.due) - new Date(taskB.due));
  const sortedIds = tasksArray.map((task) => task.id);
  const sortedTasks = [];
	let idx = 0;
  sortedIds.forEach((id) => {
    sortedTasks[idx] = id;
		idx = idx + 1;
  });
  return sortedTasks;
}

function updateChecklist(tasks) {
  const checklist = $('#checklist-2');
  checklist.empty(); // Clear existing items
  if (Object.keys(tasks).length === 0) {
    checklist.append(`
      <div class="row justify-content-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="warn-2 bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
              <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
          </svg>
      </div>
      <div class="row justify-contents-center text-center">
          <div class="warn-text-2">
              No tasks yet.
          </div>
      </div>
    `);
  } 
	else {
    const sortedTasks = sortTasks(tasks);
    sortedTasks.forEach((taskId) => {
      const task = tasks[taskId];
      const dueDate = new Date(task.due);
			const parts = dueDate.toLocaleString().split(",");
      const formattedDueDate = "Due " + parts[0] + ', at' + parts[1];
			const passed = dueDate < new Date();
			const label = "form-check-label" + (passed ? " text-danger" : "");
      checklist.append(`
        <li class="checklist-item">
          <div class="form-check-2 d-flex justify-content-between align-items-center">
            <input type="checkbox" class="form-check-input" id="item${taskId}">
            <div class="container">
              <div class="row">
                <div class="col capped">
                  <div class="row">
                    <label class="${label} task-title" for="item${taskId}">${task.title}</label>
                  </div>
                  <div class="row">
                    <label class="${label} task-desc" for="item${taskId}">${task.description}</label>
                  </div>
                  <div class="row">
                    <label class="${label}" for="item${taskId}">${formattedDueDate}</label>
                  </div>
                </div>
                <div class="col-lg-2 mt-3 mt-md-3 mt-lg-0 d-flex">
                  <div class="col">
                    <button type="button" class="btn btn-danger delete-btn fill-btn" delete-task-id="${taskId}">Delete</button>
                  </div>
                  <br>
                  <div class="col edit-col">
                    <button type="button" class="btn btn-warning edit-btn fill-btn" edit-task-id="${taskId}" data-bs-toggle="modal" data-bs-target="#editTaskModal">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
      `);
			setTimeout(function() {
				$(".checklist-item").addClass("appear");
			}, 200);
    });
  }
}

function addTaskToChecklist(taskId) {
	chrome.storage.local.get({ tasks: {} }, (result) => {
		const tasks = result.tasks || {};
		if (tasks && tasks[taskId]) {
			const checklist = $('#checklist-2');
			if (Object.keys(tasks).length === 1) {
				checklist.empty();
			} 
			const task = tasks[taskId];
			const dueDate = new Date(task.due);
			const parts = dueDate.toLocaleString().split(",");
			const formattedDueDate = "Due " + parts[0] + ', at' + parts[1];
			const passed = dueDate < new Date();
			const label = "form-check-label" + (passed ? " text-danger" : "");
      checklist.append(`
        <li class="checklist-item">
          <div class="form-check-2 d-flex justify-content-between align-items-center">
            <input type="checkbox" class="form-check-input" id="item${taskId}">
            <div class="container">
              <div class="row">
                <div class="col capped">
                  <div class="row">
                    <label class="${label} task-title" for="item${taskId}">${task.title}</label>
                  </div>
                  <div class="row">
                    <label class="${label} task-desc" for="item${taskId}">${task.description}</label>
                  </div>
                  <div class="row">
                    <label class="${label}" for="item${taskId}">${formattedDueDate}</label>
                  </div>
                </div>
                <div class="col-lg-2 mt-3 mt-md-3 mt-lg-0 d-flex">
                  <div class="col">
                    <button type="button" class="btn btn-danger delete-btn fill-btn" delete-task-id="${taskId}">Delete</button>
                  </div>
                  <br>
                  <div class="col edit-col">
                    <button type="button" class="btn btn-warning edit-btn fill-btn" edit-task-id="${taskId}" data-bs-toggle="modal" data-bs-target="#editTaskModal">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
      `);
			setTimeout(function() {
				$(".checklist-item").addClass("appear");
			}, 200);
		}
	});
}

function getTasks() {
  $.when(chrome.storage.local.get({ tasks: [] })).done((result) => {
    const existingTasks = result.tasks || [];
    updateChecklist(existingTasks);
  });
}

function deleteTask(allTasks, taskId) {
  delete allTasks[taskId];
  chrome.storage.local.set({ tasks: allTasks }, () => {
    updateChecklist(allTasks);
  });
}

function openEditForm(taskId) {
  const editForm = $('#editForm');
  chrome.storage.local.get({ tasks: {} }, (result) => {
    const allTasks = result.tasks || {};
    const taskToEdit = allTasks[taskId];
    $('#editTaskInput').val(taskToEdit.title);
    $('#editDescriptionInput').val(taskToEdit.description);
    const dueDate = new Date(taskToEdit.due);
    $('#editDateInput').val(`${dueDate.getFullYear()}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`);
    $('#editTimeInput').val(`${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`);
    editForm.attr('edit-task-id', taskId);
  });
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    setTime();
    getTasks();

    $(document).on('click', '.btn.btn-warning.edit-btn', (event) => {
      const $editBtn = $(event.currentTarget);
      const taskId = $editBtn.attr('edit-task-id');

      openEditForm(taskId);
    });

    $(document).on('click', '.btn.btn-danger.delete-btn', (event) => {
      const $delBtn = $(event.currentTarget);
      chrome.storage.local.get({ tasks: {} }, (result) => {
        const existingTasks = result.tasks || {};
        deleteTask(existingTasks, $delBtn.attr('delete-task-id'));
      });
    });

    $('#todoForm').on('submit', (event) => {
      // prevents default page reload
      event.preventDefault();

      const taskTitle = $('#taskInput').val().trim();
      const taskDescription = $('#descriptionInput').val().trim();
      const taskDate = $('#dateInput').val().trim();
      const taskTime = $('#timeInput').val().trim();

      const taskData = [taskTitle, taskDescription, taskDate, taskTime];
      if (taskData.some((data) => data === '')) return;

      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(taskTime)) return;

      const [hoursStr, minutesStr] = taskTime.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      const dateRegex = /^\d{4}\/\d{1,2}\/\d{1,2}$/;
      if (!dateRegex.test(taskDate)) return;

      const [yearsStr, monthsStr, daysStr] = taskDate.split('/');
      const years = parseInt(yearsStr, 10);
      const months = parseInt(monthsStr, 10);
      const days = parseInt(daysStr, 10);

      // months start from 0
      const dueDate = new Date(years, months - 1, days, hours, minutes, 0);
      if (dueDate.toString() === 'Invalid Date') return;

      $.when(chrome.storage.local.get({ tasks: {} })).done((result) => {
        const existingTasks = result.tasks || {};
        const taskId = Date.now() + taskTitle;

        existingTasks[taskId] = {
          title: taskTitle,
          description: taskDescription,
          // ISO strings are consistent between JS engines
          due: dueDate.toISOString(),
        };
				
        // don't sync with other machines - extension is local
        $.when(chrome.storage.local.set({ tasks: existingTasks })).done(() => {
					chrome.alarms.create(taskId, {when: dueDate.getTime()});
					addTaskToChecklist(taskId);
        });
      });
    });

    $('#editForm').on('submit', (event) => {
      event.preventDefault();
      const editedTaskTitle = $('#editTaskInput').val().trim();
      const editedTaskDescription = $('#editDescriptionInput').val().trim();
      const editedTaskDate = $('#editDateInput').val().trim();
      const editedTaskTime = $('#editTimeInput').val().trim();

      const editedTimeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!editedTimeRegex.test(editedTaskTime)) {
        return;
      }

      const [editedHoursStr, editedMinutesStr] = editedTaskTime.split(':');
      const editedHours = parseInt(editedHoursStr, 10);
      const editedMinutes = parseInt(editedMinutesStr, 10);
      const editedDateRegex = /^\d{4}\/\d{2}\/\d{2}$/;
      if (!editedDateRegex.test(editedTaskDate)) {
        return;
      }

      const [editedYearsStr, editedMonthsStr, editedDaysStr] = editedTaskDate.split('/');
      const editedYears = parseInt(editedYearsStr, 10);
      const editedMonths = parseInt(editedMonthsStr, 10);
      const editedDays = parseInt(editedDaysStr, 10);

      const editedDueDate = new Date(
        editedYears,
        editedMonths - 1,
        editedDays,
        editedHours,
        editedMinutes,
        0,
      );
      if (editedDueDate.toString() === 'Invalid Date') {
        return;
      }

      $.when(chrome.storage.local.get({ tasks: {} })).done((result) => {
        const existingTasks = result.tasks || {};
        const taskIdToEdit = $('#editForm').attr('edit-task-id');

        if (existingTasks[taskIdToEdit]) {
          existingTasks[taskIdToEdit] = {
            title: editedTaskTitle,
            description: editedTaskDescription,
            due: editedDueDate.toISOString(),
          };

          $.when(chrome.storage.local.set({ tasks: existingTasks })).done(() => {
            updateChecklist(existingTasks);

            $('#editForm').hide();
          });
        }
      });
    });
  });
}