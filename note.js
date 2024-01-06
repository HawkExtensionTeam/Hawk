// Check if the document is ready
$(document).ready(function () {
    let currentNote = null;
    const editorElement = $("#editor");
    const titleElement = $("#title");
    $("#show-note").hide();
    $("#save").hide();


    function loadExistingNotes(editor) {
        chrome.storage.sync.get({ notes: [] }, function (data) {
            const existingNotes = data.notes;
            updateNotesList(existingNotes, editor);
        });
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
                    currentNote = note;
                    // loadNoteInEditor(note, editor);
                    $("#note-form").hide();
                    viewNote(note);
                    $('#show-note').show();
                });

                notesListElement.append(noteItem);
            });
        }
    }


    $('#add-note').click(function (){
        $("#note-form").show();
        $("#show-note").hide();
        $("#save").hide();
        $("#add-note-button").show();
    });

    if (editorElement.length > 0) {
        const simplemde = new SimpleMDE({
            element: editorElement[0],
            spellChecker: false,
            previewRender: function (plainText) {
                return marked.parse(plainText);
            },
        });

        loadExistingNotes(simplemde);

        $("#add-note-button").click(function () {
            const title = titleElement.val();
            const content = simplemde.value();

            if (title && content) {
                const noteId = Date.now().toString();

                const note = {
                    id: noteId,
                    title: title,
                    content: content,
                };

                chrome.storage.sync.get({ notes: [] }, function (data) {
                    const existingNotes = data.notes;

                    existingNotes.push(note);

                    chrome.storage.sync.set({ notes: existingNotes }, function () {
                        titleElement.val("");
                        simplemde.value("");

                        updateNotesList(existingNotes, simplemde);
                    });
                });
            }
        });

        $("#edit").click(function (){
            $("#note-form").show();
            $('#show-note').hide();
            $("#save").show();
            $("#add-note-button").hide();
            if (currentNote){
                titleElement.val(currentNote.title);
                simplemde.value(currentNote.content);
            }
        })

    }
});


function loadNoteInEditor(note, editor) {
    const titleElement = $("#title");

    titleElement.val(note.title);
    editor.value(note.content);
}

function viewNote(note){
    const noteTitle = document.getElementById("titleDisplay");
    const noteContent = document.getElementById("contentDisplay");

    noteTitle.innerHTML = '<h1>'+ note.title + '</h1>';
    noteContent.innerHTML = marked.parse(note.content);
}
