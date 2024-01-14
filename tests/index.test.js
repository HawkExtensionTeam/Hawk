const puppeteer = require('puppeteer');

const EXTENSION_PATH = process.cwd();
let EXTENSION_ID;
let browser;
let page;

beforeEach(async () => {
  browser = await puppeteer.launch({
    headless: 'new',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
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

afterEach(async () => {
  await browser.close();
  browser = undefined;
});

test('popup renders correctly', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/hello.html`);

  const tasksList = await page.$('#checklist');
  if (tasksList) {
    const tasks = await tasksList.$$('li');

    expect(tasks.length).toBe(0);
  } else {
    fail('Task checklist not found on the page');
  }
});
