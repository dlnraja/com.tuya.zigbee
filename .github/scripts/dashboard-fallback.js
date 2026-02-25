#!/usr/bin/env node
''use strict'';
const puppeteer = require(''puppeteer'');
const APP = ''com.dlnraja.tuya.zigbee'';

async function dashboardFallback(ver, log) {
  log = log || console.log;
  const em = process.env.HOMEY_EMAIL, pw = process.env.HOMEY_PASSWORD;
  if (!em || !pw) {
    log(''  No credentials for dashboard (HOMEY_EMAIL / HOMEY_PASSWORD missing)'');
    return false;
  }
  
  let browser;
  try {
    log(''  Launching Puppeteer for dashboard fallback...'');
    browser = await puppeteer.launch({ 
      headless: "new", 
      args: [''--no-sandbox'', ''--disable-setuid-sandbox'', ''--disable-dev-shm-usage''] 
    });
    const page = await browser.newPage();
    
    log(''  Navigating to Athom login...'');
    await page.goto(''https://accounts.athom.com/login'', { waitUntil: ''networkidle2'' });
    
    log(''  Entering credentials...'');
    await page.type(''input[type="email"]'', em);
    await page.type(''input[type="password"]'', pw);
    
    await Promise.all([
      page.click(''button[type="submit"]''),
      page.waitForNavigation({ waitUntil: ''networkidle2'' })
    ]);
    
    log(`  Navigating to app versions page for ${APP}...`);
    await page.goto(`https://tools.developer.homey.app/apps/app/${APP}/versions`, { waitUntil: ''networkidle2'' });
    
    log(''  Waiting for version list to load...'');
    await page.waitForTimeout(5000); // Give the SPA time to render
    
    log(`  Looking for version ${ver} to promote to test...`);
    const promoted = await page.evaluate((version) => {
      // Find the row containing our version
      const rows = Array.from(document.querySelectorAll(''tr''));
      const targetRow = rows.find(r => r.textContent.includes(version) && r.textContent.includes(''draft''));
      
      if (!targetRow) return false;
      
      // Find the "Publish to Test" or similar button/menu in this row
      const buttons = Array.from(targetRow.querySelectorAll(''button''));
      const testBtn = buttons.find(b => b.textContent.toLowerCase().includes(''test''));
      
      if (testBtn) {
        testBtn.click();
        return true;
      }
      
      // If it''s in a dropdown menu
      const menuBtn = buttons.find(b => b.getAttribute(''aria-haspopup'') === ''true'' || b.querySelector(''svg''));
      if (menuBtn) {
        menuBtn.click();
        // The menu is rendered elsewhere in the DOM, we need to click it
        setTimeout(() => {
          const menuItems = Array.from(document.querySelectorAll(''[role="menuitem"]''));
          const promoteItem = menuItems.find(i => i.textContent.toLowerCase().includes(''test''));
          if (promoteItem) promoteItem.click();
        }, 500);
        return true;
      }
      
      return false;
    }, ver);
    
    if (promoted) {
      log(''  Successfully clicked promote to test button via Puppeteer.'');
      await page.waitForTimeout(3000); // Wait for action to complete
      return true;
    } else {
      log(`  Could not find draft version ${ver} or the promote button on the dashboard.`);
      return false;
    }
  } catch (error) {
    log(''  Dashboard fallback error: '' + error.message);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

module.exports = { dashboardFallback };

// If run directly
if (require.main === module) {
  const v = process.argv[2];
  if (!v) { console.error(''Provide version''); process.exit(1); }
  dashboardFallback(v, console.log).then(r => process.exit(r ? 0 : 1));
}
