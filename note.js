// Check if the document is ready
$(document).ready(function () {
    const editorElement = $("#editor");
    const titleElement = $("#title");

    if (editorElement.length > 0) {
        const simplemde = new SimpleMDE({
            element: editorElement[0],
            spellChecker: false,
            previewRender: function (plainText) {
                return marked.parse(plainText);
            },
        });

        loadExistingNotes(simplemde);

        $("button").click(function () {
            const title = titleElement.val();
            const content = simplemde.value();

            if (title && content) {
                const noteId = Date.now().toString();

                const note = {
                    id: noteId,
                    title: title,
                    content: content,
                };

                const existingNotes = JSON.parse(localStorage.getItem("notes")) || [];

                existingNotes.push(note);

                localStorage.setItem("notes", JSON.stringify(existingNotes));

                titleElement.val("");
                simplemde.value("");

                updateNotesList(existingNotes, simplemde);
            }
        });
    }
});

function loadExistingNotes(editor) {
    const existingNotes = JSON.parse(localStorage.getItem("notes")) || [];

    updateNotesList(existingNotes, editor);
}

function updateNotesList(notes, editor) {
    const notesListElement = $("#notes-list");
    notesListElement.empty();

    if (notes.length === 0) {
        notesListElement.append("<p>No notes yet</p>");
    } else {
        notes.forEach(function (note) {
            const noteItem = $("<div>").addClass("note-item").text(note.title);

            noteItem.click(function () {
                loadNoteInEditor(note, editor);
            });

            notesListElement.append(noteItem);
        });
    }
}

function loadNoteInEditor(note, editor) {
    const titleElement = $("#title");

    titleElement.val(note.title);
    console.log(note.content);
    editor.value(note.content);
}
