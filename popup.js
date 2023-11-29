if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
    $(document).ready(function () {
        $("#new-tab-button").click(function () {
            chrome.tabs.create({url: "new_tab.html"});
        });
        chrome.storage.local.get({ 'tasks': [] }, function(result) {
            // avoid pushing to undefined if there are no previous tasks
            const existingTasks = result.tasks || [];
            if (Object.keys(existingTasks).length === 0) {
                $("#checklist").append('<h1>There are no tasks!</h1>');
            }
            else {
                let taskCounter = 0;

                for (const taskId in existingTasks) {
                    const task = existingTasks[taskId];
                    const dueDate = new Date(task.due);
                    const formattedDueDate = dueDate.toLocaleString();
                
                    $("#checklist").append(
                        '<li class="list-group-item"> <div class="form-check">' +
                        '<input type="checkbox" class="form-check-input" id="item' + task.id + '">' +
                        ' <div class="container">' + '<div class="row"> <label class="form-check-label" for="item' + task.id + '">' + task.title + '</label>' +
                        '<label class="form-check-label" for="item' + task.id + '">' + formattedDueDate + '</label>' + '</div> </div>' + '</div>' + '</li>'
                    );
                
                    taskCounter++;
                
                    if (taskCounter === 3) {
                        break;
                    }
                };
            }
        });
    });
};
