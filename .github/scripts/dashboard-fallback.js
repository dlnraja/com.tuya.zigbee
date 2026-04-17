const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
#!/usr/bin/env node
'use strict';
const { fetchWithRetry } = require('./retry-helper');
const APP = 'com.dlnraja.tuya.zigbee';

async function dashboardFallback(ver, log) {
  log = log || console.log;
  const em = process.env.HOMEY_EMAIL, pw = process.env.HOMEY_PASSWORD;
  if (!em || !pw) {
    log('  No credentials for dashboard (HOMEY_EMAIL/HOMEY_PASSWORD missing)');
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
    const r = await fetchWithRetry('https://accounts.athom.com/login', {
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
  const BASE = 'https://apps-api.athom.com/api/v1';
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Step 1: Exchange token for delegation token (audience: apps)
  try {
    log('  Getting delegation token...');
    const dr = await fetchWithRetry('https://api.athom.com/delegation/token', {
      method: 'POST', headers: h, body: JSON.stringify({ audience: 'apps' })
    });
    const dd = await dr.json();
    if (dd.token) { h.Authorization = `Bearer ${dd.token}`; log('  Delegation token OK'); }
  } catch (e) { log(`  Delegation failed: ${e.message}, continuing with original token`); }

  // Step 2: List builds and find draft matching version
  try {
    log(`  Listing builds for ${APP}...`);
    const br = await fetchWithRetry(`${BASE}/app/${APP}/build`, { headers: h }, { retries: 2, label: 'athom' });
    const builds = await br.json();
    const list = Array.isArray(builds) ? builds : builds.builds || builds.data || [];
    const draft = list.find(b => (!b.channel || b.channel === 'draft') && b.version === ver)
      || list.find(b => !b.channel || b.channel === 'draft');
    if (!draft) { log('  No draft build found'); return false; }
    const buildId = draft.id || draft._id;
    log(`  Found draft build ${buildId} v${draft.version}`);

    // Step 3: Promote
    const pr = await fetchWithRetry(`${BASE}/app/${APP}/build/${buildId}/channel`, {
      method: 'POST', headers: h, body: JSON.stringify({ channel: 'test' })
    });
    if (pr.ok || pr.status === 204) { log('  API promote OK!'); return true; }
    log(`  Promote failed: ${pr.status}`);
  } catch (e) { log(`  API error: ${e.message}`); }
  return false;
}

module.exports = { dashboardFallback };

if (require.main === module) {
  const v = process.argv[2];
  if (!v) { console.error('Usage: dashboard-fallback.js <version>'); process.exit(1); }
  dashboardFallback(v, console.log).then(r => process.exit(r ? 0 : 1));
}
