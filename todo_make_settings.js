const defaultRegexList = [
  '^https://[^/]+\.amazon\.com/.*$',
  '^https://atoz\.amazon\.work/.*$',
  '^https://quip-amazon\.com/.*$',
  '^https://quip\.com/.*$',
];
let curTags = null;
let curNotes = null;
let curTasks = null;
let curIndexEntries = null;
const maxStringLength = 64;
const taskList = $('#selective-task-list');

function hideLists() {
  taskList.hide();
}

function removeHash() {
  window.history.pushState('', document.title, window.location.pathname + window.location.search);
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

function updateWallpaperPreview() {
  chrome.storage.local.get('bg', (result) => {
    const imgElement = $('.settings-wallpaper-preview img');
    if (result.bg !== '' && result.bg !== undefined) {
      imgElement.attr('src', result.bg);
    } else {
      imgElement.attr('src', '../images/comic_bg.png');
    }
  });
}

function constrainStringLength(inputString, length) {
  return inputString.length > length ? `${inputString.substring(0, length)}...` : inputString;
}

function overwriteTasks(tasks) {
  const currentDate = new Date();
  const tasksArray = Object.values(tasks);
  const filteredTasks = tasksArray.filter((task) => (task.scheduledDeletion === '') || (task.scheduledDeletion !== '' && new Date(task.scheduledDeletion) > currentDate));
  const newTasks = {};
  filteredTasks.forEach((task) => {
    newTasks[task.id] = task;
  });
  tasks = newTasks;
  chrome.storage.local.set({ tasks }, () => {
    chrome.alarms.clearAll();
    $.each(filteredTasks, (key, task) => {
      if (task.recentlyDeleted) {
        const alarmName = `${task.id}_deletion_alarm`;
        const deletionDate = new Date(task.scheduledDeletion);
        chrome.alarms.create(alarmName, { when: deletionDate.getTime() });
      } else {
        const taskDue = new Date(task.due);
        if (taskDue > currentDate) {
          chrome.alarms.create(task.id, { when: taskDue.getTime() });
        }
      }
    });
  });
}

function restoreTags(tagsObj) {
  chrome.storage.local.set({ tags: tagsObj }, () => {
  });
}

function retrieveSitesList() {
  chrome.storage.local.get(['allowedSites'], (result) => {
    const storedSiteList = result.allowedSites;
    const sitesList = storedSiteList || [];
    if (sitesList.length > 0) {
      $('#sites-list').empty();
      Object.values(sitesList).forEach((expr) => {
        $('#sites-list').append(`
          <div class="row sites-item align-items-center mt-2"> 
              <div class="col-8">${expr}</div>
              <div class="col-4 d-flex justify-content-end">
                  <button class="btn btn-danger sites-del" rule-to-del="${expr}" data-bs-toggle="modal" data-bs-target="#deleteRuleModal">
                    Delete
                  </button>
              </div>
          </div>
        `);
      });
    }
  });
}

function retrieveStringMatchesList() {
  chrome.storage.local.get(['allowedStringMatches'], (result) => {
    const storedMatchesList = result.allowedStringMatches;
    const matchesList = storedMatchesList || [];
    if (matchesList.length > 0) {
      $('#string-matches-list').empty();
      Object.values(matchesList).forEach((expr) => {
        $('#string-matches-list').append(`
          <div class="row urls-item align-items-center mt-2"> 
              <div class="col-8">${expr}</div>
              <div class="col-4 d-flex justify-content-end">
                  <button class="btn btn-danger string-matches-del" rule-to-del="${expr}" data-bs-toggle="modal" data-bs-target="#deleteRuleModal">
                    Delete
                  </button>
              </div>
          </div>
        `);
      });
    }
  });
}

function retrieveUrlsList() {
  chrome.storage.local.get(['allowedURLs'], (result) => {
    const storedUrlsList = result.allowedURLs;
    const urlsList = storedUrlsList || [];
    if (urlsList.length > 0) {
      $('#urls-list').empty();
      Object.values(urlsList).forEach((expr) => {
        $('#urls-list').append(`
          <div class="row urls-item align-items-center mt-2"> 
              <div class="col-8">${expr}</div>
              <div class="col-4 d-flex justify-content-end">
                  <button class="btn btn-danger urls-del" rule-to-del="${expr}" data-bs-toggle="modal" data-bs-target="#deleteRuleModal">
                    Delete
                  </button>
              </div>
          </div>
        `);
      });
    }
  });
}

function retrieveRegexList() {
  chrome.storage.local.get(['allowedRegex'], (result) => {
    const storedRegexList = result.allowedRegex;
    const regexList = storedRegexList || [];
    if (regexList.length > 0) {
      $('#regex-list').empty();
      Object.values(regexList).forEach((expr) => {
        $('#regex-list').append(`
          <div class="row regex-item align-items-center mt-2"> 
              <div class="col-8">${expr}</div>
              <div class="col-4 d-flex justify-content-end">
                  <button class="btn btn-danger regex-del" rule-to-del="${expr}" data-bs-toggle="modal" data-bs-target="#deleteRuleModal">
                    Delete
                  </button>
              </div>
          </div>
        `);
      });
    }
  });
}

function deleteRule(ruleLoc, rule) {
  chrome.storage.local.get([ruleLoc], (result) => {
    const storedList = result[ruleLoc];
    if (storedList) {
      const updatedList = storedList.filter((expr) => expr !== rule);
      chrome.storage.local.set({ [ruleLoc]: updatedList }, () => {
        switch (ruleLoc) {
          case 'allowedSites':
            retrieveSitesList();
            break;
          case 'allowedURLs':
            retrieveUrlsList();
            break;
          case 'allowedRegex':
            retrieveRegexList();
            break;
          default:
            break;
        }
      });
    }
  });
}

function showNotes(notes) {
  const selectiveList = $('#notes-selection-list');
  selectiveList.empty();

  $.each(notes, (key, value) => {
    const title = `Title: ${value.title}`;
    const constrainedContent = constrainStringLength(value.content, maxStringLength);
    const content = `Content: ${constrainedContent}`;
    selectiveList.append(`
      <div class="row zero-margin zero-padding align-items-center mb-2">
        <input class="d-block backup-checkbox" forNoteId="${key}" type="checkbox"> ${title} <br> ${content}
      </div>
    `);
  });
  curNotes = notes;
}

function showTasks(tasks) {
  const selectiveList = $('#tasks-selection-list');
  selectiveList.empty();

  $.each(tasks, (key, value) => {
    const title = `Title: ${value.title}`;
    const desc = `Description: ${value.description}`;
    const dueDate = new Date(value.due);
    const parts = dueDate.toLocaleString().split(',');
    const due = `Due: ${parts[0]}, at${parts[1]}`;
    selectiveList.append(`
      <div class="row zero-margin zero-padding align-items-center mb-2">
        <input class="d-block backup-checkbox" forTask="${key}" type="checkbox"> ${title} <br> ${desc} <br> ${due}
      </div>
    `);
  });
  curTasks = tasks;
}

function showIndexEntries(indexEntries) {
  const selectiveList = $('#index-selection-list');
  selectiveList.empty();

  $.each(indexEntries[0], (key) => {
    selectiveList.append(`
      <div class="row zero-margin zero-padding align-items-center mb-2">
        <input class="d-block backup-checkbox" forIndexEntryId="${key}" type="checkbox"> ${indexEntries[1][key]} <br>
      </div>
    `);
  });
  curIndexEntries = indexEntries;
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

function restoreSelectedTasks() {
  if (curTasks) {
    const toRestore = [];
    const selectiveList = $('#tasks-selection-list');
    selectiveList.find('.backup-checkbox').each(function _() {
      const elt = $(this);
      if (elt.is(':checked')) {
        const key = elt.attr('forTask');
        toRestore.push({ ...curTasks[key] });
      }
    });
    overwriteTasks(toRestore);
  }
}

function restoreSelectedNotes() {
  if (curNotes) {
    const toRestore = [];
    const selectiveList = $('#notes-selection-list');
    selectiveList.find('.backup-checkbox').each(function _() {
      const elt = $(this);
      if (elt.is(':checked')) {
        const key = elt.attr('forNoteId');
        toRestore.push({ ...curNotes[key] });
      }
    });
    overwriteNotes(toRestore);
  }
}

function restoreSelectedIndexEntries() {
  if (curIndexEntries) {
    const toRestore = [[], []];
    const selectiveList = $('#index-selection-list');
    selectiveList.find('.backup-checkbox').each(function _() {
      const elt = $(this);
      if (elt.is(':checked')) {
        const key = elt.attr('forIndexEntryId');
        toRestore[0].push({ ...curIndexEntries[0][key] });
        toRestore[1].push(curIndexEntries[1][key]);
      }
    });
    overwriteIndex(toRestore);
  }
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    hideLists();
    retrieveSitesList();
    retrieveUrlsList();
    retrieveStringMatchesList();
    retrieveRegexList();
    updateWallpaperPreview();
    $('#rule-search').on('input', function _() {
      const query = $(this).val();
      $('#urls-list, #sites-list, #string-matches-list, #regex-list').filter(function filterLists() {
        const ruleText = $(this).text();
        const found = ruleText.indexOf(query) > -1;
        $(this).toggle(found);
        return found;
      });
    });

    $('#selection-search').on('input', function _() {
      const query = $(this).val();
      $('#notes-selection-list, #tasks-selection-list, #index-selection-list').find('.row').each((idx, obj) => {
        const checkbox = $(obj);
        const resultText = checkbox.text();
        const found = resultText.indexOf(query) > -1;
        checkbox.toggle(found);
      });
    });

    $(document).on('click', '.sites-del', (event) => {
      const $delBtn = $(event.currentTarget);
      $('#deleteRuleModal').attr('rule-loc', 'allowedSites');
      $('#deleteRuleModal').attr('rule-to-delete', $delBtn.attr('rule-to-del'));
    });

    $(document).on('click', '#sites-tab', () => {
      $('.index-heading').text('Allowed sites');
      $('.index-info').text('Indexing will occur whenever these host names are visited.');
      $('#addRuleModal').attr('rule-loc', 'allowedSites');
    });

    $(document).on('click', '.urls-del', (event) => {
      const $delBtn = $(event.currentTarget);
      $('#deleteRuleModal').attr('rule-loc', 'allowedURLs');
      $('#deleteRuleModal').attr('rule-to-delete', $delBtn.attr('rule-to-del'));
    });

    $(document).on('click', '#urls-tab', () => {
      $('.index-heading').text('Allowed URLs');
      $('.index-info').text('Indexing will occur whenever these specific URLs are visited.');
      $('#addRuleModal').attr('rule-loc', 'allowedURLs');
    });

    $(document).on('click', '.string-matches-del', (event) => {
      const $delBtn = $(event.currentTarget);
      $('#deleteRuleModal').attr('rule-loc', 'allowedRegex');
      $('#deleteRuleModal').attr('rule-to-delete', $delBtn.attr('rule-to-del'));
    });

    $(document).on('click', '.regex-del', (event) => {
      const $delBtn = $(event.currentTarget);
      $('#deleteRuleModal').attr('rule-loc', 'allowedRegex');
      $('#deleteRuleModal').attr('rule-to-delete', $delBtn.attr('rule-to-del'));
    });

    $(document).on('click', '.sites-delete-btn', () => {
      deleteRule($('#deleteRuleModal').attr('rule-loc'), $('#deleteRuleModal').attr('rule-to-delete'));
    });

    $(document).on('click', '.urls-delete-btn', () => {
      deleteRule($('#deleteRuleModal').attr('rule-loc'), $('#deleteRuleModal').attr('rule-to-delete'));
    });

    $(document).on('click', '.string-matches-delete-btn', () => {
      deleteRule($('#deleteRuleModal').attr('rule-loc'), $('#deleteRuleModal').attr('rule-to-delete'));
    });

    $(document).on('click', '.regex-delete-btn', () => {
      deleteRule($('#deleteRuleModal').attr('rule-loc'), $('#deleteRuleModal').attr('rule-to-delete'));
    });

    $(document).on('click', '#confirm-erase-data-btn', () => {
      chrome.storage.local.clear();
      chrome.alarms.clearAll();
      chrome.storage.local.set({ allowedSites: [] }, () => {
      });

      chrome.storage.local.set({ allowedURLs: [] }, () => {
      });

      chrome.storage.local.set({ allowedStringMatches: [] }, () => {
      });

      chrome.storage.local.set({ allowedRegex: defaultRegexList }, () => {
        window.location.reload();
      });
    });

    $(document).on('click', '#string-matches-tab', () => {
      $('.index-heading').text('Allowed string matches');
      $('.index-info').text('Indexing will occur whenever the URL contains any one of these strings.');
      $('#addRuleModal').attr('rule-loc', 'allowedStringMatches');
    });

    $(document).on('click', '#regex-tab', () => {
      $('.index-heading').text('Allowed RegEx');
      $('.index-info').text('Indexing will occur whenever the visited URL matches any one of these regular expressions.');
      $('#addRuleModal').attr('rule-loc', 'allowedRegex');
    });

    $(document).on('click', '.add-rule-btn', () => {
      $('#addRuleInput').val('');
    });

    $('#addRuleForm').on('submit', (event) => {
      event.preventDefault();
      const ruleLoc = $('#addRuleModal').attr('rule-loc');
      const rule = $('#addRuleInput').val();

      chrome.storage.local.get({ [ruleLoc]: [] }, (result) => {
        const existingRules = result[ruleLoc] || [];

        if (existingRules.includes(rule)) {
          $('#ruleErrorModal').modal('show');
        } else {
          existingRules.push(rule);
          chrome.storage.local.set({ [ruleLoc]: existingRules }, () => {
            switch (ruleLoc) {
              case 'allowedSites':
                retrieveSitesList();
                break;
              case 'allowedURLs':
                retrieveUrlsList();
                break;
              case 'allowedRegex':
                retrieveRegexList();
                break;
              case 'allowedStringMatches':
                retrieveStringMatchesList();
                break;
              default:
                break;
            }
          });
        }
      });
    });

    $(document).on('click', '.btn.btn-primary.backup-btn', (event) => {
      const $backupBtn = $(event.currentTarget);
      exportAll();
      $backupBtn.text('Downloaded data backup');
      setTimeout(() => {
        $backupBtn.text('Export extension data to JSON file');
      }, 1000);
    });

    $(document).on('click', '.btn.btn-primary.restore-selection-btn', (event) => {
      const $restoreBtn = $(event.currentTarget);
      if (curTags !== null) {
        restoreTags(curTags);
      }
      restoreSelectedNotes();
      restoreSelectedTasks();
      restoreSelectedIndexEntries();
      $restoreBtn.text('Restored selected data!');
      setTimeout(() => {
        $restoreBtn.text('Perform overwriting restore of selected data');
      }, 1000);
    });

    $(document).on('click', '.btn.btn-primary.background-reset-btn', () => {
      chrome.storage.local.set({ bg: '' }, () => {
        updateWallpaperPreview();
      });
    });

    $(document).on('change', '#backgroundInput', (event) => {
      const selectedFile = event.target.files[0];
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          chrome.storage.local.set({ bg: e.target.result }, () => {
            updateWallpaperPreview();
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
      const $entry = $(window.location.hash.slice(0, -1));
      removeHash();
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
          if (Object.prototype.hasOwnProperty.call(content, 'tags')) {
            restoreTags(content.tags);
          }
          if (Object.prototype.hasOwnProperty.call(content, 'tasks')) {
            const { tasks } = content;
            overwriteTasks(tasks);
          }
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

    $(document).on('change', '#jsonSelectiveInput', (event) => {
      const selectedFile = event.target.files[0];

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = JSON.parse(e.target.result);

          if (Object.prototype.hasOwnProperty.call(content, 'tags')) {
            curTags = content.tags;
          }

          if (Object.prototype.hasOwnProperty.call(content, 'tasks')) {
            const tasksArray = Object.values(content.tasks);
            showTasks(tasksArray);
          }

          if (Object.prototype.hasOwnProperty.call(content, 'notes')) {
            const notesArray = Object.values(content.notes);
            showNotes(notesArray);
          }

          if (Object.prototype.hasOwnProperty.call(content, 'indexed')) {
            const indexArray = Object.values(content.indexed);
            showIndexEntries(indexArray);
          }

          $('#backup-select-col').removeClass('d-none');
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
