let tagFilter = {};
let startDateObj = null;
let endDateObj = null;
let currentlyAllFalse = true;
let needToUpdateDateFilter = false;
let tasksObj = {};
let tagsObj = {};

const noTasks = `
  <div class="row justify-content-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="warn-2 bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
          <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
      </svg>
  </div>
  <div class="row justify-contents-center text-center">
      <div class="warn-text-2">
          No tasks found.
      </div>
  </div>
`;

function getCorrectTextColour(colour) {
  const r = parseInt(colour.substring(1, 3), 16);
  const g = parseInt(colour.substring(3, 5), 16);
  const b = parseInt(colour.substring(5, 7), 16);
  return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186) ? '#000000' : '#ffffff';
}

function getDaysBetweenString(date1, date2) {
  const timeDelta = Math.abs(date2.getTime() - date1.getTime());
  const dayDelta = Math.floor(timeDelta / 86400000);
  return `${dayDelta} day${dayDelta !== 1 ? 's' : ''}`;
}

function clearDates() {
  $('#startDate').val('');
  $('#endDate').val('');
  $('#startTime').val('');
  $('#endTime').val('');
  startDateObj = null;
  endDateObj = null;
}

function areAllTagsFalse() {
  return Object.keys(tagFilter).every((key) => tagFilter[key] === false);
}

function generateRandomId() {
  return Math.floor(Math.random() * 1000);
}

function getTasksObj() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ tasks: {} }, (result) => {
      resolve(result);
    });
  });
}

function getTagsObj() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ tags: {} }, (result) => {
      resolve(result);
    });
  });
}

function checkTagsAgainstFilter(task) {
  const taskTags = task.tags || [];

  return Object.keys(tagFilter).some((tagID) => {
    const filterValue = tagFilter[tagID];
    return taskTags.includes(tagID) && filterValue;
  });
}

function cleanupTagsInTasks() {
  chrome.storage.local.get({ tasks: {}, tagsObject: {} }, (result) => {
    const { tasks, tagsObject } = result;

    if (!tasks || !tagsObject) {
      return;
    }

    const updatedTasks = {};
    Object.keys(tasks).forEach((taskId) => {
      const task = tasks[taskId];

      // Filter the tags array
      const updatedTags = task.tags.filter((tag) => tagsObj.tags[tag]);

      // Update the task with cleaned up tags
      const updatedTask = { ...task, tags: updatedTags };
      updatedTasks[taskId] = updatedTask;
    });

    chrome.storage.local.set({ tasks: updatedTasks }, () => {
    });
  });
}

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

function getNonDeletedCount(allTasks) {
  let count = 0;
  $.each(allTasks, (index, task) => {
    if (!task.recentlyDeleted) {
      count += 1;
    }
  });
  return count;
}

function getDeletedCount(allTasks) {
  let count = 0;
  $.each(allTasks, (index, task) => {
    if (task.recentlyDeleted) {
      count += 1;
    }
  });
  return count;
}

function sortTasks(tasks) {
  const tasksArray = Object.entries(tasks).map(([id, task]) => ({ id, ...task }));
  const recentlyDeletedTasks = tasksArray.filter((task) => task.recentlyDeleted);
  const remainingTasks = tasksArray.filter((task) => !task.recentlyDeleted);
  recentlyDeletedTasks.sort((taskA, taskB) => new Date(taskA.scheduledDeletion)
                                              - new Date(taskB.scheduledDeletion));
  remainingTasks.sort((taskA, taskB) => new Date(taskA.due) - new Date(taskB.due));
  const sortedTasks = recentlyDeletedTasks.concat(remainingTasks);
  return sortedTasks.map((task) => task.id);
}

