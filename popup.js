function allDeleted(allTasks) {
  let allRecentlyDeleted = true;
  if (Array.isArray(allTasks)) {
    allTasks.forEach((task) => {
      if (!task.recentlyDeleted) {
        allRecentlyDeleted = false;
      }
    });
  }
  return allRecentlyDeleted;
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    $('#new-tab-button').on('click', () => {
      chrome.tabs.create({ url: 'new_tab.html' });
    });

    $('#manage-settings-container').on('click', () => {
      chrome.tabs.create({ url: 'settings.html' });
    });

    $('#notebook').on('click', () => {
      chrome.tabs.create({ url: 'add_note.html' });
    });
    chrome.storage.local.get({ tasks: [] }, (result) => {
      // avoid pushing to undefined if there are no previous tasks
      const existingTasks = result.tasks || [];
      if (Object.keys(existingTasks).length === 0 || allDeleted(existingTasks)) {
        $('#checklist').append(`
        <div class="row justify-content-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" class="warn bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
            </svg>
        </div>
        <div class="row justify-contents-center text-center">
            <div class="warn-text">
                No tasks yet.
            </div>
        </div>
      `);
      } else {
        Object.keys(existingTasks).forEach((taskId) => {
          const task = existingTasks[taskId];
          if (!task.recentlyDeleted) {
            const dueDate = new Date(task.due);
            const formattedDueDate = dueDate.toLocaleString();
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            if (dueDate < twentyFourHoursAgo) {
              setTaskDeleted(existingTasks, existingTasks[taskId]);
            } else {
              const passed = dueDate < new Date();
              const label = `form-check-label${passed ? ' text-danger' : ''}`;
              $('#checklist').append(
                `<li class="list-group-item">
                <div class="form-check">
                  <input type="checkbox" class="form-check-input" id="item${task.id}">
                  <div class="container">
                    <div class="row">
                      <label class="${label}" for="item${task.id}">${task.title}</label>
                      <label class="${label}" for="item${task.id}">${formattedDueDate}</label>
                    </div>
                  </div>
                </div>
              </li>`,
              );
            }
          }
        });

        chrome.storage.local.set({ tasks: existingTasks });
      }
    });
  });
}
