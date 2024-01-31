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

function overwriteIndex(indexArray) {
  chrome.storage.local.get(['indexed'], () => {
    const newIndexed = {
      corpus: indexArray[0],
      links: indexArray[1],
    };
    chrome.storage.local.set({ indexed: newIndexed });
  });
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    $(document).on('click', '.btn.btn-primary.backup-btn', (event) => {
      const $backupBtn = $(event.currentTarget);
      exportAll();
      $backupBtn.text('Downloaded data backup');
      setTimeout(() => {
        $backupBtn.text('Export extension data to backup (JSON)');
      }, 1000);
    });

    $(document).on('change', '#jsonInput', (event) => {
      const selectedFile = event.target.files[0];

      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = JSON.parse(e.target.result);

          // Check if 'tasks' property exists
          if (Object.prototype.hasOwnProperty.call(content, 'tasks')) {
            const tasksArray = Object.values(content.tasks);
            overwriteTasks(tasksArray);
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

          // Check if 'indexed' property exists
          if (Object.prototype.hasOwnProperty.call(content, 'indexed')) {
            const indexArray = Object.values(content.indexed);
            overwriteIndex(indexArray);
          }
        };
        reader.readAsText(selectedFile);
      }
    });
  });
}