function setTaskDeleted(allTasks, task) {
  const now = new Date();
  const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
  const alarmName = `${task.id}_deletion_alarm`;
  task.recentlyDeleted = true;
  task.scheduledDeletion = deletionDate.toISOString();
  chrome.storage.local.set({ tasks: allTasks }, () => {
    chrome.alarms.create(alarmName, { when: deletionDate.getTime() });
    tasksObj = allTasks;
  });
}

function timedDeletion(taskUIObj) {
  const associatedTaskId = taskUIObj.attr('id').slice(4);
  const item = taskUIObj.closest('.form-check-2');
  const outerItem = taskUIObj.closest('.checklist-item');
  let step = item.data('step') || 0;
  clearInterval(item.data('interval'));
  if (taskUIObj.is(':checked')) {
    const interval = setInterval(() => {
      if (step <= 1000) {
        item.css({
          background: `linear-gradient(to right, var(--del-progress-color) ${(step / 1000) * 100}%, var(--ui-pane-color) 0%)`,
        });
        step += 1;
        item.data('step', step);
      } else {
        clearInterval(interval);
        chrome.storage.local.get({ tasks: {} }, (result) => {
          const existingTasks = result.tasks || {};
          setTaskDeleted(existingTasks, existingTasks[associatedTaskId]);
          outerItem.remove();
          if ($('#checklist-2').children().length === 0) {
            $('#checklist-2').append(noTasks);
          }
          // eslint-disable-next-line no-use-before-define
          updateChecklist(existingTasks, true);
        });
      }
    }, 5);
    item.data('interval', interval);
  } else {
    const interval = setInterval(() => {
      if (step > 0) {
        item.css({
          background: `linear-gradient(to right, var(--del-progress-color) ${(step / 1000) * 100}%, var(--ui-pane-color) 0%)`,
        });
        step -= 20;
        if (step < 0) {
          step = 0;
        }
        item.data('step', step);
      } else {
        item.css({
          background: 'linear-gradient(to right, var(--del-progress-color) 0%, var(--ui-pane-color) 0%)',
        });
        clearInterval(interval);
      }
    }, 5);
    item.data('interval', interval);
  }
}

