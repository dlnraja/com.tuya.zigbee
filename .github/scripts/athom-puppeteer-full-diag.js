#!/usr/bin/env node
/**
 * athom-puppeteer-full-diag.js
 * 
 * FULL DIAGNOSTIC: 
 *  1. Injects CLI session → auto-login (no email/password needed)
 *  2. Navigates to builds page, captures network tokens from SPA requests
 *  3. Clicks each failing build → captures AggregateError popup text
 *  4. Navigates to submission page → captures full detail text
 *  5. Finds archive download URL from SPA network requests
 *  6. Downloads archives for comparison
 *  7. Compares good build vs bad build manifests
 * 
 * Based on: auto-promote-puppeteer.js + draft-to-test.yml patterns
 */
'use strict';

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');

let APP_JSON = {};
try { APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')); } catch(e) {}
const APP_ID   = process.env.TARGET_APP_ID || APP_JSON.id || 'com.dlnraja.tuya.zigbee';
const APP_VER  = APP_JSON.version || 'unknown';

const GOOD_BUILD = process.argv[2] || '2159';
const BAD_BUILD  = process.argv[3] || '2204';
const DO_DL      = process.argv.includes('--download');

const BASE        = 'https://tools.developer.homey.app';
const SHOTS_DIR   = path.join(__dirname,'..','..','screenshots');
const REPORT_PATH = path.join(SHOTS_DIR,'full-diag-report.json');
const SUM         = process.env.GITHUB_STEP_SUMMARY || null;

function log(m) { console.log(m); if(SUM) try{fs.appendFileSync(SUM,m+'\n');}catch{} }
const sleep = ms => new Promise(r => setTimeout(r, ms));

fs.mkdirSync(SHOTS_DIR, {recursive:true});

async function snap(page, name) {
  const p = path.join(SHOTS_DIR, name+'.png');
  await page.screenshot({path:p, fullPage:true}).catch(()=>{});
}

async function waitNet(page, label, ms=5000) {
  await sleep(ms);
  try { await page.waitForNetworkIdle({idleTime:1500, timeout:8000}); } catch {}
  const len = await page.evaluate(()=>document.body?.innerText?.length||0);
  log(`  [${label}] ${len}c`);
}

// ===========================================================
// AUTO-LOGIN via CLI session injection
// ===========================================================
async function autoLogin(page, captured) {
  log('[AUTH] Injecting CLI session...');
  
  // Read CLI session
  const settingsPath = path.join(process.env.APPDATA||'','athom-cli','settings.json');
  if (!fs.existsSync(settingsPath)) {
    log('[AUTH] CLI session not found; trying HOMEY_EMAIL/HOMEY_PASSWORD...');
    if (process.env.HOMEY_EMAIL && process.env.HOMEY_PASSWORD) {
      return await doManualLogin(page, captured);
    }
    log('[AUTH] ❌ No credentials available. Set HOMEY_EMAIL/HOMEY_PASSWORD or run: homey login');
    return false;
  }
  
  const settings = JSON.parse(fs.readFileSync(settingsPath,'utf8'));
  const cliToken = settings.homeyApi?.token?.access_token;
  if (!cliToken) { log('[AUTH] ❌ No CLI token'); return false; }
  
  // Navigate to base URL first
  await page.goto(BASE, {waitUntil:'domcontentloaded'});
  await sleep(2000);
  
  // Inject into localStorage (Athom SPA checks various keys)
  await page.evaluate((tok) => {
    try { localStorage.setItem('_token', tok); } catch {}
    try { localStorage.setItem('token', tok); } catch {}
    try { localStorage.setItem('homeyApiToken', tok); } catch {}
    try { document.cookie = 'token='+tok+'; path=/'; } catch {}
  }, cliToken);
  
  // Hard-refresh and let SPA pick up the session
  await page.goto(BASE, {waitUntil:'networkidle2'});
  await waitNet(page, 'post-inject', 5000);
  
  const pageText = await page.evaluate(()=>document.body?.innerText||'');
  const loggedIn = !(/log\s*in|sign\s*in/i.test(pageText)) || pageText.includes('Dylan') || pageText.includes(APP_ID);
  
  if (!loggedIn) {
    log('[AUTH] Injection did not work — falling back to manual credential check...');
    // Check env credentials
    if (process.env.HOMEY_EMAIL && process.env.HOMEY_PASSWORD) {
      log('[AUTH] Using HOMEY_EMAIL/HOMEY_PASSWORD from env...');
      return await doManualLogin(page, captured);
    }
    log('[AUTH] ❌ No credentials available. Set HOMEY_EMAIL/HOMEY_PASSWORD or run: homey login');
    return false;
  }
  
  log('[AUTH] ✅ Auto-login successful (CLI session injected)');
  return true;
}

async function doManualLogin(page, captured) {
  const EMAIL = process.env.HOMEY_EMAIL;
  const PASSWORD = process.env.HOMEY_PASSWORD;
  
  // Click LOG IN if visible
  await page.evaluate(()=>{
    const btn = [...document.querySelectorAll('a,button')].find(e=>/log\s*in|sign\s*in/i.test(e.textContent));
    if (btn) btn.click();
  });
  await page.waitForNavigation({waitUntil:'networkidle2',timeout:12000}).catch(()=>{});
  await waitNet(page,'pre-login',3000);
  
  const selEmail = ['input[type="email"]','input[name="email"]','#email'];
  let ef = null;
  for (const s of selEmail) { try { ef = await page.waitForSelector(s,{visible:true,timeout:4000}); if(ef) break; } catch {} }
  if (!ef) return false;
  await ef.click({clickCount:3}); await ef.type(EMAIL,{delay:25});
  
  let pf = null;
  for (const s of ['input[type="password"]','input[name="password"]','#password']) { try { pf = await page.$(s); if(pf) break; } catch {} }
  if (!pf) {
    const b = await page.$('button[type="submit"]'); if(b) await b.click(); else await page.keyboard.press('Enter');
    await page.waitForNavigation({waitUntil:'networkidle2',timeout:12000}).catch(()=>{});
    await waitNet(page,'email-first',3000);
    for (const s of ['input[type="password"]','input[name="password"]']) { try { pf = await page.waitForSelector(s,{visible:true,timeout:8000}); if(pf) break; } catch {} }
  }
  if (!pf) return false;
  await pf.click({clickCount:3}); await pf.type(PASSWORD,{delay:25});
  const sb = await page.$('button[type="submit"]'); if(sb) await sb.click(); else await page.keyboard.press('Enter');
  try { await page.waitForNavigation({waitUntil:'networkidle2',timeout:30000}); } catch {}
  await waitNet(page,'post-login',5000);
  return page.url().includes('tools.developer.homey.app');
}

// ===========================================================
// NAVIGATE TO BUILD + EXTRACT ALL INFO
// ===========================================================
async function analyzeBuild(page, buildId, captured) {
  const result = { buildId, popup: null, submissionText: null, archiveUrl: null, headings: [], errors: [], bodyLen: 0 };
  
  // Direct URL to build
  const buildUrl = `${BASE}/apps/app/${APP_ID}/build/${buildId}`;
  log(`\n[BUILD ${buildId}] Navigating to ${buildUrl}`);
  
  await page.goto(buildUrl, {waitUntil:'networkidle2'});
  await waitNet(page, `build-${buildId}`, 8000);
  await snap(page, `full-${buildId}-main`);
  
  result.mainUrl = page.url();
  const mainText = await page.evaluate(()=>document.body?.innerText||'');
  result.bodyLen = mainText.length;
  log(`  Page: ${result.bodyLen}c | URL: ${result.mainUrl}`);
  
  // Check for "Processing failed" indicator
  result.hasFailed = /processing.?failed/i.test(mainText);
  result.hasAggregateError = /aggregateerror/i.test(mainText);
  
  // ==== CLICK RED TRIANGLE → get popup ====
  log(`  [POPUP] Trying to click error indicator...`);
  const clicked = await page.evaluate(() => {
    // Strategy 1: MUI Alert/Error icons (Athom uses Material UI)
    const muiSelectors = [
      '.MuiAlert-root', '.MuiAlert-standardError', '[class*="MuiAlert"]',
      '[class*="error"][class*="icon"]', '[class*="Error"][class*="Icon"]',
      'svg[data-testid="ErrorIcon"]', 'svg[data-testid="WarningIcon"]',
      '[data-testid*="error"]', '[data-testid*="Error"]',
    ];
    for (const sel of muiSelectors) {
      const el = document.querySelector(sel);
      if (el) { el.click(); return `MUI: ${sel}`; }
    }
    
    // Strategy 2: Any clickable element with "Processing failed" or error text nearby
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    while (walker.nextNode()) {
      const el = walker.currentNode;
      const text = el.textContent || '';
      if (/processing.?failed|aggregateerror/i.test(text) && text.length < 200) {
        el.click();
        return `Text match: ${text.trim().slice(0,50)}`;
      }
    }
    
    // Strategy 3: Triangle/warning SVGs
    const svgs = [...document.querySelectorAll('svg')];
    for (const svg of svgs) {
      const p = svg.parentElement;
      if (!p) continue;
      const cls = (p.className?.toString()||'').toLowerCase();
      if (/error|warning|danger|failed/.test(cls)) {
        p.click();
        return `SVG parent: ${cls.slice(0,40)}`;
      }
    }
    return null;
  });
  
  if (clicked) {
    log(`  Clicked: ${clicked}`);
    await sleep(2000);
    await snap(page, `full-${buildId}-popup`);
    
    // Extract popup content
    result.popup = await page.evaluate(() => {
      const selectors = [
        '[role="dialog"]', '[role="alert"]', '[role="tooltip"]',
        '.MuiDialog-root', '.MuiPopover-root', '.MuiSnackbar-root',
        '[class*="modal"]', '[class*="popup"]', '[class*="tooltip"]',
        '[class*="snackbar"]', '[class*="toast"]',
      ];
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.innerText?.trim()) return el.innerText.trim().slice(0,2000);
      }
      // Scan all elements for AggregateError text
      const all = [...document.querySelectorAll('*')];
      for (const el of all) {
        if (/AggregateError/i.test(el.innerText||'') && el.innerText.length < 3000) {
          return el.innerText.trim().slice(0,2000);
        }
      }
      return null;
    });
    
    if (result.popup) {
      log(`  POPUP: ${result.popup.slice(0,200)}`);
    }
  }
  
  // ==== FIND SUBMISSION LINK + NAVIGATE ====
  log(`  [SUBMISSION] Looking for SUBMISSION link...`);
  const submissionHref = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const sub = links.find(l => /submission/i.test(l.textContent) || /submission|\/submit/i.test(l.href));
    return sub?.href || null;
  });
  
  const submissionUrl = submissionHref || `${BASE}/apps/app/${APP_ID}/build/${buildId}/submission`;
  log(`  Submission URL: ${submissionUrl}`);
  
  await page.goto(submissionUrl, {waitUntil:'networkidle2'});
  await waitNet(page, `submission-${buildId}`, 8000);
  await snap(page, `full-${buildId}-submission`);
  
  const subText = await page.evaluate(() => document.body?.innerText||'');
  result.submissionText = subText;
  result.submissionLen = subText.length;
  
  // Extract headings and structure
  result.headings = await page.evaluate(() => 
    [...document.querySelectorAll('h1,h2,h3,h4,label,[class*="label"],[class*="heading"]')]
      .map(e => e.innerText?.trim())
      .filter(t => t && t.length > 2 && t.length < 100)
      .slice(0,30)
  );
  
  // Extract error elements
  result.errors = await page.evaluate(() => 
    [...document.querySelectorAll('[class*="error"],[class*="Error"],[role="alert"],[class*="warning"]')]
      .map(e => e.innerText?.trim())
      .filter(t => t && t.length > 2)
      .slice(0,10)
  );
  
  log(`  Submission: ${result.submissionLen}c`);
  log(`  Headings: ${result.headings.slice(0,5).join(' | ')}`);
  if (result.errors.length) log(`  Errors: ${result.errors[0]?.slice(0,100)}`);
  
  // Save HTML
  const html = await page.evaluate(()=>document.documentElement.outerHTML);
  fs.writeFileSync(path.join(SHOTS_DIR,`build-${buildId}-submission.html`), html);
  
  // ==== FIND ARCHIVE URL from network captures ====
  if (captured.archiveUrls.length > 0) {
    result.archiveUrl = captured.archiveUrls.find(u => u.includes(buildId)) 
      || captured.archiveUrls[0];
    log(`  Archive URL: ${result.archiveUrl}`);
  }
  
  // Also check page links for .tgz or download
  const dlUrl = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a')];
    const dl = links.find(l => /\.tgz|\.tar\.gz|download|archive/i.test(l.href));
    return dl?.href || null;
  });
  if (dlUrl) { result.archiveUrl = dlUrl; log(`  Download link: ${dlUrl}`); }
  
  return result;
}

