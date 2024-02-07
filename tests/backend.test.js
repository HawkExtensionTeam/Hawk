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

// Test: Popup Renders Correctly
// Confirms the popup page loads with the expected `#checklist`
// element present and containing a single child,
// ensuring the popup UI is correctly initialized.
test('popup renders correctly', async () => {
  const popupUrl = `chrome-extension://${EXTENSION_ID}/hello.html`;
  await page.goto(popupUrl);

  const checklistExists = await page.$('#checklist') !== null;
  expect(checklistExists).toBe(true);

  const tasksCount = await page.evaluate(() => {
    const tasksList = document.querySelector('#checklist');
    return tasksList ? tasksList.children.length : 0;
  });

  expect(tasksCount).toBe(1);
});
// Test: Add Task - Form Interaction Test
// Validates the ability to open, fill, and submit the new task form,
// verifying user interaction workflows for adding tasks are functioning as designed.

test('Add Task - Opens form correctly', async () => {
  await page.goto(`chrome-extension://${EXTENSION_ID}/new_tab.html`);

  await page.click('#new-task-button');

  await page.waitForSelector('#todoForm', {
    visible: true,
  });

  await page.type('#taskInput', 'New Task Title');
  await page.type('#descriptionInput', 'New Task Description');
  await page.type('#dateInput', '2024/02/10');
  await page.type('#timeInput', '12:00');

  await page.click('#todoForm button[type="submit"]');
});

//Test: Time formatting.
//Validates the time formatting function in the to-do list.
test('time formatting function', async () => {
  const testCases = [
    { input: '12:00', expectedOutput: '12:00' },
    { input: '18:30', expectedOutput: '18:30' },
    { input: '09:45', expectedOutput: '09:45' },
  ];

  for (const testCase of testCases) {
    const formattedTime = await page.evaluate((inputTime) => {
      return formatTime(inputTime);
    }, testCase.input);

    expect(formattedTime).toBe(testCase.expectedOutput);
  }
});