function updateChecklist(tasks, onlyRd) {
  const noRdTasks = `
    <div class="row justify-content-center d-none">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="warn-2 bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
        </svg>
    </div>
    <div class="row justify-contents-center text-center d-none">
        <div class="warn-text-2">
            No recently deleted tasks.
        </div>
    </div>
  `;
  const checklist = $('#checklist-2');
  const rdChecklist = $('#rd-checklist');
  if (!onlyRd) {
    checklist.empty(); // Clear existing items
  }
  rdChecklist.empty();
  const sortedTasks = sortTasks(tasks);
  const allTagsFalse = areAllTagsFalse();
  const now = new Date();
  if (getNonDeletedCount(tasks) === 0 && !onlyRd) {
    checklist.append(noTasks);
  }
  if (getDeletedCount(tasks) === 0) {
    rdChecklist.append(noRdTasks);
  }
  sortedTasks.forEach((taskId) => {
    const task = tasks[taskId];
    let toInsert = checklist;
    if (allTagsFalse || checkTagsAgainstFilter(task)) {
      if (task.recentlyDeleted) {
        toInsert = rdChecklist;
      } else if (onlyRd) {
        return;
      }
      const dueDate = new Date(task.due);
      const dateFilterShouldBeApplied = startDateObj !== null && endDateObj !== null;
      if (dateFilterShouldBeApplied && (dueDate < startDateObj || dueDate > endDateObj)) {
        return;
      }
      const parts = dueDate.toLocaleString().split(',');
      const formattedDueDate = `Due ${parts[0]}, at${parts[1]}`;
      const passed = dueDate < now;
      const label = `form-check-label${passed ? ' text-danger' : ''}`;
      let tagElements = '';
      Object.keys(tagsObj.tags).forEach((key) => {
        if (task.tags.includes(key)) {
          const tagObject = tagsObj.tags[key];
          const colourToUse = getCorrectTextColour(tagObject.tagColour);

          tagElements += `
            <div class="col-auto mb-2 zero-margin zero-padding">
              <div class="tag-item d-flex" associatedTag="${key}">
                <span class="tag" style="background-color: ${tagObject.tagColour}; color: ${colourToUse};">${tagObject.tagName}</span>
              </div>
            </div>
          `;
        }
      });
      const tickbox = toInsert === checklist ? `<input type="checkbox" class="form-check-input" id="item${taskId}">` : '';
      const buttons = toInsert === checklist ? `
        <div class="col-lg-2 mt-3 mt-md-3 mt-lg-0 d-flex">
          <div class="col">
            <button type="button" class="btn btn-danger delete-btn fill-btn" delete-task-id="${taskId}" data-bs-toggle="modal" data-bs-target="#deleteTaskModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"></path>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"></path>
              </svg>
              <br>Delete
            </button>
          </div>
          <br>
          <div class="col edit-col">
            <button type="button" class="btn btn-warning edit-btn fill-btn" edit-task-id="${taskId}" data-bs-toggle="modal" data-bs-target="#editTaskModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
                <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
              </svg>
              <br>Edit
            </button>
          </div>
        </div>
      ` : `
        <div class="col-lg-2 mt-3 mt-md-3 mt-lg-0 d-flex">
          <div class="col">
            <button type="button" class="btn btn-danger delete-forever-btn fill-btn" delete-task-id="${taskId}" data-bs-toggle="modal" data-bs-target="#deleteTaskForeverModal">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"></path>
                <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"></path>
              </svg>
              <br>Delete
            </button>
          </div>
          <br>
          <div class="col restore-col">
            <button type="button" class="btn btn-success restore-btn fill-btn" restore-task-id="${taskId}">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-cloud-download" viewBox="0 0 16 16">
                <path d="M4.406 1.342A5.53 5.53 0 0 1 8 0c2.69 0 4.923 2 5.166 4.579C14.758 4.804 16 6.137 16 7.773 16 9.569 14.502 11 12.687 11H10a.5.5 0 0 1 0-1h2.688C13.979 10 15 8.988 15 7.773c0-1.216-1.02-2.228-2.313-2.228h-.5v-.5C12.188 2.825 10.328 1 8 1a4.53 4.53 0 0 0-2.941 1.1c-.757.652-1.153 1.438-1.153 2.055v.448l-.445.049C2.064 4.805 1 5.952 1 7.318 1 8.785 2.23 10 3.781 10H6a.5.5 0 0 1 0 1H3.781C1.708 11 0 9.366 0 7.318c0-1.763 1.266-3.223 2.942-3.593.143-.863.698-1.723 1.464-2.383"/>
                <path d="M7.646 15.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 14.293V5.5a.5.5 0 0 0-1 0v8.793l-2.146-2.147a.5.5 0 0 0-.708.708z"/>
              </svg>
              <br>Restore
            </button>
          </div>
        </div>
      `;
      const taskTitle = toInsert === checklist ? task.title : `${task.title} (${getDaysBetweenString(now, new Date(task.scheduledDeletion))})`;
      toInsert.append(`
      <li class="checklist-item ${toInsert === rdChecklist && !$('#recently-deleted-btn').hasClass('open') ? 'd-none' : ''}" associatedTask="${taskId}">
        <div class="form-check-2 d-flex justify-content-between align-items-center">
          ${tickbox}
          <div class="container">
            <div class="row">
              <div class="col capped">
                <div class="row">
                  <label class="${label} task-title">${taskTitle}</label>
                </div>
                <div class="row">
                  <label class="${label} task-desc">${task.description}</label>
                </div>
                <div class="row">
                  <label class="${label} task-due">${formattedDueDate}</label>
                </div>
                <div class="row filter-cont cont-clear">
                  ${tagElements}
                </div>
              </div>
              ${buttons}
            </div>
          </div>
        </div>
      </li>
    `);
    }
    setTimeout(() => {
      $('.checklist-item').addClass('appear');
    }, 200);
  });
  $('.form-check-input').on('click', function _() {
    timedDeletion($(this));
  });
}

