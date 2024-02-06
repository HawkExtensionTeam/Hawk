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

      test('Add Task - Opens form correctly', async () => {
        // Navigate to the extension's new tab page
        await page.goto(`chrome-extension://${EXTENSION_ID}/new_tab.html`);
    
        // Click the "New Task" button to open the task addition form
        await page.click('#new-task-button');
    
        // Wait for the task form to become visible
        await page.waitForSelector('#todoForm', {
            visible: true,
        });
    
        // Fill out the form
        await page.type('#taskInput', 'New Task Title');
        await page.type('#descriptionInput', 'New Task Description');
        await page.type('#dateInput', '2024/02/10'); // Use a future date for the test
        await page.type('#timeInput', '12:00');
    
        // Submit the form by clicking the "Add Task" button within the form
        await page.click('#todoForm button[type="submit"]'); // Adjust if your button has a unique identifier
    
        // Additional assertions can be added here to verify the task was added correctly
        // For example, you could check if the task appears in the checklist
    });
    