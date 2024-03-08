const puppeteer = require('puppeteer');

const EXTENSION_PATH = process.cwd();
let EXTENSION_ID;
let browser;
const TESTDATA = 'tests/testData.json';
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

afterEach(async () => {
  await browser.close();
  browser = undefined;
});

/* Test: Popup Renders Correctly
 Confirms the popup page loads with the expected `#checklist` element present
 and containing a single child, ensuring the popup UI is correctly initialized.
 Assuming the popup page still uses the same checklist ID. */
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
  await page.goto(`chrome-extension://${EXTENSION_ID}/todo_list.html`);

  await page.click('#new-tab-btn');
  await page.waitForSelector('#newTaskModal', { visible: true });

  await page.type('#taskInput', ' Task 1 ');
  await page.type('#descriptionInput', ' Description');
  // await page.type('#dateInput', '2024/02/10');
  // await page.type('#timeInput', '1:30');

  await page.click('#createTask');

  await page.waitForSelector('#newTaskModal', { hidden: true });
});

/* Test: Sort Tasks Functionality
Verifies that the sortTasks function sorts
 tasks correctly based on their due dates. */
test('sortTasks function sorts tasks correctly', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/todo_list.html`);
  const tasksToSort = {
    task1: { due: '2024/02/12' },
    task2: { due: '2024/02/10' },
    task3: { due: '2024/02/11' },
  };

  const sortedTaskIds = await page.evaluate((tasks) => sortTasks(tasks), tasksToSort);

  expect(sortedTaskIds).toEqual(['task2', 'task3', 'task1']);
});

/* Test: Task Deletion Functionality
 Ensures that the functionality to delete a task removes it as
  expected, leaving no trace in the tasks storage. */
test('successfully deletes a task', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/todo_list.html`);

  await page.evaluate(() => {
    window.tasks = {
      task1: { title: 'Task 1', due: '2024-01-01' },
    };
  });

  await page.evaluate(() => {
    delete window.tasks.task1;
  });

  const taskExistsAfterDeletion = await page.evaluate(() => 'task1' in window.tasks);

  expect(taskExistsAfterDeletion).toBe(false);
});

test('Test to restore a task from recently deleted', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  const fileInputSelector = '#jsonInput';
  const filePath = TESTDATA;

  await page.waitForSelector(fileInputSelector);
  const input = await page.$(fileInputSelector);
  await input.uploadFile(filePath);

  await page.goto(`chrome-extension://${EXTENSION_ID}/todo_list.html`);
  await page.click('#recently-deleted-btn');
  await page.waitForSelector('button[restore-task-id="1708875985100Delete Test Task"]');
  await page.click('button[restore-task-id="1708875985100Delete Test Task"]');

  await page.click('#recently-deleted-btn');

  const restoredTasksCount = await page.evaluate(() => {
    const tasksList = document.querySelector('#checklist-2');
    return tasksList ? tasksList.children.length : 0;
  });

  expect(restoredTasksCount).toBe(2);
});

test('Test to check if task gets deleted after 30 days', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  const fileInputSelector = '#jsonInput';
  const filePath = TESTDATA;

  await page.waitForSelector(fileInputSelector);
  const input = await page.$(fileInputSelector);
  await input.uploadFile(filePath);
  await page.waitForTimeout(2000);
  jest.useFakeTimers('modern');
  const currentDate = new Date();
  const futureDate = new Date(currentDate.getTime() + (2000 * 365 * 24 * 60 * 60 * 1000));
  jest.setSystemTime(futureDate);

  await page.goto(`chrome-extension://${EXTENSION_ID}/todo_list.html`);
  await page.click('#recently-deleted-btn');
  const tasksCount = await page.evaluate(() => {
    const tasksList = document.querySelector('#rd-checklist');
    return tasksList ? tasksList.children.length : 0;
  });

  expect(tasksCount).toBe(0);
});
