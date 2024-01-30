function exportAll() {
	chrome.storage.local.get(null, function(data) {
		const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
		const downloadLink = document.createElement('a');
		downloadLink.href = URL.createObjectURL(blob);
		downloadLink.download = 'todomake_backup_data.json';
		downloadLink.click();
	});
}

function overwriteTasks(tasks) {
    chrome.storage.local.set({ 'tasks': tasks }, function() {
        console.log('Tasks have been set in chrome.storage.local:', tasks);
    });
}

function displayFileName(input) {
	let fileName = input.files[0].name;
	alert('Selected JSON file: ' + fileName);
  }

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    $(document).on('click', '.btn.btn-primary.backup-btn', (event) => {
				const $backupBtn = $(event.currentTarget);
				exportAll();
				$backupBtn.text("Downloaded data backup");
				setTimeout(function() {
					$backupBtn.text("Export extension data to backup (JSON)");
				}, 1000);
    });
	$(document).on('change', '#jsonInput', (event) => {
		const selectedFile = event.target.files[0];
		
		if (selectedFile) {
			const reader = new FileReader();
			reader.onload = function(e) {
				const content = JSON.parse(e.target.result);
				
				// Check if 'tasks' property exists
				if (content.hasOwnProperty('tasks')) {
					const tasksObject = content.tasks;
					console.log('Tasks Object:', tasksObject);

					const tasksArray = Object.values(tasksObject);

					overwriteTasks(tasksArray);
				} else {
					console.log('No tasks property found in the JSON file.');
				}
			};
			reader.readAsText(selectedFile);
		}
	});
});
}
