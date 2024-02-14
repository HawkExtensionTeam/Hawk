let tagFilter = {};
let currentlyAllFalse = true;
let tasksObj = {};
let tagsObj = {};

function getCorrectTextColour(colour) {
  const r = parseInt(colour.substring(1, 3), 16);
  const g = parseInt(colour.substring(3, 5), 16);
  const b = parseInt(colour.substring(5, 7), 16);
  return (((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186) ? '#000000' : '#ffffff';
}

function areAllTagsFalse() {
  return Object.keys(tagFilter).every((key) => tagFilter[key] === false);
}

function loadCustomBackground() {
  chrome.storage.local.get('bg', (result) => {
    if (result.bg !== '' && result.bg !== undefined) {
      $('body').css('background-image', `url(${result.bg})`);
    } else {
      $('body').css('background-image', 'url(\'../images/comic_bg.png');
    }
  });
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

function sortTasks(tasks) {
  const tasksArray = Object.entries(tasks).map(([id, task]) => ({ id, ...task }));
  tasksArray.sort((taskA, taskB) => new Date(taskA.due) - new Date(taskB.due));
  const sortedIds = tasksArray.map((task) => task.id);
  const sortedTasks = [];
  let idx = 0;
  sortedIds.forEach((id) => {
    sortedTasks[idx] = id;
    idx += 1;
  });
  return sortedTasks;
}

function updateChecklist(tasks) {
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
  const checklist = $('#checklist-2');
  checklist.empty(); // Clear existing items
  if (getNonDeletedCount(tasks) === 0) {
    checklist.append(noTasks);
  } else {
    const sortedTasks = sortTasks(tasks);
    const allTagsFalse = areAllTagsFalse();
    let insertedTasks = 0;
    sortedTasks.forEach((taskId) => {
      const task = tasks[taskId];
      if ((!task.recentlyDeleted) && (allTagsFalse || checkTagsAgainstFilter(task))) {
        insertedTasks += 1;
        const dueDate = new Date(task.due);
        const parts = dueDate.toLocaleString().split(',');
        const formattedDueDate = `Due ${parts[0]}, at${parts[1]}`;
        const passed = dueDate < new Date();
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
        checklist.append(`
        <li class="checklist-item" associatedTask="${taskId}">
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
                    <label class="${label} task-due" for="item${taskId}">${formattedDueDate}</label>
                  </div>
                  <div class="row tag-cont cont-clear">
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
      `);
      }
      setTimeout(() => {
        $('.checklist-item').addClass('appear');
      }, 200);
    });
    if (insertedTasks === 0) {
      checklist.append(noTasks);
    }
  }
}

function getTasks() {
  $.when(chrome.storage.local.get({ tasks: [] })).done((result) => {
    const existingTasks = result.tasks || [];
    updateChecklist(existingTasks);
  });
}

function setTaskDeleted(allTasks, task) {
  task.recentlyDeleted = true;

  chrome.storage.local.set({ tasks: allTasks }, () => {
    const now = new Date();
    const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days later
    const alarmName = `${task.id}_deletion_alarm`;
    chrome.alarms.create(alarmName, { when: deletionDate.getTime() });
    tasksObj = allTasks;
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
  if (changed) {
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
        checklist.prepend(`
          <li class="checklist-item" associatedTask="${taskId}">
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
                      <label class="${label} task-due" for="item${taskId}">${formattedDueDate}</label>
                    </div>
                    <div class="row tag-cont cont-clear">
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
        `);
        setTimeout(() => {
          $('.checklist-item').addClass('appear');
        }, 200);
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
    tagsObj = allTags;
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
    $(this).removeClass('appear');
  });
  $.each(toShow, function showMatches() {
    $(this).addClass('appear');
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
  loadCustomBackground();
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
        const randomId = Math.floor(Math.random() * 1000);
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
    const foundTagName = tagsObj.tags[associatedTag].tagName;
    if (window.confirm(`Are you sure you want to delete the tag "${foundTagName}"?`)) {
      chrome.storage.local.get({ tags: {} }, (data) => {
        deleteTag(data.tags, associatedTag);
      });
    }
  });

  $(document).on('click', '.btn.btn-warning.edit-btn', (event) => {
    const $editBtn = $(event.currentTarget);
    const taskId = $editBtn.attr('edit-task-id');
    openEditForm(taskId);
  });
  
  $(document).on('click', '.btn.btn-warning.btn-circle.add-task-btn', () => {
    setTime();
  });
  
  $(document).on('click', '.filter-trigger', () => {
    processFilter();
  });

  $(document).on('click', '.btn.btn-danger.delete-btn', (event) => {
    const $delBtn = $(event.currentTarget);
    $('#confirm-delete-btn').attr('delete-task-id', $delBtn.attr('delete-task-id'));
  });

  $(document).on('click', '.btn.btn-danger.confirm-del-btn', (event) => {
    const $delBtn = $(event.currentTarget);
    chrome.storage.local.get({ tasks: {} }, (result) => {
      const existingTasks = result.tasks || {};
      const taskId = $delBtn.attr('delete-task-id');
      setTaskDeleted(existingTasks, existingTasks[taskId]);
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
      const taskId = Date.now() + taskTitle;
      existingTasks[taskId] = {
        title: taskTitle,
        description: taskDescription,
        // ISO strings are consistent between JS engines
        due: dueDate.toISOString(),
        tags: selectedTags,
        recentlyDeleted: false,
      };

      // don't sync with other machines - extension is local
      $.when(chrome.storage.local.set({ tasks: existingTasks })).done(() => {
        chrome.alarms.create(taskId, { when: dueDate.getTime() });
        addTaskToChecklist(taskId);
        tasksObj = existingTasks;
      });
    });
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
        };

        $.when(chrome.storage.local.set({ tasks: existingTasks })).done(() => {
          updateChecklist(existingTasks);
          tasksObj = existingTasks;
        });
      }
    });
  });
}
