if (window.location.href.startsWith(chrome.runtime.getURL(''))) {
    $(document).ready(function () {
        const editorElement = $("#editor");

        if (editorElement.length > 0) {
            //Editor
            const simplemde = new SimpleMDE({
                element: editorElement[0],
                spellChecker: false,
                previewRender: function (plainText) {
                    return marked.parse(plainText);
                },
            });
        }
    });
}
