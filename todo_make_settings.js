function exportAll() {
	chrome.storage.local.get(null, function(data) {
		const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
		const downloadLink = document.createElement('a');
		downloadLink.href = URL.createObjectURL(blob);
		downloadLink.download = 'todomake_backup_data.json';
		downloadLink.click();
	});
}

if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
  $(() => {
    $(document).on('click', '.btn.btn-primary.backup-btn', (event) => {
			exportAll();
    });
  });
}
