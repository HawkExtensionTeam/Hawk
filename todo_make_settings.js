let curTasks = null;
const taskList = $('#selective-task-list');

function hideLists() {
  taskList.hide();
}

function exportAll() {
  chrome.storage.local.get(null, (data) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'todomake_backup_data.json';
    downloadLink.click();
  });
}

function overwriteTasks(tasks) {
  chrome.storage.local.set({ tasks }, () => {
  });
}

function restoreTags(tagsObj) {
  chrome.storage.local.set({ tags: tagsObj }, () => {
  });
}

function showTasks(tasks) {
  const selectiveList = $('.selective-list.task-list');
  selectiveList.empty();
  $.each(tasks, (key, value) => {
    const taskDiv = $('<div>').addClass('task-row');
    const title = `Title: ${value.title}`;
    const desc = `Description: ${value.description}`;
    const due = `Due: ${value.due}`;
    taskDiv.append(
      $('<label>').html(`${title}<br />${desc}<br />${due}`)
        .prepend(
          $('<input>').attr('type', 'checkbox').val(key)
            .prop('checked', false)
            .addClass('selective-checkbox'),
        ),
    );
    selectiveList.append(taskDiv);
  });
  $('.selective-task-list-col').css('display', 'block');
  curTasks = tasks;
}

function restoreSelectedTasks() {
  if (curTasks) {
    const toRestore = [];
    const selectiveList = $('.selective-list.task-list');
    selectiveList.find('.selective-checkbox').each(function _() {
      const elt = $(this);
      if (elt.is(':checked')) {
        const taskId = elt.val();
        toRestore.push({ ...curTasks[taskId] });
      }
    });
    overwriteTasks(toRestore);
  }
}

function overwriteIndex(indexArray) {
  chrome.storage.local.get(['indexed'], () => {
    const newIndexed = {
      corpus: indexArray[0],
      links: indexArray[1],
    };
    chrome.storage.local.set({ indexed: newIndexed });
  });
}

function overwriteNotes(notesArray) {
  chrome.storage.local.set({ notes: notesArray }, () => {
  });
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    hideLists();
    $(document).on('click', '.btn.btn-primary.backup-btn', (event) => {
      const $backupBtn = $(event.currentTarget);
      exportAll();
      $backupBtn.text('Downloaded data backup');
      setTimeout(() => {
        $backupBtn.text('Export extension data to backup (JSON)');
      }, 1000);
    });

    $(document).on('click', '.btn.btn-primary.restore-tasks-btn', (event) => {
      const $restoreBtn = $(event.currentTarget);
      restoreSelectedTasks();
      $restoreBtn.text('Restored!');
      setTimeout(() => {
        $restoreBtn.text('Perform overwriting restore with selection');
      }, 1000);
    });

    $(document).on('click', '.btn.btn-primary.background-reset-btn', () => {
      chrome.storage.local.set({ bg: '' }, () => {
      });
    });

    $(document).on('change', '#backgroundInput', (event) => {
      const selectedFile = event.target.files[0];
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          chrome.storage.local.set({ bg: e.target.result }, () => {
          });
        };
        reader.readAsDataURL(selectedFile);
      }
    });

    $(document).on('click', '.settings-entry', (event) => {
      const $entry = $(event.currentTarget);
      $('.settings-entry').removeClass('selected');
      $entry.addClass('selected');
      $('.settings-pane').addClass('hidden');
      $(`#${$entry.attr('id')}-pane`).removeClass('hidden');
    });

    if (window.location.hash) {
      const $entry = $(window.location.hash);
      $('.settings-entry').removeClass('selected');
      $entry.addClass('selected');
      $('.settings-pane').addClass('hidden');
      $(`#${$entry.attr('id')}-pane`).removeClass('hidden');
    }

    $(document).on('change', '#jsonAllInput', (event) => {
      const selectedFile = event.target.files[0];

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = JSON.parse(e.target.result);
          const { tasks } = content;
          if (Object.prototype.hasOwnProperty.call(content, 'tags')) {
            restoreTags(content.tags);
          }
          overwriteTasks(tasks);
          if (Object.prototype.hasOwnProperty.call(content, 'indexed')) {
            const indexArray = Object.values(content.indexed);
            overwriteIndex(indexArray);
          }
          if (Object.prototype.hasOwnProperty.call(content, 'notes')) {
            const notesArray = Object.values(content.notes);
            overwriteNotes(notesArray);
          }
        };
        reader.readAsText(selectedFile);
      }
    });

    $(document).on('change', '#jsonInput', (event) => {
      const selectedFile = event.target.files[0];

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = JSON.parse(e.target.result);
          const { tasks } = content;
          if (Object.prototype.hasOwnProperty.call(content, 'tags')) {
            restoreTags(content.tags);
          }
          overwriteTasks(tasks);
        };
        reader.readAsText(selectedFile);
      }
    });

    $(document).on('change', '#jsonInputSelective', (event) => {
      const selectedFile = event.target.files[0];

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = JSON.parse(e.target.result);

          if (Object.prototype.hasOwnProperty.call(content, 'tasks')) {
            const tasksArray = Object.values(content.tasks);
            showTasks(tasksArray);
          }
        };
        reader.readAsText(selectedFile);
      }
    });

    $(document).on('change', '#jsonIndexInput', (event) => {
      const selectedFile = event.target.files[0];

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = JSON.parse(e.target.result);

          if (Object.prototype.hasOwnProperty.call(content, 'indexed')) {
            const indexArray = Object.values(content.indexed);
            overwriteIndex(indexArray);
          }
        };
        reader.readAsText(selectedFile);
      }
    });

    $(document).on('change', '#jsonNoteInput', (event) => {
      const selectedFile = event.target.files[0];

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = JSON.parse(e.target.result);

          if (Object.prototype.hasOwnProperty.call(content, 'notes')) {
            const notesArray = Object.values(content.notes);
            overwriteNotes(notesArray);
          }
        };
        reader.readAsText(selectedFile);
      }
    });
  });
}
