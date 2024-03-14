const puppeteer = require('puppeteer');

const EXTENSION_PATH = process.cwd();
let EXTENSION_ID;
let browser;
let page;

beforeAll(async () => {
  browser = await puppeteer.launch({
    devtools: true,
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
    const extensionsItemElement = document
      .querySelector('body > extensions-manager')
      ?.shadowRoot.querySelector('#items-list')
      ?.shadowRoot.querySelector('extensions-item');
    return extensionsItemElement
      ? extensionsItemElement.getAttribute('id')
      : null;
  });
});

afterAll(async () => {
  await browser.close();
  browser = undefined;
});

test('Test if page is indexed', async () => {
  const testLink = 'https://www.amazon.com/';
  let linkExists = false;
  await page.goto(testLink);
  await page.waitForTimeout(500);
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('indexed', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  if (indexedData != null) {
    linkExists = indexedData.links.includes(testLink);
  }
  expect(linkExists).toBe(true);
});

test('Add new RegEx rule to indexing sites', async () => {
  const testRule = '^https://uk.webuy.com/.*$';
  const testLink = 'https://uk.webuy.com/';
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(1000);
  await page.click('#indexing');
  await page.click('#regex-tab');
  await page.click('button[data-bs-target="#addRuleModal"]');
  await page.waitForTimeout(1000);
  await page.type('#addRuleInput', testRule);
  await page.click('#addRule');

  let linkExists = false;
  await page.goto(testLink);
  await page.waitForTimeout(1000);
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('indexed', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  if (indexedData != null) {
    linkExists = indexedData.links.includes(testLink);
  }
  expect(linkExists).toBe(true);
});

test('Add new url rule to indexing sites', async () => {
  const testRule = 'https://brilliant.org/s/data-analysis/';
  const testLink = 'https://brilliant.org/s/data-analysis/';
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(1000);
  await page.click('#indexing');
  await page.click('#urls-tab');
  await page.click('button[data-bs-target="#addRuleModal"]');
  await page.waitForTimeout(1000);
  await page.type('#addRuleInput', testRule);
  await page.click('#addRule');

  let linkExists = false;
  await page.goto(testLink);
  await page.waitForTimeout(1000);
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('indexed', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  if (indexedData != null) {
    linkExists = indexedData.links.includes(testLink);
  }
  expect(linkExists).toBe(true);
});

test('Add new site rule to indexing sites', async () => {
  const testRule = 'www.gla.ac.uk';
  const testLink = 'https://www.gla.ac.uk/';
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(1000);
  await page.click('#indexing');
  await page.click('button[data-bs-target="#addRuleModal"]');
  await page.waitForTimeout(1000);
  await page.type('#addRuleInput', testRule);
  await page.click('#addRule');

  let linkExists = false;
  await page.goto(testLink);
  await page.waitForTimeout(1000);
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('indexed', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  if (indexedData != null) {
    linkExists = indexedData.links.includes(testLink);
  }
  expect(linkExists).toBe(true);
});

test('Add new String matches rule to indexing sites', async () => {
  const testLink = 'https://www.nba.com/games';
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(500);
  await page.click('#indexing');
  await page.click('#string-matches-tab');
  await page.click('button[data-bs-target="#addRuleModal"]');
  await page.waitForTimeout(500);
  await page.type('#addRuleInput', 'nba');
  await page.click('#addRule');

  let linkExists = false;
  await page.goto(testLink);
  await page.waitForTimeout(500);
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('indexed', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  if (indexedData != null) {
    linkExists = indexedData.links.includes(testLink);
  }
  expect(linkExists).toBe(true);
});

test('Test if page with XML breaking title can be indexed', async () => {
  const testLink = 'https://www.amazon.com/SAMSUNG-Adapter-microSDXC-MB-ME512KA-AM/dp/B09B1HMJ9Z/ref=sr_1_5?s=electronics&sr=1-5&th=1';
  await page.goto(testLink);
  await page.waitForTimeout(500);

  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(500);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('indexed', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  expect(indexedData == null).toBe(false);

  const linkExists = indexedData.links.includes(testLink);
  expect(linkExists).toBe(true);
}, 20000);

test('Test if multiple pages can be indexed rapidly', async () => {
  const testLinks = [
    'https://docs.aws.amazon.com/lambda/latest/dg/lambda-foundation.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-concepts.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/foundation-progmodel.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-package.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/foundation-iac.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/foundation-networking.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/foundation-console.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html',
    'https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-features.html',
  ];
  await page.goto(testLinks[0]);
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const indexOffset = 3;
    const numDocs = 9;
    const internalLinks = document.getElementsByClassName('awsui_link_l0dv0_1pmy4_247');
    for (let i = 0; i < numDocs; i += 1) {
      const link = internalLinks[i + indexOffset];
      link.click();
      // eslint-disable-next-line
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  });

  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(500);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('indexed', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  expect(indexedData == null).toBe(false);
  let linkExists;
  for (let linkIdx = 0; linkIdx < testLinks.length; linkIdx += 1) {
    const link = testLinks[linkIdx];
    linkExists = indexedData.links.includes(link);
    expect(linkExists).toBe(true);
  }
}, 30000);

test('Add delete rule to indexing sites', async () => {
  const testLink = 'https://www.nba.com/watch/league-pass-stream';
  const ruletoDel = 'nba';
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(500);
  await page.click('#indexing');
  await page.waitForTimeout(500);
  await page.click('#string-matches-tab');
  await page.waitForTimeout(500);
  await page.click('button.btn.btn-danger.string-matches-del');
  await page.waitForTimeout(500);
  await page.click('button.btn.btn-danger.rule-delete-btn');
  await page.waitForTimeout(500);

  let linkExists = false;
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(500);
  await page.click('#backup');
  await page.waitForTimeout(500);
  await page.click('button.btn.btn-danger.reset-btn');
  await page.waitForTimeout(500);
  await page.click('#confirm-erase-data-btn');
  await page.waitForTimeout(500);
  await page.goto(testLink);
  await page.waitForTimeout(500);
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.waitForTimeout(500);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('allowedStringMatches', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  if (indexedData != null) {
    linkExists = indexedData.includes(ruletoDel);
  }
  expect(linkExists).toBe(false);
});

test('Add delete Regex rule to indexing sites', async () => {
  const testLink = 'https://uk.webuy.com/supercat?superCatId=1&superCatName=Gaming';
  const ruletoDel = '^https://uk.webuy.com/.*$';
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.click('#indexing');
  await page.click('#regex-tab');
  await page.waitForTimeout(1000);
  await page.click('#regex-list > div:nth-child(4) > div.col-4.d-flex.justify-content-end > button');

  await page.waitForTimeout(1000);
  await page.click('button.btn.btn-danger.regex-delete-btn');
  await page.waitForTimeout(1000);
  let linkExists = false;
  await page.goto(testLink);
  await page.waitForTimeout(1000);
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('allowedRegex', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  if (indexedData != null) {
    linkExists = indexedData.includes(ruletoDel);
  }
  expect(linkExists).toBe(false);
});

test('Add delete site rule to indexing sites', async () => {
  const ruletoDel = 'www.gla.ac.uk';
  await page.goto(`chrome-extension://${EXTENSION_ID}/settings.html`);
  await page.click('#indexing');
  await page.waitForTimeout(1000);
  await page.click('#sites-list > div > div.col-4.d-flex.justify-content-end > button');

  await page.waitForTimeout(1000);
  await page.click('button.btn.btn-danger.regex-delete-btn');
  await page.waitForTimeout(1000);
  let linkExists = false;
  const indexedData = await page.evaluate(
    () => new Promise((resolve) => {
      chrome.storage.local.get('allowedRegex', (result) => {
        resolve(result.indexed);
      });
    }),
  );
  if (indexedData != null) {
    linkExists = indexedData.includes(ruletoDel);
  }
  expect(linkExists).toBe(false);
});
