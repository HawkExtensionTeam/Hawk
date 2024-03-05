// Check if the document is ready
$(() => {
  let currentNote = null;
  const editorElement = $('#editor');
  const titleElement = $('#title');
  const showNote = $('#show-note');
  const save = $('#save');
  const noteForm = $('#note-form');
  const addNoteButton = $('#add-note-button');
  const deleteButton = $('#delete');
  const addNote = $('#add-note');
  const simplemde = new SimpleMDE({
    element: editorElement[0],
    spellChecker: false,
    previewRender(plainText) {
      return marked.parse(plainText);
    },
  });
  showNote.hide();
  save.hide();
  deleteButton.hide();

  function loadCustomBackground() {
    chrome.storage.local.get('bg', (result) => {
      if (result.bg !== '' && result.bg !== undefined) {
        $('body').css('background-image', `url(${result.bg})`);
      } else {
        $('body').css('background-image', 'url(\'../images/comic_bg.png');
      }
    });
  }

  loadCustomBackground();

  chrome.runtime.onMessage.addListener(
    (request) => {
      if (request === 'wallpaper') {
        loadCustomBackground();
      }
    },
  );

  function viewNote(note) {
    const noteTitle = document.getElementById('titleDisplay');
    const noteContent = document.getElementById('contentDisplay');

    noteTitle.innerHTML = `<h1>${note.title}</h1>`;
    noteContent.innerHTML = marked.parse(note.content);
    noteForm.hide();
    showNote.show();
    deleteButton.show();
  }

  function updateNotesList(notes) {
    const notesListElement = $('#notes-list');
    notesListElement.empty();

    if (notes.length === 0) {
      notesListElement.append(`
      <div class="row justify-contents-center overflow-hidden text-center zero-margin">
          <div class="overflow-hidden warn-text-3">
              No notes yet.
          </div>
      </div>
    `);
    } else {
      Object.values(notes).forEach((note) => {
        const noteItem = $('<div>').addClass('note-item').data('content', note.content.toLowerCase());

        // Create image element and append it to noteItem
        const noteItemImage = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#C45500" class="bi bi-chevron-right" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"/>
        </svg>`;
        noteItem.append(noteItemImage);

        // Create span element for the title and append it to noteItem
        const noteItemTitle = $('<span>').addClass('note-item-title').text(note.title);
        noteItem.prepend(noteItemTitle);

        noteItem.click(() => {
          currentNote = note;
          viewNote(note);
        });

        notesListElement.append(noteItem);
      });
      [currentNote] = notes;
      viewNote(notes[0]);
    }
  }

  function loadExistingNotes() {
    chrome.storage.local.get({ notes: [] }, (data) => {
      const existingNotes = data.notes;
      updateNotesList(existingNotes);
    });
  }

  function addNewNote(title, content) {
    const noteId = Date.now().toString();

    const note = {
      id: noteId,
      title,
      content,
    };

    currentNote = note;

    chrome.storage.local.get({ notes: [] }, (data) => {
      const existingNotes = data.notes;

      existingNotes.push(note);

      chrome.storage.local.set({ notes: existingNotes }, () => {
        titleElement.val('');
        simplemde.value('');

        updateNotesList(existingNotes);
        viewNote(note);
      });
    });
  }

  $(document).on('change', '#jsonMdInput', (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileName = selectedFile.name;
        addNewNote(fileName.substr(0, fileName.lastIndexOf('.')), e.target.result);
      };
      reader.readAsText(selectedFile);
    }
  });

  $('#search').on('input', function handleInput() {
    const searchValue = $(this).val().toLowerCase();
    $('#notes-list .note-item').filter(function filterNotes() {
      const noteText = $(this).text().toLowerCase();
      const noteContent = $(this).data('content');
      const isMatch = noteText.indexOf(searchValue) > -1 || noteContent.indexOf(searchValue) > -1;
      $(this).toggle(isMatch);
      return isMatch;
    });
  });

  addNoteButton.on('click', () => {
    const title = titleElement.val();
    const content = simplemde.value();

    if (title.trim() === '' || content.trim() === '') {
      alert('Both title and content must be filled out.');
    } else {
      addNewNote(title, content);
    }
  });

  addNote.on('click', () => {
    noteForm.show();
    showNote.hide();
    save.hide();
    addNoteButton.show();
    simplemde.value('');
    titleElement.val('');
    deleteButton.hide();
  });

  $('#edit').on('click', () => {
    noteForm.show();
    showNote.hide();
    save.show();
    addNoteButton.hide();
    if (currentNote) {
      titleElement.val(currentNote.title);
      simplemde.value(currentNote.content);
    }
  });

  $('#confirmDelete').on('click', () => {
    if (currentNote) {
      chrome.storage.local.get({ notes: [] }, (data) => {
        const existingNotes = data.notes;
        const updatedNotes = existingNotes.filter((note) => note.id !== currentNote.id);

        chrome.storage.local.set({ notes: updatedNotes, currentNote: null }, () => {
          const currentIndex = existingNotes.findIndex((note) => note.id === currentNote.id);

          if (currentIndex !== -1 && updatedNotes.length > 0) {
            const nextIndex = currentIndex < updatedNotes.length ? currentIndex : 0;
            const nextNote = updatedNotes[nextIndex];

            currentNote = nextNote;
            viewNote(nextNote);
          } else {
            currentNote = null;
            addNote.trigger('click');
          }
          loadExistingNotes();
        });
      });
    }
  });

  save.on('click', () => {
    if (currentNote) {
      currentNote.title = titleElement.val();
      currentNote.content = simplemde.value();
      chrome.storage.local.get({ notes: [] }, (data) => {
        const existingNotes = data.notes;
        const index = existingNotes.findIndex((note) => note.id === currentNote.id);
        if (index !== -1) {
          existingNotes[index] = currentNote;
          chrome.storage.local.set({ notes: existingNotes }, () => {
            viewNote(currentNote);
            loadExistingNotes();
          });
        }
      });
    }
  });

  if (editorElement.length > 0) {
    loadExistingNotes();
  }
});