// ===========================================================
// DOWNLOAD ARCHIVE
// ===========================================================
async function downloadArchive(url, dest, token) {
  return new Promise((resolve, reject) => {
    log(`  [DL] ${url} → ${dest}`);
    const headers = token ? {'Authorization':`Bearer ${token}`} : {};
    const proto = url.startsWith('https') ? https : http;
    proto.get(url, {headers}, res => {
      if ([301,302,307,308].includes(res.statusCode)) {
        return downloadArchive(res.headers.location, dest, null).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`)); return;
      }
      const out = fs.createWriteStream(dest);
      res.pipe(out);
      out.on('finish', () => { out.close(); resolve(dest); });
      out.on('error', reject);
    }).on('error', reject);
  });
}

// ===========================================================
// COMPARE GOOD vs BAD
// ===========================================================
function compare(good, bad) {
  const report = { rootCauses: [], differences: [] };
  
  // Submission page length diff
  const lenDiff = (good.submissionLen||0) - (bad.submissionLen||0);
  if (lenDiff > 200) {
    report.differences.push({
      type: 'MISSING_TEXT', 
      desc: `Submission page: good=${good.submissionLen}c, bad=${bad.submissionLen}c (missing ${lenDiff}c)`,
    });
  }
  
  // AggregateError in popup
  if (bad.popup) {
    report.rootCauses.push(`AggregateError popup: ${bad.popup.slice(0,500)}`);
  }
  
  // Missing headings
  const goodH = new Set(good.headings||[]);
  const badH  = new Set(bad.headings||[]);
  const missingH = [...goodH].filter(h => !badH.has(h));
  if (missingH.length) {
    report.differences.push({ type:'MISSING_HEADINGS', items: missingH });
  }
  
  return report;
}

// ===========================================================
// MAIN
// ===========================================================
async function main() {
  log('\n╔══════════════════════════════════════════════════════════════╗');
  log(`║  ATHOM PUPPETEER FULL DIAG — ${APP_ID}`);
  log(`║  Good: #${GOOD_BUILD} | Bad: #${BAD_BUILD} | Download: ${DO_DL}`);
  log('╚══════════════════════════════════════════════════════════════╝\n');
  
  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch {
    log('❌ puppeteer not installed'); process.exit(1);
  }
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 1024 },
  });
  
  const report = { timestamp: new Date().toISOString(), good:{}, bad:{}, comparison:{} };
  
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // Network capture (same pattern as auto-promote-puppeteer.js)
    const captured = { token: null, archiveUrls: [], allUrls: [] };
    page.on('request', req => {
      try {
        const u = req.url();
        const auth = req.headers()['authorization'] || '';
        if (auth && u.includes('apps-api')) {
          captured.token = auth.replace(/^Bearer\s+/i,'');
          log(`  [NET] Token from req: ${u.split('?')[0].slice(-50)}`);
        }
        if (/\.tgz|\.tar\.gz|archive/i.test(u)) {
          captured.archiveUrls.push(u);
          log(`  [NET] Archive URL: ${u.slice(0,100)}`);
        }
        captured.allUrls.push(u);
      } catch {}
    });
    page.on('response', async res => {
      try {
        const u = res.url();
        if (u.includes('/build/') && u.includes('apps-api')) {
          const j = await res.json().catch(()=>null);
          if (j?.archiveUrl) { captured.archiveUrls.push(j.archiveUrl); log(`  [NET] archiveUrl from resp: ${j.archiveUrl}`); }
        }
      } catch {}
    });
    
    // Auth
    log('=== STEP 1: Authentication ===');
    const ok = await autoLogin(page, captured);
    if (!ok) { log('❌ Auth failed'); process.exit(1); }
    await snap(page, 'full-00-authed');
    log(`  Current URL: ${page.url()}`);
    
    // Analyze builds
    log('\n=== STEP 2: Analyze GOOD build #' + GOOD_BUILD + ' ===');
    report.good = await analyzeBuild(page, GOOD_BUILD, captured);
    
    log('\n=== STEP 3: Analyze BAD build #' + BAD_BUILD + ' ===');
    report.bad  = await analyzeBuild(page, BAD_BUILD, captured);
    
    // Download archives
    if (DO_DL) {
      log('\n=== STEP 4: Download archives ===');
      for (const [label, data] of [['good', report.good], ['bad', report.bad]]) {
        if (data.archiveUrl) {
          const dest = path.join(SHOTS_DIR, `archive-${data.buildId}-${label}.tgz`);
          try {
            await downloadArchive(data.archiveUrl, dest, captured.token);
            data.localArchive = dest;
            log(`  ✅ ${label} archive: ${dest}`);
          } catch(e) { log(`  ❌ ${label} archive error: ${e.message}`); }
        } else {
          log(`  ⚠️  No archive URL for ${label} build #${data.buildId}`);
        }
      }
    }
    
    // Compare
    log('\n=== STEP 5: Comparison ===');
    report.comparison = compare(report.good, report.bad);
    
    log('\n--- Root Causes ---');
    report.comparison.rootCauses.forEach(c => log(`  🔴 ${c}`));
    log('\n--- Differences ---');
    report.comparison.differences.forEach(d => log(`  ⚠️  [${d.type}] ${d.desc || JSON.stringify(d.items?.slice(0,3))}`));
    
    // Save report
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    log(`\n[REPORT] ${REPORT_PATH}`);
    log(`[SCREENSHOTS] ${SHOTS_DIR}`);
    
    // Final summary
    log('\n╔══════════════════════════════════════════════════════════════╗');
    log('║  SUMMARY');
    log(`║  Good #${GOOD_BUILD}: ${report.good.submissionLen}c, hasFailed=${report.good.hasFailed}`);
    log(`║  Bad  #${BAD_BUILD}: ${report.bad.submissionLen}c, hasFailed=${report.bad.hasFailed}`);
    if (report.bad.popup) log(`║  Popup: ${report.bad.popup.slice(0,80)}...`);
    log('╚══════════════════════════════════════════════════════════════╝');
    
  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('❌ FATAL:', e.message, '\n', e.stack); process.exit(1); });
