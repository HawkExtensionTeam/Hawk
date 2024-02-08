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
  const sortedTasks = {};
  sortedIds.forEach((id) => {
    taskId = Object.keys(sortedTasks).length + 1;
    sortedTasks[taskId] = tasks[id];
  });
  chrome.storage.local.set({ tasks: sortedTasks }, () => {});
}

function updateChecklist(tasks) {
  const checklist = $('#checklist');
  checklist.empty(); // Clear existing items
  if (Object.keys(tasks).length === 0) {
    checklist.append('<h1>There are no tasks!</h1>');
  } else {
    sortTasks(tasks);
    Object.keys(tasks).forEach((taskId) => {
      const task = tasks[taskId];
      const dueDate = new Date(task.due);
      const formattedDueDate = dueDate.toLocaleString();

      checklist.append(`
        <li class="list-group-item">
          <div class="form-check">
            <input type="checkbox" class="form-check-input" id="item${taskId}">
            <div class="container">
              <div class="row">
                <label class="form-check-label" for="item${taskId}">${task.title}</label>
                <label class="form-check-label" for="item${taskId}">${task.description}</label>
                <label class="form-check-label" for="item${taskId}">${formattedDueDate}</label>
                <div class="row">
                  <div class="col-sm">
                    <button type="button" class="btn btn-danger delete-btn" delete-task-id="${taskId}">Delete</button>
                  </div>
                  <div class="col-sm">
                    <button type="button" class="btn btn-warning edit-btn" edit-task-id="${taskId}">Edit</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </li>
      `);
    });
  }
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

    editForm.toggle();
  });
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    setTime();
    getTasks();
    $('#new-task-button').click(() => {
      $('#todoForm').toggle();
    });

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
        let taskId;
        let pastTaskIds;
        if ($.isEmptyObject(existingTasks)) {
          taskId = '1';
        } else {
          pastTaskIds = Object.keys(existingTasks);
          taskId = (Number(pastTaskIds[pastTaskIds.length - 1]) + 1).toString();
        }

        existingTasks[taskId] = {
          title: taskTitle,
          description: taskDescription,
          // ISO strings are consistent between JS engines
          due: dueDate.toISOString(),
        };

        // don't sync with other machines - extension is local
        $.when(chrome.storage.local.set({ tasks: existingTasks })).done(() => {
					chrome.alarms.create(taskId, {when: dueDate.getTime()});
          updateChecklist(existingTasks);
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
