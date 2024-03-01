function allDeleted(allTasks) {
  let allRecentlyDeleted = true;
  Object.keys(allTasks).forEach((key) => {
    if (!allTasks[key].recentlyDeleted) {
      allRecentlyDeleted = false;
    }
  });
  return allRecentlyDeleted;
}

function setTaskDeleted(allTasks, taskId) {
  const task = allTasks[taskId];
  const now = new Date();
  const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
  const alarmName = `${task.id}_deletion_alarm`;
  task.recentlyDeleted = true;
  task.scheduledDeletion = deletionDate.toISOString();
  chrome.storage.local.set({ tasks: allTasks }, () => {
    chrome.alarms.create(alarmName, { when: deletionDate.getTime() });
  });
}

function sortTasks(tasks) {
  const tasksArray = Object.entries(tasks).map(([id, task]) => ({ id, ...task }));
  tasksArray.sort((taskA, taskB) => new Date(taskA.due) - new Date(taskB.due));
  const sortedIds = tasksArray.map((task) => task.id);
  const sortedTasks = [];
  sortedIds.forEach((id) => {
    sortedTasks[id] = tasks[id];
  });
  return sortedTasks;
}

const emptyTemplate = `
  <div class="row justify-content-center mt-5">
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="warn-3 bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
      </svg>
  </div>
  <div class="row justify-contents-center text-center">
      <div class="warn-text-4">
          No tasks yet.
      </div>
  </div>
`;

function updateChecklist(existingTasks) {
  $('#checklist').empty();
  if (Object.keys(existingTasks).length === 0 || allDeleted(existingTasks)) {
    $('#checklist').append(emptyTemplate);
  } else {
    Object.keys(existingTasks).filter((taskId) => !existingTasks[taskId].recentlyDeleted)
      .slice(0, 3)
      .forEach((taskId) => {
        const task = existingTasks[taskId];
        if (!task.recentlyDeleted) {
          const dueDate = new Date(task.due);
          const now = new Date();
          const passed = dueDate < now;
          const parts = dueDate.toLocaleString().split(',');
          const formattedDueDate = `Due ${parts[0]}, at${parts[1]}`;
          const label = `form-check-label${passed ? ' text-danger' : ''}`;
          $('#checklist').append(`
            <li class="list-group-item mt-3 justify-content-between align-items-center">
              <div class="form-check d-flex popup-form-check align-items-center pb-1">
                <input type="checkbox" class="form-check-input" id="item${task.id}">
                <div class="container mt-1">
                  <div class="row">
                    <label class="emphasis-label ${label}" for="item${task.id}">${task.title}</label>
                    <label class="${label}" for="item${task.id}">${formattedDueDate}</label>
                  </div>
                </div>
              </div>
            </li>
          `);
        }
        setTimeout(() => {
          $('.list-group-item').addClass('appear');
        }, 200);
      });
    $('.form-check-input').on('click', function _() {
      const taskId = $(this).attr('id').slice(4);
      const item = $(this).closest('.list-group-item');
      let step = item.data('step') || 0;
      clearInterval(item.data('interval'));
      if ($(this).is(':checked')) {
        const interval = setInterval(() => {
          if (step <= 1000) {
            item.css({
              background: `linear-gradient(to right, #ff000036 ${(step / 1000) * 100}%, #dddddda3 0%)`,
            });
            step += 1;
            item.data('step', step);
          } else {
            clearInterval(interval);
            chrome.storage.local.get({ tasks: {} }, (result) => {
              setTaskDeleted(result.tasks, taskId);
              item.remove();
              if ($('#checklist').children().length === 0) {
                $('#checklist').append(emptyTemplate);
              }
            });
          }
        }, 5);
        item.data('interval', interval);
      } else {
        const interval = setInterval(() => {
          if (step > 0) {
            item.css({
              background: `linear-gradient(to right, #ff000036 ${(step / 1000) * 100}%, #dddddda3 0%)`,
            });
            step -= 20;
            if (step < 0) {
              step = 0;
            }
            item.data('step', step);
          } else {
            item.css({
              background: 'linear-gradient(to right, #ff000036 0%, #dddddda3 0%)',
            });
            clearInterval(interval);
          }
        }, 5);
        item.data('interval', interval);
      }
    });
  }
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    $('#todo-list-button').on('click', () => {
      chrome.tabs.create({ url: 'todo_list.html' });
    });

    $('#manage-settings').on('click', () => {
      chrome.tabs.create({ url: 'settings.html' });
    });

    $('#notebook').on('click', () => {
      chrome.tabs.create({ url: 'add_note.html' });
    });

    $('#indexing').on('click', () => {
      chrome.tabs.create({ url: 'settings.html#indexing_' });
    });

    chrome.storage.local.get({ tasks: {} }, (result) => {
      const existingTasks = sortTasks(result.tasks) || {};
      updateChecklist(existingTasks);
    });
  });
}