function getTasks() {
  $.when(chrome.storage.local.get({ tasks: [] })).done((result) => {
    const existingTasks = result.tasks || [];
    updateChecklist(existingTasks);
  });
}

function deleteTask(allTasks, taskIdToRemove) {
  const task = allTasks[taskIdToRemove];
  chrome.alarms.clear(`${task.id}_deletion_alarm`);
  const updatedTasks = Object.fromEntries(
    Object.entries(allTasks).filter(([taskId]) => taskId !== taskIdToRemove),
  );
  if (Object.keys(updatedTasks).length === 0) {
    allTasks = {};
  } else {
    allTasks = updatedTasks;
  }
  chrome.storage.local.set({ tasks: allTasks }, () => {
    updateChecklist(allTasks);
  });
}

function restoreTask(allTasks, taskIdToRestore) {
  const task = allTasks[taskIdToRestore];
  task.recentlyDeleted = false;
  task.scheduledDeletion = '';
  chrome.alarms.clear(`${task.id}_deletion_alarm`);
  chrome.storage.local.set({ tasks: allTasks }, () => {
    updateChecklist(allTasks);
  });
}

function populateTags() {
  chrome.storage.local.get({ tags: {} }, (data) => {
    const tagRow = $('.tag-row');
    const { tags } = data;
    if (tags && Object.keys(tags).length > 0) {
      tagRow.empty();
      tagFilter = {};
      Object.keys(tags).forEach((key) => {
        const tag = tags[key];
        tagFilter[key] = false;
        const colourToUse = getCorrectTextColour(tag.tagColour);
        tagRow.append(`
          <div class="col-auto mb-2">
            <div class="tag-item d-flex align-items-center" associatedTag="${key}">
              <input type="checkbox" class="selective-checkbox" id="${key}">
              <span class="tag" style="background-color: ${tag.tagColour}; color: ${colourToUse};">${tag.tagName}</span>
            </div>
          </div>  
        `);
      });
    }
  });
}

function clearTagFilter() {
  const checkboxes = $('#tag-select-target').find('.selective-checkbox');
  if (checkboxes.length > 0) {
    checkboxes.prop('checked', false);
    Object.keys(tagFilter).forEach((key) => {
      tagFilter[key] = false;
    });
  }
}

function processFilter() {
  let changed = false;
  Object.keys(tagFilter).forEach((key) => {
    const result = $('#tag-select-target').find(`[id="${key}"]`);
    if (result.length > 0) {
      if (tagFilter[key] !== result[0].checked) {
        changed = true;
      }
      tagFilter[key] = result[0].checked;
    }
  });
  currentlyAllFalse = areAllTagsFalse();
  if (needToUpdateDateFilter) {
    needToUpdateDateFilter = false;
    getTasks();
  } else if (changed) {
    getTasks();
  }
}

function getSelectedTags(selector) {
  let insIdx = 0;
  const selected = [];
  Object.keys(tagFilter).forEach((key) => {
    const result = $(selector).find(`[id="${key}"]`);
    if (result.length > 0 && result[0].checked) {
      selected[insIdx] = key;
      insIdx += 1;
    }
  });
  return selected;
}

function addTag(tagID, tagObject) {
  const tagRow = $('.tag-row');
  tagFilter[tagID] = false;
  const colourToUse = getCorrectTextColour(tagObject.tagColour);
  tagRow.append(`
    <div class="col-auto mb-2">
      <div class="tag-item d-flex align-items-center" associatedTag="${tagID}">
        <input type="checkbox" class="selective-checkbox" id="${tagID}">
        <span class="tag" style="background-color: ${tagObject.tagColour}; color: ${colourToUse};">${tagObject.tagName}</span>
      </div>
    </div>  
  `);
}

