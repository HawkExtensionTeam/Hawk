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

test('Adding a new note to the extension and verifying addition', async () => {
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
