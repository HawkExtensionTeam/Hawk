const puppeteer = require('puppeteer');
const EXTENSION_PATH = process.cwd(); // Ensure this is the correct path to your extension's directory
const EXTENSION_ID = "bgkcihabjocipmiplkjhckjclmkdmpna"; // Your known extension ID
let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  page = await browser.newPage();
});

afterAll(async () => {
  await browser.close();
});

test('Adding A New Note To The Extension And Verifying That Its Been Added', async () => {
  const url = `chrome-extension://${EXTENSION_ID}/add_note.html`;
  await page.goto(url);

  await page.waitForSelector('#title');
  await page.type('#title', 'Test Note Title');
  
  await page.waitForSelector('.CodeMirror');
  await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue('This is a test note content');
  });


  await page.click('#add-note-button');

  await page.waitForFunction(
    () => document.querySelectorAll('.note-item').length,
    { polling: 'mutation' } // Use mutation polling to wait for DOM changes
  );

  const notesCountAfter = await page.evaluate(() => {
    return new Promise(resolve => {
      chrome.storage.local.get({notes: []}, (result) => {
        resolve(result.notes.length);
      });
    });
  });

  expect(notesCountAfter).toEqual(1); 
});

test('Persisted Notes Remain After Reloading The Page', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);

  await page.reload();

  await page.waitForSelector('.note-item');
  const notesCount = await page.evaluate(() => document.querySelectorAll('.note-item').length);
  expect(notesCount).toBeGreaterThan(0);
});

test('Delete a note', async () => {
  // Go to the page
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);

  // Assume there is a note to delete
  await page.click('.note-item'); // Click on the note to delete

  // Click on the delete button
  await page.click('#delete');

  // Confirm the deletion
  await page.click('#confirmDelete');

  // Verify the note is deleted
  const deletedNote = await page.evaluate(() => document.querySelector('.note-item'));
  expect(deletedNote).toBe(null);
});


//these 2 tests are not reday yet but feel free to look at them and correct them

/*test('Adding a note with extremely long content', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);

  
  const longContent = 'a'.repeat(10000); // Example of long content
  await page.type('#title', 'Long Content Note');
  await page.evaluate(longContent => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue(longContent);
  }, longContent);
  
  await page.click('#add-note-button');

  await page.waitForSelector('.note-item');
  const notePresent = await page.evaluate(() => {
    const noteTitle = document.querySelector('.note-item-title').textContent;
    return noteTitle.includes('Long Content Note');
  });
  expect(notePresent).toBe(true);
});


test('UI updates correctly after adding a note', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);

  await page.type('#title', 'Test Note');
  await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue('Test note content');
  });

  await page.click('#add-note-button'); 
  await page.waitForFunction(() => document.querySelectorAll('.note-item').length > 0, { timeout: 10000 });

  const notePresent = await page.evaluate(() => {
    const noteTitleElement = document.querySelector('.note-item-title');
    if (!noteTitleElement) {
      console.log('Note title element not found on the page');
      return false;
    }
    const noteTitle = noteTitleElement.textContent;
    return noteTitle.includes('Test Note');
  });

  expect(notePresent).toBe(true);
});



*/