function removeTag(key) {
  $(`.tag-item[associatedTag="${key}"]`).closest('.col-auto.mb-2').remove();
}

function addTaskToChecklist(taskId) {
  getTagsObj().then((obj) => {
    tagsObj = obj;
  });
  chrome.storage.local.get({ tasks: {} }, (result) => {
    const tasks = result.tasks || {};
    if (tasks && tasks[taskId]) {
      const checklist = $('#checklist-2');
      if (getNonDeletedCount(tasks) === 1) {
        checklist.empty();
      }
      const task = tasks[taskId];
      const dueDate = new Date(task.due);
      const parts = dueDate.toLocaleString().split(',');
      const formattedDueDate = `Due ${parts[0]}, at${parts[1]}`;
      const passed = dueDate < new Date();
      const label = `form-check-label${passed ? ' text-danger' : ''}`;
      if (currentlyAllFalse || checkTagsAgainstFilter(task)) {
        let tagElements = '';
        Object.keys(tagsObj.tags).forEach((key) => {
          if (task.tags.includes(key)) {
            const tagObject = tagsObj.tags[key];
            const colourToUse = getCorrectTextColour(tagsObj.tags[key].tagColour);

            tagElements += `
              <div class="col-auto mb-2 zero-margin zero-padding">
                <div class="tag-item d-flex" associatedTag="${key}">
                  <span class="tag" style="background-color: ${tagObject.tagColour}; color: ${colourToUse};">${tagObject.tagName}</span>
                </div>
              </div>
            `;
          }
        });
        const checklistItem = `
          <li class="checklist-item" associatedTask="${taskId}">
            <div class="form-check-2 d-flex justify-content-between align-items-center">
              <input type="checkbox" class="form-check-input" id="item${taskId}">
              <div class="container">
                <div class="row">
                  <div class="col capped">
                    <div class="row">
                      <label class="${label} task-title">${task.title}</label>
                    </div>
                    <div class="row">
                      <label class="${label} task-desc">${task.description}</label>
                    </div>
                    <div class="row">
                      <label class="${label} task-due">${formattedDueDate}</label>
                    </div>
                    <div class="row filter-cont cont-clear">
                      ${tagElements}
                    </div>
                  </div>
                  <div class="col-lg-2 mt-3 mt-md-3 mt-lg-0 d-flex">
                    <div class="col">
                      <button type="button" class="btn btn-danger delete-btn fill-btn" delete-task-id="${taskId}" data-bs-toggle="modal" data-bs-target="#deleteTaskModal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"></path>
                          <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"></path>
                        </svg>
                        <br>Delete
                      </button>
                    </div>
                    <br>
                    <div class="col edit-col">
                      <button type="button" class="btn btn-warning edit-btn fill-btn" edit-task-id="${taskId}" data-bs-toggle="modal" data-bs-target="#editTaskModal">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-pencil" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
                        </svg>
                        <br>Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        `;
        checklist.prepend(checklistItem);
        setTimeout(() => {
          $('.checklist-item').addClass('appear');
        }, 200);
        $(`#item${taskId}`).on('click', function _() {
          timedDeletion($(this));
        });
      }
    }
  });
}

function deleteTag(allTags, tagIdToRemove) {
  const updatedTags = Object.fromEntries(
    Object.entries(allTags).filter(([tagId]) => tagId !== tagIdToRemove),
  );
  if (Object.keys(updatedTags).length === 0) {
    allTags = {};
  } else {
    allTags = updatedTags;
  }
  chrome.storage.local.set({ tags: allTags }, () => {
    removeTag(tagIdToRemove);
    tagsObj.tags = allTags;
  });
}

