#!/usr/bin/env node
/**
 * diag-portal-live.js
 * Ouvre tools.developer.homey.app, injecte la session CLI Athom,
 * capture toutes les erreurs visibles (AggregateError, build failures).
 * 
 * Usage: node diag-portal-live.js [--headed]
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const APP_ID = 'com.dlnraja.tuya.zigbee';
const BASE   = 'https://tools.developer.homey.app';
const APP_URL = `${BASE}/apps/app/${APP_ID}`;
const SHOTS  = path.join(__dirname, '..', '..', 'screenshots');
const HEADED = process.argv.includes('--headed');

fs.mkdirSync(SHOTS, { recursive: true });

const log = m => { console.log(m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function snap(page, name) {
  const p = path.join(SHOTS, name + '.png');
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  log(`  📸 ${name}.png`);
  return p;
}

async function getText(page) {
  return page.evaluate(() => document.body?.innerText || '');
}

async function waitIdle(page, ms = 4000) {
  await sleep(ms);
  try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 8000 }); } catch {}
}

// ── AUTH ────────────────────────────────────────────────────────────────────
async function injectSession(page) {
  const settingsPath = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    log('❌ No CLI session — run: homey login');
    return false;
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const token = settings?.homeyApi?.token?.access_token
    || settings?.token?.access_token
    || settings?.access_token;

  if (!token) { log('❌ Token not found in settings.json'); return false; }
  log(`✅ Token found (${token.substring(0, 16)}...)`);

  // Navigate first
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
  await sleep(2000);

  // Inject token
  await page.evaluate((tok) => {
    try { localStorage.setItem('token', tok); } catch {}
    try { localStorage.setItem('_token', tok); } catch {}
    try { localStorage.setItem('homeyApiToken', tok); } catch {}
    try { localStorage.setItem('access_token', tok); } catch {}
    try { sessionStorage.setItem('token', tok); } catch {}
    try { document.cookie = `token=${tok}; path=/; domain=.homey.app`; } catch {}
    try { document.cookie = `access_token=${tok}; path=/`; } catch {}
  }, token);

  // Navigate to app page with token injected
  await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await waitIdle(page, 5000);
  
  const text = await getText(page);
  const isLoggedIn = !(/sign\s*in|log\s*in|login/i.test(text.substring(0, 500))) 
    || text.includes(APP_ID) 
    || text.includes('dlnraja')
    || text.includes('Dylan');

  if (!isLoggedIn) {
    log('⚠️  CLI injection failed — trying env credentials...');
    if (process.env.HOMEY_EMAIL && process.env.HOMEY_PASSWORD) {
      return await loginWithCredentials(page);
    }
    log('❌ No HOMEY_EMAIL/HOMEY_PASSWORD env vars. Set them or run: homey login');
    return false;
  }
  
  log(`✅ Logged in — page text: ${text.substring(0, 100).replace(/\n/g, ' ')}`);
  return true;
}

async function loginWithCredentials(page) {
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle2' }).catch(() => {});
  await waitIdle(page, 3000);
  
  const emailSel = ['input[type=email]', '#email', 'input[name=email]'];
  for (const s of emailSel) {
    const el = await page.$(s).catch(() => null);
    if (el) { await el.type(process.env.HOMEY_EMAIL, { delay: 30 }); break; }
  }
  const passSel = ['input[type=password]', '#password'];
  for (const s of passSel) {
    const el = await page.$(s).catch(() => null);
    if (el) { await el.type(process.env.HOMEY_PASSWORD, { delay: 30 }); break; }
  }
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => {});
  return page.url().includes('tools.developer');
}

// ── CAPTURE BUILD LIST ──────────────────────────────────────────────────────
async function captureBuildList(page) {
  log('\n── Navigating to app page...');
  await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await waitIdle(page, 5000);
  await snap(page, '01-app-page');
  
  const text = await getText(page);
  log(`  Page length: ${text.length}c`);
  
  // Extract all visible build info
  const buildInfo = await page.evaluate(() => {
    const results = [];
    
    // Look for build rows / cards
    const rows = [...document.querySelectorAll('[class*="build"], [class*="Build"], tr, [class*="row"], [class*="Row"], li')];
    rows.forEach(row => {
      const text = row.innerText?.trim();
      if (text && text.length > 5 && text.length < 500 && 
          /\d{4}|failed|error|success|process/i.test(text)) {
        results.push(text.substring(0, 200));
      }
    });
    
    // Also look for any error/status badges
    const badges = [...document.querySelectorAll('[class*="status"], [class*="Status"], [class*="badge"], [class*="chip"]')];
    badges.forEach(b => {
      const t = b.innerText?.trim();
      if (t && t.length > 0 && t.length < 100) results.push('BADGE: ' + t);
    });
    
    return [...new Set(results)].slice(0, 20);
  });
  
  log('\n  Build info found:');
  buildInfo.forEach(b => log('    ' + b.replace(/\n/g, ' | ')));
  
  // Get all text for error analysis
  const errorText = await page.evaluate(() => {
    const errors = [];
    const all = document.querySelectorAll('*');
    all.forEach(el => {
      const t = el.innerText?.trim();
      if (t && /aggregateerror|failed|error|invalid/i.test(t) && t.length < 1000) {
        errors.push(t.substring(0, 300));
      }
    });
    return [...new Set(errors)].slice(0, 15);
  });
  
  if (errorText.length > 0) {
    log('\n  ⚠️  ERROR TEXT FOUND:');
    errorText.forEach(e => log('    🔴 ' + e.replace(/\n/g, ' | ').substring(0, 150)));
  }
  
  return { text, buildInfo, errorText };
}

// ── CAPTURE LATEST BUILD DETAIL ─────────────────────────────────────────────
async function captureLatestBuild(page) {
  log('\n── Looking for latest build link...');
  
  // Find and click first build link
  const buildClicked = await page.evaluate(() => {
    // Try to find build links
    const links = [...document.querySelectorAll('a')];
    const buildLink = links.find(l => /build\/\d+/.test(l.href) || /\d{4}/.test(l.textContent));
    if (buildLink) {
      buildLink.click();
      return buildLink.href || buildLink.textContent;
    }
    return null;
  });
  
  if (buildClicked) {
    log(`  Clicked: ${buildClicked}`);
    await waitIdle(page, 5000);
    await snap(page, '02-build-detail');
    
    const text = await getText(page);
    const hasError = /aggregateerror|failed|invalid|error/i.test(text);
    log(`  Build page: ${text.length}c, hasError: ${hasError}`);
    
    if (hasError) {
      // Extract error detail
      const errorDetail = await page.evaluate(() => {
        const all = [...document.querySelectorAll('*')];
        for (const el of all) {
          const t = el.innerText?.trim();
          if (t && /AggregateError/i.test(t) && t.length < 5000) return t;
        }
        // Fallback: all error elements
        const errors = [...document.querySelectorAll('[class*="error"],[class*="Error"],[role="alert"]')];
        return errors.map(e => e.innerText?.trim()).filter(Boolean).join('\n---\n').substring(0, 3000);
      });
      log('\n  🔴 ERROR DETAIL:\n' + errorDetail?.substring(0, 500));
    }
    
    // Try to find and click any error indicators (triangles, badges)
    await page.evaluate(() => {
      const indicators = [...document.querySelectorAll('svg, [class*="icon"], [class*="Icon"]')];
      for (const el of indicators) {
        const cls = (el.className?.toString() || '').toLowerCase();
        const parentText = (el.parentElement?.innerText || '').toLowerCase();
        if (/error|warning|fail|danger/.test(cls) || /error|fail/.test(parentText)) {
          el.parentElement?.click();
          return;
        }
      }
    });
    await sleep(2000);
    await snap(page, '03-build-error-popup');
    
    const popupText = await page.evaluate(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alert"],[class*="modal"],[class*="popup"],[class*="tooltip"]')];
      return dialogs.map(d => d.innerText?.trim()).filter(Boolean).join('\n---\n').substring(0, 2000);
    });
    if (popupText) log('\n  POPUP:\n' + popupText.substring(0, 400));
  }
}

// ── DIRECT API CHECK ─────────────────────────────────────────────────────────
async function checkViaAPI(page) {
  log('\n── Checking via Athom API directly...');
  
  // Capture network token from SPA requests
  let apiToken = null;
  const apiResults = [];
  
  page.on('request', req => {
    const auth = req.headers()['authorization'] || '';
    if (auth && req.url().includes('api')) apiToken = auth.replace(/^Bearer\s+/i, '');
  });
  
  page.on('response', async res => {
    try {
      const url = res.url();
      if (url.includes('apps-api') || url.includes('/apps/')) {
        const j = await res.json().catch(() => null);
        if (j && (j.error || j.message || j.status || j.builds)) {
          apiResults.push({ url: url.substring(url.length - 60), data: j });
        }
      }
    } catch {}
  });
  
  // Reload to capture fresh API calls
  await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
  await waitIdle(page, 6000);
  
  log(`  API token captured: ${apiToken ? 'YES (' + apiToken.substring(0,16) + '...)' : 'NO'}`);
  log(`  API responses: ${apiResults.length}`);
  apiResults.slice(0, 5).forEach(r => {
    log(`  [${r.url}] ${JSON.stringify(r.data).substring(0, 200)}`);
  });
  
  return { apiToken, apiResults };
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  log('\n╔══════════════════════════════════════════════════════╗');
  log(`║  ATHOM DEV PORTAL LIVE DIAG — ${APP_ID}`);
  log(`║  URL: ${APP_URL}`);
  log(`║  Mode: ${HEADED ? 'HEADED (visible)' : 'HEADLESS'}`);
  log('╚══════════════════════════════════════════════════════╝\n');
  
  const puppeteer = require('puppeteer');
  
  const browser = await puppeteer.launch({
    headless: HEADED ? false : 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 },
    slowMo: HEADED ? 50 : 0,
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    // Step 1: Authenticate
    log('=== STEP 1: Authentication ===');
    const authed = await injectSession(page);
    if (!authed) {
      log('❌ Authentication failed');
      await snap(page, '00-auth-failed');
      process.exit(1);
    }
    await snap(page, '00-authenticated');

    // Step 2: Capture build list + errors
    log('\n=== STEP 2: Build List ===');
    const buildData = await captureBuildList(page);

    // Step 3: Latest build detail
    log('\n=== STEP 3: Build Detail ===');
    await captureLatestBuild(page);

    // Step 4: API capture
    log('\n=== STEP 4: API Capture ===');
    const apiData = await checkViaAPI(page);

    // Save full report
    const report = {
      timestamp: new Date().toISOString(),
      appId: APP_ID,
      appUrl: APP_URL,
      buildInfo: buildData.buildInfo,
      errors: buildData.errorText,
      apiResults: apiData.apiResults,
    };
    const reportPath = path.join(SHOTS, 'portal-diag-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log('\n╔══════════════════════════════════════════════════════╗');
    log('║  DONE');
    log(`║  Screenshots: ${SHOTS}`);
    log(`║  Report: ${reportPath}`);
    log('╚══════════════════════════════════════════════════════╝');
    
  } finally {
    await browser.close();
  }
}

main().catch(e => {
  console.error('❌ FATAL:', e.message);
  process.exit(1);
});
