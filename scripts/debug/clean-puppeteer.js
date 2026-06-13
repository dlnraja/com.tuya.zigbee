'use strict';
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const SETTINGS_PATH = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
const BASE = 'https://tools.developer.homey.app';

function readCliSession() {
  const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  const token = settings.homeyApi?.token;
  if (!token?.access_token) throw new Error('No token');
  return token;
}

(async () => {
  let browser;
  try {
    const token = readCliSession();
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Listen to page console and error events
    page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.error(`[PAGE ERROR] ${err.toString()}`));

    // Listen to responses
    page.on('response', async res => {
      const url = res.url();
      if (url.includes('submission/comment') || url.includes('/build/2457')) {
        const status = res.status();
        if (status === 200) {
          try {
            const body = await res.text();
            console.log(`\nURL: ${url}`);
            console.log(`BODY: ${body.slice(0, 2000)}`);
          } catch (e) {
            console.log(`Failed to read body of ${url}: ${e.message}`);
          }
        }
      }
    });

    // 1. Navigate to domain to set localStorage
    await page.setRequestInterception(true);
    const tempHandler = req => {
      if (req.url() === BASE || req.url() === BASE + '/') {
        req.respond({
          status: 200,
          contentType: 'text/html',
          body: '<html><body>Injected</body></html>'
        });
      } else {
        req.continue();
      }
    };
    page.on('request', tempHandler);
    await page.goto(BASE);
    
    // 2. Inject localStorage
    await page.evaluate((tok) => {
      const tokenData = {
        access_token: tok.access_token,
        token_type: 'Bearer',
        refresh_token: tok.refresh_token,
      };
      localStorage.setItem('homey-api', JSON.stringify({ token: tokenData }));
    }, token);
    
    page.off('request', tempHandler);
    await page.setRequestInterception(false);
    
    // 3. Go to build page
    console.log(`Navigating to build page...`);
    await page.goto(`${BASE}/apps/app/com.dlnraja.tuya.zigbee/build/2457`, { waitUntil: 'networkidle2' });
    
    // Wait for content and let JS render the UI
    await new Promise(r => setTimeout(r, 10000));
    
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`\n=== PAGE INNER TEXT ===`);
    console.log(bodyText);
    console.log(`=======================\n`);
    
    const screenshotPath = path.join(__dirname, 'build-2457-details.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);

  } catch (e) {
    console.error(e);
  } finally {
    if (browser) await browser.close();
  }
})();
