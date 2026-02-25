#!/usr/bin/env node
'use strict';
const APP = 'com.dlnraja.tuya.zigbee';

async function dashboardFallback(ver, log) {
  log = log || console.log;
  const em = process.env.HOMEY_EMAIL, pw = process.env.HOMEY_PASSWORD;
  if (!em || !pw) {
    log('  No credentials for dashboard (HOMEY_EMAIL / HOMEY_PASSWORD missing)');
    return false;
  }

  // Strategy 1: Direct API endpoints (fast, no browser needed)
  const token = await _getAthomToken(em, pw, log);
  if (token) {
    const apiOk = await _tryApiPromote(token, ver, log);
    if (apiOk) return true;
  }

  // Strategy 2: Puppeteer browser automation (fallback)
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch (e) {
    log('  Puppeteer not available, skipping browser fallback');
    return false;
  }

  let browser;
  try {
    log('  Launching Puppeteer for dashboard fallback...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();

    log('  Navigating to Athom login...');
    await page.goto('https://accounts.athom.com/login', { waitUntil: 'networkidle2' });

    log('  Entering credentials...');
    await page.type('input[type="email"]', em);
    await page.type('input[type="password"]', pw);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    log(`  Navigating to app versions page for ${APP}...`);
    await page.goto(`https://tools.developer.homey.app/apps/app/${APP}/versions`, { waitUntil: 'networkidle2' });

    log('  Waiting for version list to load...');
    await new Promise(r => setTimeout(r, 5000));

    log(`  Looking for version ${ver} to promote to test...`);
    const promoted = await page.evaluate((version) => {
      const rows = Array.from(document.querySelectorAll('tr'));
      const targetRow = rows.find(r => r.textContent.includes(version) && r.textContent.includes('draft'));
      if (!targetRow) return false;

      const buttons = Array.from(targetRow.querySelectorAll('button'));
      const testBtn = buttons.find(b => b.textContent.toLowerCase().includes('test'));
      if (testBtn) { testBtn.click(); return true; }

      const menuBtn = buttons.find(b => b.getAttribute('aria-haspopup') === 'true' || b.querySelector('svg'));
      if (menuBtn) {
        menuBtn.click();
        setTimeout(() => {
          const items = Array.from(document.querySelectorAll('[role="menuitem"]'));
          const p = items.find(i => i.textContent.toLowerCase().includes('test'));
          if (p) p.click();
        }, 500);
        return true;
      }
      return false;
    }, ver);

    if (promoted) {
      log('  Successfully clicked promote to test button via Puppeteer.');
      await new Promise(r => setTimeout(r, 3000));
      return true;
    } else {
      log(`  Could not find draft version ${ver} on the dashboard.`);
      return false;
    }
  } catch (error) {
    log('  Dashboard fallback error: ' + error.message);
    return false;
  } finally {
    if (browser) await browser.close();
  }
}

async function _getAthomToken(em, pw, log) {
  try {
    const r = await fetch('https://accounts.athom.com/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: em, password: pw })
    });
    const j = await r.json();
    if (j.token) { log('  Athom token obtained'); return j.token; }
  } catch (e) { log('  Athom login failed: ' + e.message); }
  return null;
}

async function _tryApiPromote(token, ver, log) {
  const endpoints = [
    { m: 'PUT', u: `https://apps-sdk-v3.athom.com/api/app/${APP}/version/${ver}/test` },
    { m: 'POST', u: `https://apps-sdk-v3.athom.com/api/app/${APP}/version/${ver}/publish`, b: { channel: 'test' } },
    { m: 'PATCH', u: `https://apps-sdk-v3.athom.com/api/app/${APP}/version/${ver}`, b: { status: 'test' } },
    { m: 'PUT', u: `https://apps-api.developer.athom.com/api/app/${APP}/version/${ver}/test` },
    { m: 'POST', u: `https://apps-api.developer.athom.com/api/app/${APP}/version/${ver}/publish`, b: { channel: 'test' } },
  ];
  for (const ep of endpoints) {
    try {
      log(`  API try: ${ep.m} ${ep.u.split('/api/')[1] || ep.u}`);
      const r = await fetch(ep.u, {
        method: ep.m,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: ep.b ? JSON.stringify(ep.b) : undefined
      });
      if (r.ok || r.status === 204) { log('  API promote OK!'); return true; }
      log(`  API ${r.status}`);
    } catch (e) { log(`  API error: ${e.message}`); }
  }
  return false;
}

module.exports = { dashboardFallback };

if (require.main === module) {
  const v = process.argv[2];
  if (!v) { console.error('Usage: dashboard-fallback.js <version>'); process.exit(1); }
  dashboardFallback(v, console.log).then(r => process.exit(r ? 0 : 1));
}
