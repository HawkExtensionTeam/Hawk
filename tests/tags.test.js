const puppeteer = require('puppeteer');

const EXTENSION_PATH = process.cwd();
let EXTENSION_ID;
let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({
    headless: false,
    defaultViewport: {
      width: 1200,
      height: 800,
    },
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  page = await browser.newPage();
  await page.goto('chrome://extensions');

  await page.waitForSelector('extensions-manager');

  EXTENSION_ID = await page.evaluate(() => {
    const extensionsItemElement = document.querySelector('body > extensions-manager')
      ?.shadowRoot.querySelector('#items-list')
      ?.shadowRoot.querySelector('extensions-item');
    return extensionsItemElement ? extensionsItemElement.getAttribute('id') : null;
  });
});

afterAll(async () => {
  await browser.close();
  browser = undefined;
});

test('Add Tag - checks if a tag is properly created', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/todo_list.html`);
  await page.click('#new-tab-btn');
  await page.waitForTimeout(1000);
  await page.waitForSelector('#newTaskModal', { visible: true });
  await page.click('.show-create-tag-modal-btn');
  await page.waitForTimeout(1000);
  await page.waitForSelector('#createTagModal', { visible: true });
  await page.type('#tagName', 'checkForTag');
  await page.type('#tagColour', '#cd5b45');
  await page.waitForTimeout(1000);
  await page.click('#createTagBtn');

  const storedTags = await page.evaluate(() => new Promise((resolve) => {
    chrome.storage.local.get('tags', (result) => {
      resolve(result.tags);
    });
  }));
  expectedTagName = 'checkForTag';
  expectedTagColour = '#cd5b45';
  let actualName;
  let actualColour;
  Object.keys(storedTags).forEach((key) => {
    if (
      storedTags[key].tagColour === expectedTagColour
        && storedTags[key].tagName === expectedTagName
    ) {
      actualName = storedTags[key].tagName;
      actualColour = storedTags[key].tagColour;
    }
  });
  expect(actualColour).toBe(expectedTagColour);
  expect(actualName).toBe(expectedTagName);
});

test('Filter by Tags - check if tasks are filtered by tags', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/todo_list.html`);
  await page.click('#new-tab-btn');
  await page.waitForSelector('#newTaskModal', { visible: true });
  await page.waitForTimeout(1000);
  await page.type('#taskInput', ' Task 1');
  await page.type('#descriptionInput', ' Description');
  await page.$eval('#dateInput', (input) => {
    input.value = '';
  });
  await page.type('#dateInput', '2024/02/10');
  await page.$eval('#timeInput', (input) => {
    input.value = '';
  });
  await page.type('#timeInput', '01:30');
  await page.evaluate(() => {
    const checkbox = document.querySelector('#newTaskModal .selective-checkbox');
    checkbox.checked = true;
  });

  await page.click('#createTask');

  await page.waitForTimeout(1000);

  await page.click('#tag-filter-btn');
  await page.waitForSelector('#tagFilterModal', { visible: true });
  await page.evaluate(() => {
    const checkbox = document.querySelector('#tagFilterModal .selective-checkbox');
    checkbox.checked = true;
  });
  await page.waitForTimeout(1000);
  await page.click('.btn.btn-primary.filter-trigger');

  const checklistExists = await page.$('#checklist-2') !== null;
  expect(checklistExists).toBe(true);

  const tasksCount = await page.evaluate(() => {
    const tasksList = document.querySelector('#checklist-2');
    return tasksList ? tasksList.children.length : 0;
  });

  expect(tasksCount).toBe(1);
});

test('Delete Tag - checks if a tag is deleted', async () => {
  let storedTags = await page.evaluate(() => new Promise((resolve) => {
    chrome.storage.local.get('tags', (result) => {
      resolve(result.tags);
    });
  }));

  const expectedTagName = 'checkForTag';
  const expectedTagColour = '#cd5b45';
  let tagID;

  Object.keys(storedTags).forEach((key) => {
    if (
      storedTags[key].tagColour === expectedTagColour
        && storedTags[key].tagName === expectedTagName
    ) {
      tagID = key;
    }
  });

  await page.goto(`chrome-extension://${EXTENSION_ID}/todo_list.html`);
  await page.click('#tag-filter-btn');
  await page.waitForTimeout(1000);
  await page.click(`.tag-item[associatedtag="${tagID}"]`, { button: 'right' });
  await page.on('dialog', async (dialog) => {
    await dialog.accept(); // Click OK on the dialog
  });
  storedTags = await page.evaluate(() => new Promise((resolve) => {
    chrome.storage.local.get('tags', (result) => {
      resolve(result.tags);
    });
  }));

  let tagExistsAfterDeletion = false;
  Object.keys(storedTags).forEach((key) => {
    if (key === tagID) {
      tagExistsAfterDeletion = true;
    }
  });

  expect(tagExistsAfterDeletion).toBe(false);
});
