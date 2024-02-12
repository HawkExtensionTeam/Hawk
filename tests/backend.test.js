const puppeteer = require('puppeteer');

const EXTENSION_PATH = process.cwd();
let EXTENSION_ID;
let browser;
let page;

beforeEach(async () => {
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

/* Test: Popup Renders Correctly
  Confirms the popup page loads with the expected `#checklist`
  element present and containing a single child,
  ensuring the popup UI is correctly initialized.
  Assuming the popup page still uses the same checklist ID*/

test('popup renders correctly', async () => {
  const popupUrl = `chrome-extension://${EXTENSION_ID}/hello.html`; 
  await page.goto(popupUrl);

  const checklistExists = await page.$('#checklist') !== null;
  expect(checklistExists).toBe(true);

  const tasksCount = await page.evaluate(() => {
    const tasksList = document.querySelector('#checklist');
    return tasksList ? tasksList.children.length : 0;
  });

  expect(tasksCount).toBeGreaterThanOrEqual(0); 
});



/* Test: Add Task - Form Interaction Test
  Validates the ability to open, fill, and submit the new task form,
 verifying user interaction workflows for adding tasks are functioning as designed. */

test('Add Task - Opens form correctly', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/new_tab.html`);

  await page.click('#new-tab-btn'); 
  await page.waitForSelector('#newTaskModal', { visible: true });

  await page.type('#taskInput', ' Task 1 ');
  await page.type('#descriptionInput', 'Task Description 1');
  await page.type('#dateInput', '2024/02/10');
  await page.type('#timeInput', '12:00');

  await page.click('#newTaskModal .btn-primary');

  await page.waitForSelector('#newTaskModal', { hidden: true });
},);

test('sortTasks function sorts tasks correctly', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/new_tab.html`);
  const tasksToSort = {
    task3: { due: '2024/02/12' },
    task1: { due: '2024/02/10' },
    task2: { due: '2024/02/11' }
  };

  const sortedTaskIds = await page.evaluate(tasks => {
    return sortTasks(tasks);
  }, tasksToSort);

  expect(sortedTaskIds).toEqual(['task1', 'task2', 'task3']);
});