$('#task-input').on('input', function _() {
  const visibleItems = $('.checklist-item');
  const query = $(this).val().toLowerCase();
  const trimmedQuery = query.trim();
  const toHide = [];
  const toShow = [];
  visibleItems.each(function determineResults() {
    let allText = $(this).find('.task-title').text() + $(this).find('.task-desc').text().toLowerCase();
    allText += $(this).find('.task-due').text().replace(/Due|at/g, '');
    if ((trimmedQuery === '' || allText.indexOf(query) >= 0) && (currentlyAllFalse || checkTagsAgainstFilter(tasksObj.tasks[$(this).attr('associatedTask')]))) {
      toShow.push($(this));
    } else {
      toHide.push($(this));
    }
  });
  $.each(toHide, function hideNonMatches() {
    $(this).addClass('d-none');
  });
  $.each(toShow, function showMatches() {
    $(this).removeClass('d-none');
  });
});

function openEditForm(taskId) {
  const editForm = $('#editForm');
  chrome.storage.local.get({ tasks: {} }, (result) => {
    const allTasks = result.tasks || {};
    const allTags = result.tasks[taskId].tags || {};
    const taskToEdit = allTasks[taskId];
    $('#editTaskInput').val(taskToEdit.title);
    $('#editDescriptionInput').val(taskToEdit.description);
    const dueDate = new Date(taskToEdit.due);
    $('#editDateInput').val(`${dueDate.getFullYear()}/${String(dueDate.getMonth() + 1).padStart(2, '0')}/${String(dueDate.getDate()).padStart(2, '0')}`);
    $('#editTimeInput').val(`${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`);
    editForm.attr('edit-task-id', taskId);
    $('#creation-tags-2').find('input').prop('checked', false);
    Object.keys(allTags).forEach((key) => {
      $('#creation-tags-2').find(`.selective-checkbox[id="${allTags[key]}"]`).prop('checked', true);
    });
  });
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  getTasksObj().then((obj) => {
    tasksObj = obj;
  });
  getTagsObj().then((obj) => {
    tagsObj = obj;
  });
  setTime();
  cleanupTagsInTasks();
  getTasks();
  populateTags();

  $(document).on('click', '.show-create-tag-modal-btn', () => {
    $('#tagName').val('');
    $('#tagColour').val('');
    $('#newTaskModal').modal('hide');
    $('#createTagModal').modal('show');
  });

  $(document).on('click', '.colour-square', (event) => {
    const eTarget = $(event.currentTarget);
    $('.colour-square').css('outline', 'none');
    eTarget.css('outline', '2px solid #007bff');
    $('#tagColour').val($(event.currentTarget).attr('assignedColour'));
  });

  $(document).on('click', '#createTagBtn', () => {
    const tagName = $('#tagName').val().trim();
    const tagColour = $('#tagColour').val().trim();

    if (tagName) {
      chrome.storage.local.get({ tags: {} }, (data) => {
        const timestamp = new Date().getTime();
        const randomId = generateRandomId();
        const newTag = `${timestamp}-${randomId}`;

        data.tags[newTag] = {
          tagColour,
          tagName,
        };

        chrome.storage.local.set({ tags: data.tags }, () => {
          addTag(newTag, data.tags[newTag]);
          tagsObj = data;
        });
      });
    }
    $('#newTaskModal').modal('show');
    $('#createTagModal').modal('hide');
  });

  $(document).on('click', '.create-tag-cancel', () => {
    $('#newTaskModal').modal('show');
  });

  $(document).on('contextmenu', '#tag-select-target .tag-item', function _(e) {
    e.preventDefault();
    const associatedTag = $(this).attr('associatedtag');
    if (tagsObj !== undefined && tagsObj.tags !== undefined) {
      const foundTagName = tagsObj.tags[associatedTag].tagName;
      if (window.confirm(`Are you sure you want to delete the tag "${foundTagName}"?`)) {
        chrome.storage.local.get({ tags: {} }, (data) => {
          deleteTag(data.tags, associatedTag);
        });
      }
    }
  });

  $(document).on('click', '.btn.btn-warning.edit-btn', (event) => {
    const $editBtn = $(event.currentTarget);
    const taskId = $editBtn.attr('edit-task-id');
    openEditForm(taskId);
  });

  $(document).on('click', '#recently-deleted-btn', (event) => {
    const $toggleBtn = $(event.currentTarget);
    const checklist2 = $('#checklist-2');
    const rdChecklist = $('#rd-checklist');
    const backSvg = $('.back-svg');
    if ($toggleBtn.hasClass('open')) {
      checklist2.addClass('appear');
      checklist2.find('.checklist-item').removeClass('d-none');
      rdChecklist.find('.checklist-item').addClass('d-none');
      rdChecklist.find('.row').addClass('d-none');
      rdChecklist.removeClass('appear');
      $toggleBtn.removeClass('open');
      $toggleBtn.removeClass('pilled');
      $('.clock-svg').removeClass('svg-hide');
      backSvg.addClass('svg-hide');
      backSvg.removeClass('svg-show');
      $('.add-task-btn').removeClass('collapsed');
    } else {
      checklist2.removeClass('appear');
      checklist2.find('.checklist-item').addClass('d-none');
      rdChecklist.find('.checklist-item').removeClass('d-none');
      rdChecklist.find('.row').removeClass('d-none');
      rdChecklist.addClass('appear');
      $toggleBtn.addClass('open');
      $toggleBtn.addClass('pilled');
      $('.clock-svg').addClass('svg-hide');
      backSvg.removeClass('svg-hide');
      backSvg.addClass('svg-show');
      $('.add-task-btn').addClass('collapsed');
    }
  });

  $(document).on('click', '.btn.btn-success.btn-circle.add-task-btn', () => {
    $('#taskInput').val('');
    $('#descriptionInput').val('');
    setTime();
  });

  $(document).on('click', '.filter-trigger', () => {
    processFilter();
  });

  $(document).on('click', '.btn.btn-danger.delete-btn', (event) => {
    const $delBtn = $(event.currentTarget);
    $('#confirm-delete-btn').attr('delete-task-id', $delBtn.attr('delete-task-id'));
  });

  $(document).on('click', '.btn.btn-danger.delete-forever-btn', (event) => {
    const $delBtn = $(event.currentTarget);
    $('#confirm-delete-forever-btn').attr('delete-task-id', $delBtn.attr('delete-task-id'));
  });

  $(document).on('click', '.btn.btn-danger.confirm-del-btn', (event) => {
    const $delBtn = $(event.currentTarget);
    chrome.storage.local.get({ tasks: {} }, (result) => {
      const existingTasks = result.tasks || {};
      const taskId = $delBtn.attr('delete-task-id');
      setTaskDeleted(existingTasks, existingTasks[taskId]);
      updateChecklist(existingTasks);
    });
  });

  $(document).on('click', '.btn.btn-danger.confirm-del-forever-btn', (event) => {
    const $delBtn = $(event.currentTarget);
    chrome.storage.local.get({ tasks: {} }, (result) => {
      const existingTasks = result.tasks || {};
      const taskId = $delBtn.attr('delete-task-id');
      deleteTask(existingTasks, taskId);
    });
  });

  $(document).on('click', '.btn.btn-success.restore-btn', (event) => {
    const $resBtn = $(event.currentTarget);
    chrome.storage.local.get({ tasks: {} }, (result) => {
      const existingTasks = result.tasks || {};
      const taskId = $resBtn.attr('restore-task-id');
      restoreTask(existingTasks, taskId);
    });
  });

  $('#todoForm').on('submit', (event) => {
    // prevents default page reload
    event.preventDefault();

    const taskTitle = $('#taskInput').val().trim();
    const taskDescription = $('#descriptionInput').val().trim();
    const taskDate = $('#dateInput').val().trim();
    const taskTime = $('#timeInput').val().trim();
    const selectedTags = getSelectedTags('#creation-tags');
    const taskData = [taskTitle, taskDescription, taskDate, taskTime, selectedTags];
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
      const taskId = Date.now() + generateRandomId().toString();
      existingTasks[taskId] = {
        title: taskTitle,
        description: taskDescription,
        // ISO strings are consistent between JS engines
        due: dueDate.toISOString(),
        tags: selectedTags,
        recentlyDeleted: false,
        scheduledDeletion: '',
        id: taskId,
      };

      // don't sync with other machines - extension is local
      $.when(chrome.storage.local.set({ tasks: existingTasks })).done(() => {
        if (dueDate > new Date()) {
          chrome.alarms.create(taskId, { when: dueDate.getTime() });
        }
        addTaskToChecklist(taskId);
        tasksObj = existingTasks;
      });
    });
    $('#newTaskModal').modal('hide');
  });

  $('#editForm').on('submit', (event) => {
    event.preventDefault();
    const editedTaskTitle = $('#editTaskInput').val().trim();
    const editedTaskDescription = $('#editDescriptionInput').val().trim();
    const editedTaskDate = $('#editDateInput').val().trim();
    const editedTaskTime = $('#editTimeInput').val().trim();
    const selectedTags = getSelectedTags('#creation-tags-2');
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
          tags: selectedTags,
          recentlyDeleted: false,
          scheduledDeletion: '',
          id: taskIdToEdit,
        };

        $.when(chrome.storage.local.set({ tasks: existingTasks })).done(() => {
          if (editedDueDate > new Date()) {
            chrome.alarms.clear(taskIdToEdit);
            chrome.alarms.create(taskIdToEdit, { when: editedDueDate.getTime() });
          }
          updateChecklist(existingTasks);
          tasksObj = existingTasks;
        });
      }
    });
    $('#editTaskModal').modal('hide');
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    chrome.storage.local.get('tasks').then((result) => {
      const existingTasks = result || {};
      const foundTask = existingTasks.tasks[alarm.name];
      if (Object.keys(existingTasks).length !== 0 && foundTask && !foundTask.recentlyDeleted) {
        $(`.checklist-item[associatedTask=${foundTask.id}]`).find('.form-check-label').addClass('text-danger');
        $(`.checklist-item[associatedTask=${foundTask.id}]`).addClass('shaking');
        setTimeout(() => {
          $(`.checklist-item[associatedTask=${foundTask.id}]`).removeClass('shaking');
        }, 500);
      }
    });
  });

  $('#startDate, #endDate, #startTime, #endTime').on('input', () => {
    let startDate = $('#startDate').val();
    let endDate = $('#endDate').val();
    let startTime = $('#startTime').val();
    let endTime = $('#endTime').val();

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

    // If no date is provided, set default values to year 2024 and 9999
    if (!startDate) {
      startDate = '2024-01-01';
    }
    if (!endDate) {
      endDate = '9999-12-31';
    }

    // If no time is provided, set default values
    if (!startTime) {
      startTime = '00:00';
    }
    if (!endTime) {
      endTime = '23:59';
    }

    // Validate the logical correctness of the dates and times
    if (startDate > endDate || (startDate === endDate && startTime > endTime)) {
      alert('Invalid date or time range. Please ensure that the end date and time are not earlier than the start date and time.');
      clearDates();
      return;
    }

    // Validate the format of the dates and times
    if (!dateRegex.test(startDate)
        || !dateRegex.test(endDate)
        || !timeRegex.test(startTime)
        || !timeRegex.test(endTime)) {
      return;
    }

    startDateObj = new Date(`${startDate}T${startTime}`);
    endDateObj = new Date(`${endDate}T${endTime}`);
    needToUpdateDateFilter = true;
  });

  $('#clear-filter-btn').on('click', () => {
    clearDates();
    needToUpdateDateFilter = true;
    clearTagFilter();
  });
}
