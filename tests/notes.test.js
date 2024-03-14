const puppeteer = require('puppeteer');

const EXTENSION_PATH = process.cwd();
let EXTENSION_ID;
let browser;
let page;

beforeAll(async () => {
  const launchOptions = {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  };

  browser = await puppeteer.launch(launchOptions);
});

beforeEach(async () => {
  page = await browser.newPage();
  await page.goto('chrome://extensions');

  EXTENSION_ID = await page.evaluate(() => {
    const extensionsManager = document.querySelector('body > extensions-manager');
    const itemsList = extensionsManager?.shadowRoot.querySelector('#items-list');
    const extensionsItem = itemsList?.shadowRoot.querySelector('extensions-item');
    return extensionsItem ? extensionsItem.getAttribute('id') : null;
  });
});

afterEach(async () => {
  await page.evaluate(() => localStorage.clear());
  await page.close();
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

  await page.waitForSelector('#add-note-button');
  await page.click('#add-note-button');

  await page.waitForFunction(
    () => document.querySelectorAll('.note-item').length,
    { polling: 'mutation' },
  );

  const notesCountAfter = await page.evaluate(() => new Promise((resolve) => {
    chrome.storage.local.get({ notes: [] }, (result) => {
      resolve(result.notes.length);
    });
  }));

  expect(notesCountAfter).toEqual(1);
}, 20000);

test('Persisted Notes Remain After Reloading The Page', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);

  await page.reload();

  await page.waitForSelector('.note-item');
  const notesCount = await page.evaluate(() => document.querySelectorAll('.note-item').length);
  expect(notesCount).toBeGreaterThan(0);
});

test('View A Note', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`);
  await page.waitForSelector('.note-item');
  await page.click('.note-item');

  await page.waitForSelector('#titleDisplay');
  const noteTitle = await page.evaluate(() => document.querySelector('#titleDisplay').textContent);
  expect(noteTitle).not.toBe('');
});

test('Editing A Note', async () => {
  const url = `chrome-extension://${EXTENSION_ID}/add_note.html`;
  await page.goto(url);

  await page.waitForSelector('.note-item', { visible: true });
  await page.click('.note-item');

  await page.waitForSelector('#edit', { visible: true });
  await page.click('#edit');

  await page.waitForSelector('#title');
  await page.type('#title', ' Edited');

  await page.waitForSelector('.CodeMirror');
  await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue(' Edited');
  });

  await page.waitForSelector('#save');
  await page.click('#save');

  await page.waitForSelector('#titleDisplay');
  const noteTitle = await page.evaluate(() => document.querySelector('#titleDisplay').textContent);
  expect(noteTitle).toBe('Test Note Title Edited');
}, 20000);

test('Testing A note with a long content', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`, { waitUntil: 'networkidle0' });

  await page.waitForSelector('#add-note', { visible: true });
  await page.click('#add-note');

  const longContent = 'first'.repeat(10000);
  await page.type('#title', 'Long Content Note');
  await page.evaluate((content) => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue(content);
  }, longContent);

  await page.waitForSelector('#add-note-button', { visible: true, timeout: 30000 });
  await page.click('#add-note-button');

  await page.waitForSelector('.note-item');
  const notePresent = await page.evaluate(() => {
    const noteTitle = document.querySelector('.note-item-title').textContent;
    return noteTitle.includes('Long Content Note');
  });
  expect(notePresent).toBe(false);
}, 20000);

test('Adding a note with a long title', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/add_note.html`, { waitUntil: 'networkidle0' });

  await page.waitForSelector('#add-note', { visible: true });
  await page.click('#add-note');

  const longTitle = 'This is a very long title for a note, meant to test how the application handles notes with exceptionally long titles. '
                      + 'It includes enough text to be reasonably considered longer than typical use cases.';

  await page.waitForSelector('#title', { visible: true });
  await page.type('#title', longTitle);

  await page.evaluate(() => {
    const cm = document.querySelector('.CodeMirror').CodeMirror;
    cm.setValue('Note with a long title.');
  });

  await page.waitForSelector('#add-note-button', { visible: true });
  await page.click('#add-note-button');

  await page.waitForSelector('.note-item', { visible: true, timeout: 20000 });

  const noteExists = await page.evaluate((title) => {
    const titles = Array.from(document.querySelectorAll('.note-item-title'));
    return titles.some((noteTitle) => noteTitle.textContent.includes(title));
  }, longTitle.substring(0, 50));

  expect(noteExists).toBe(true);
}, 40000);
