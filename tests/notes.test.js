const puppeteer = require('puppeteer');
const EXTENSION_PATH = process.cwd(); 
let EXTENSION_ID;
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
  await page.goto('chrome://extensions');
  EXTENSION_ID = await page.evaluate(() => {
    const extensionsItemElement = document.querySelector('body > extensions-manager')
      ?.shadowRoot.querySelector('#items-list')
      ?.shadowRoot.querySelector('extensions-item');
    return extensionsItemElement ? extensionsItemElement.getAttribute('id') : null;
  });
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
    { polling: 'mutation' } 
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


test('Making Sure That The Notes Deletion Works as expected', async () => {
  await page.click('#delete');

  await page.waitForSelector('#confirmDelete', { visible: true });
  await page.click('#confirmDelete');

  await page.waitForFunction(() => !document.querySelector('.note-item'));

  const notesCountAfter = await page.evaluate(() => {
    const noteItems = document.querySelectorAll('.note-item');
    return noteItems.length;
  });

  expect(notesCountAfter).toEqual(0);
});

test('Testing A note with a long content', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);

  const longContent = 'first'.repeat(10000);
  await page.type('#title', 'Long Content Note');
  await page.evaluate((content) => { 
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue(content);
  }, longContent);
  
  await page.click('#add-note-button');

  await page.waitForSelector('.note-item');
  const notePresent = await page.evaluate(() => {
    const noteTitle = document.querySelector('.note-item-title').textContent;
    return noteTitle.includes('Long Content Note');
  });
  expect(notePresent).toBe(true);
});

test('View A Note', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);
  await page.waitForSelector('.note-item');
  await page.click('.note-item');

  await page.waitForSelector('#titleDisplay');
  const noteTitle = await page.evaluate(() => document.querySelector('#titleDisplay').textContent);
  expect(noteTitle).not.toBe('');
});

test('Editing  A Note', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);
  await page.waitForSelector('.note-item');
  await page.click('.note-item');

  await page.waitForSelector('#edit');
  await page.click('#edit');

  await page.waitForSelector('#title');
  await page.type('#title', ' Edited');

  await page.waitForSelector('.CodeMirror');
  await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue(' Edited');
  });

  await page.click('#save');

  await page.waitForSelector('.note-item');
  const noteTitle = await page.evaluate(() => document.querySelector('.note-item-title').textContent);
  expect(noteTitle).toBe('Long Content Note Edited');
});
