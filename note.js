// Check if the document is ready
$(function () {
    let currentNote = null;
    const editorElement = $("#editor");
    const titleElement = $("#title");
    const showNote = $("#show-note");
    const save = $("#save");
    const noteForm = $("#note-form");
    const addNoteButton = $("#add-note-button");
    const deleteButton = $("#delete");
    const addNote = $("#add-note");
    showNote.hide();
    save.hide();
    deleteButton.hide();

    // function loadNoteInEditor(note, editor) {
    //     titleElement.val(note.title);
    //     editor.value(note.content);
    // }

    function loadExistingNotes() {
        chrome.storage.sync.get({ notes: [] }, function (data) {
            const existingNotes = data.notes;
            updateNotesList(existingNotes);
        });
    }

    function updateNotesList(notes) {
        const notesListElement = $("#notes-list");
        notesListElement.empty();

        if (notes.length === 0) {
            notesListElement.append("<p>No notes yet</p>");
        } else {
            notes.forEach(function (note) {
                const noteItem = $("<div>").addClass("note-item");
                
                // Create image element and append it to noteItem
                const noteItemImage = $("<img>").attr("src", "images/arrowIconButton.png").addClass("note-item-icon");
                noteItem.append(noteItemImage);
    
                // Create span element for the title and append it to noteItem
                const noteItemTitle = $("<span>").addClass("note-item-title").text(note.title);
                noteItem.prepend(noteItemTitle);
    
                noteItem.click(function () {
                    currentNote = note;
                    viewNote(note);
                });
    
                notesListElement.append(noteItem);
            });
        }
    }

    function viewNote(note){
        const noteTitle = document.getElementById("titleDisplay");
        const noteContent = document.getElementById("contentDisplay");

        noteTitle.innerHTML = '<h1>'+ note.title + '</h1>';
        noteContent.innerHTML = marked.parse(note.content);
        noteForm.hide();
        showNote.show();
        deleteButton.show();
    }



    if (editorElement.length > 0) {
        const simplemde = new SimpleMDE({
            element: editorElement[0],
            spellChecker: false,
            previewRender: function (plainText) {
                return marked.parse(plainText);
            },
        });

        loadExistingNotes();

        addNoteButton.on("click",function () {
            const title = titleElement.val();
            const content = simplemde.value();

            if (title.trim() === '' || content.trim() === '') {
                alert('Both title and content must be filled out.');
            } else {
                const noteId = Date.now().toString();

                const note = {
                    id: noteId,
                    title: title,
                    content: content,
                };

                currentNote = note;

                chrome.storage.sync.get({ notes: [] }, function (data) {
                    const existingNotes = data.notes;

                    existingNotes.push(note);

                    chrome.storage.sync.set({ notes: existingNotes }, function () {
                        titleElement.val("");
                        simplemde.value("");

                        updateNotesList(existingNotes);
                        viewNote(note);
                    });
                });
            }
        });

        addNote.on("click",function (){
            noteForm.show();
            showNote.hide();
            save.hide();
            addNoteButton.show();
            simplemde.value("");
            titleElement.val("");
            deleteButton.hide();
        });

        $("#edit").on("click",function (){
            noteForm.show();
            showNote.hide();
            save.show();
            addNoteButton.hide();
            if (currentNote){
                titleElement.val(currentNote.title);
                simplemde.value(currentNote.content);
            }
        });

        $("#confirmDelete").on("click",function () {
            if (currentNote) {
                chrome.storage.sync.get({ notes: [] }, function (data) {
                    const existingNotes = data.notes;
                    const updatedNotes = existingNotes.filter(note => note.id !== currentNote.id);

                    chrome.storage.sync.set({ notes: updatedNotes, currentNote: null }, function () {
                        const currentIndex = existingNotes.findIndex(note => note.id === currentNote.id);

                        if (currentIndex !== -1 && updatedNotes.length > 0) {
                            const nextIndex = currentIndex < updatedNotes.length ? currentIndex : 0;
                            const nextNote = updatedNotes[nextIndex];

                            currentNote = nextNote;
                            viewNote(nextNote);
                        } else {
                            currentNote = null;
                            addNote.trigger("click");
                        }
                        loadExistingNotes();
                    });
                });
            }
        });


        save.on("click",function (){
            if (currentNote){
                currentNote.title = titleElement.val();
                currentNote.content = simplemde.value();
                chrome.storage.sync.get({ notes: [] }, function (data) {
                    const existingNotes = data.notes;
                    const index = existingNotes.findIndex(note => note.id === currentNote.id);
                    if (index !== -1) {
                        existingNotes[index] = currentNote;
                        chrome.storage.sync.set({ notes: existingNotes }, function () {
                            viewNote(currentNote);
                            loadExistingNotes();
                        });
                    }
                });
            }
        });
    }
});





