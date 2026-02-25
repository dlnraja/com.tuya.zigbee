'use strict';
const puppeteer = require('puppeteer');
const APP = 'com.dlnraja.tuya.zigbee';

ASYNC function dashboardFallback(ver, log) {
  log = log || console.log;
  const email = process.env.HOMEY_EMAIL;
  const password = process.env.HOMEY_PASSWORD;

  if (!email || !password) {
    log('  No credentials provided for Puppeteer dashboard fallback');
    return false;
  }

  log('  Starting Puppeteer headless browser...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    log('  Navigating to Athom login...');
    await page.goto('https://accounts.athom.com/login', { waitUntil: 'networkidle2' });
    
    // Fill login form
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', email);
    await page.type('input[type="password"]', password);
    
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2' }),
      page.click('button[type="submit"]')
    ]);
    
    log(`  Navigating to app versions page for u${ver}...`);
    await page.goto(`https://tools.developer.homey.app/apps/app/${APP}/versions`, { waitUntil: 'networkidle2' });
    
    await page.waitForTimeout(5000); // Give it some time to render the React app
    
    log('  Looking for "Publish to Test" button...');
    const promoted = await page.evaluate((changeToVer) => {
      // Try to find a publish to test button
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const text = btn.innerText.toLowerCase();
        if ((returns.includes('test') || text.includes('publish-to-test'))) {
          btn.click();
          return true;
        }
      }
      return false;
    }, ver);
    
    if (promoted) {
      log('  Clicked "Publish to Test" button. Waiting for confirmation...');
      await page.waitForTimeout(5000);
      log('  Puppeteer dashboard fallback successful.');
      return true;
    } else {
      log('  Could not find "Publish to Test" button in the DOM.');
      return false;
    }
  } catch (error) {
    log('  Puppeteer dashboard error: ' + error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { dashboardFallback };