$(document).ready(function() {
    chrome.storage.local.get({ 'tasks': [] }, function(result) {
        // avoid pushing to undefined if there are no previous tasks
        const existingTasks = result.tasks || [];
        var i;
        if (existingTasks.length == 0) {
            $("#checklist").append('<h1>There are no tasks!</h1>');
        }
        else {
            for (i = 0; i < existingTasks.length; i++) {
                console.log(existingTasks[i]);
                $("#checklist").append('<li class="list-group-item"> <div class="form-check">' +
                    '<input type="checkbox" class="form-check-input" id="item1">' +
                    '<label class="form-check-label" for="item1">' + existingTasks[i] + '</label>' +
                    '</div>' +
                    '</li>');
                }
        };
    })
});
