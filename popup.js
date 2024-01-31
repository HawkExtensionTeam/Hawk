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
      if (Object.keys(existingTasks).length === 0) {
        $('#checklist').append('<h1>There are no tasks!</h1>');
      } else {
        Object.keys(existingTasks).forEach((taskId) => {
          const task = existingTasks[taskId];
          const dueDate = new Date(task.due);
          const formattedDueDate = dueDate.toLocaleString();
          const now = new Date();
          const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          if (dueDate < twentyFourHoursAgo) {
            delete existingTasks[taskId];
          } else {
            $('#checklist').append(
              `<li class="list-group-item">
                <div class="form-check">
                  <input type="checkbox" class="form-check-input" id="item${task.id}">
                  <div class="container">
                    <div class="row">
                      <label class="form-check-label" for="item${task.id}">${task.title}</label>
                      <label class="form-check-label" for="item${task.id}">${formattedDueDate}</label>
                    </div>
                  </div>
                </div>
              </li>`,
            );
          }
        });

        chrome.storage.local.set({ tasks: existingTasks });
      }
    });
  });
}
