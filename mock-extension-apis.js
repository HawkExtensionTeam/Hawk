const puppeteer = require('puppeteer');
const EXTENSION_PATH = process.cwd()

module.exports = async () => {
    await puppeteer.launch({
        headless: 'new',
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`
        ]
    });
}