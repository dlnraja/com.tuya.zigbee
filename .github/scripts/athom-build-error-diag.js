#!/usr/bin/env node
/**
 * athom-build-error-diag.js — Puppeteer diagnostic: extract REAL error from "Processing failed" builds
 * 
 * INSPIRED BY auto-promote-puppeteer.js:
 *  - Same login flow (doLogin pattern)
 *  - Same SPA navigation (spaNav pattern)
 *  - Same network request interception (captured token)
 *  - Same screenshot/dump pattern for debugging
 *  - Same snap() helper
 * 
 * PURPOSE: Navigate to each failing build, click SUBMISSION, extract the actual error message
 * Outputs a structured JSON report: build ID -> {status, error, errorType, rootCause, screenshot}
 * 
 * Usage:
 *   HOMEY_EMAIL=x HOMEY_PASSWORD=y node .github/scripts/athom-build-error-diag.js
 *   HOMEY_EMAIL=x HOMEY_PASSWORD=y node .github/scripts/athom-build-error-diag.js 2202
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8'));
const APP_ID   = APP_JSON.id || 'com.dlnraja.tuya.zigbee';
const APP_VER  = APP_JSON.version || 'unknown';
const TARGET_BUILD = process.argv[2] || null; // optional specific build ID

const BASE         = 'https://tools.developer.homey.app';
const BUILDS_URL   = `${BASE}/apps/app/${APP_ID}/versions`;
const EMAIL        = process.env.HOMEY_EMAIL;
const PASSWORD     = process.env.HOMEY_PASSWORD;
const SUM          = process.env.GITHUB_STEP_SUMMARY || null;
const REPORT_PATH  = path.join(__dirname,'..','..','screenshots','build-error-report.json');
const DRY          = process.env.DRY_RUN === 'true';

function log(m) { 
  console.log(m); 
  if (SUM) try { fs.appendFileSync(SUM, m+'\n'); } catch {} 
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function snap(page, name) {
  const dir = path.join(__dirname,'..','..','screenshots');
  fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${name}.png`);
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  log(`  [SNAP] ${p}`);
}

async function waitReady(page, label, ms = 5000) {
  await sleep(ms);
  try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 8000 }); } catch {}
  const len = await page.evaluate(() => document.body?.innerText?.length || 0);
  log(`  [wait:${label}] ${len} chars`);
}

// === Same login flow as auto-promote-puppeteer.js ===
async function doLogin(page) {
  log('[LOGIN] URL: ' + page.url());
  await waitReady(page, 'login-page', 5000);
  await snap(page, 'diag-01-login');

  const emailSelectors = ['input[type="email"]','input[name="email"]','input[name="username"]','#email'];
  let emailField = null;
  for (const s of emailSelectors) {
    try { emailField = await page.waitForSelector(s, {visible:true,timeout:5000}); if(emailField) break; } catch {}
  }
  if (!emailField) { log('[LOGIN] ❌ Email field not found'); return false; }
  
  await emailField.click({clickCount:3});
  await emailField.type(EMAIL, {delay:30});
  log('[LOGIN] Email entered');

  let pwField = null;
  for (const s of ['input[type="password"]','input[name="password"]','#password']) {
    try { pwField = await page.$(s); if(pwField) break; } catch {}
  }
  if (!pwField) {
    // Email-first flow
    const btn = await page.$('button[type="submit"]');
    if (btn) await btn.click(); else await page.keyboard.press('Enter');
    await page.waitForNavigation({waitUntil:'networkidle2',timeout:12000}).catch(() => {});
    await waitReady(page, 'after-email', 3000);
    for (const s of ['input[type="password"]','input[name="password"]']) {
      try { pwField = await page.waitForSelector(s, {visible:true,timeout:8000}); if(pwField) break; } catch {}
    }
  }
  if (!pwField) { log('[LOGIN] ❌ Password field not found'); return false; }

  await pwField.click({clickCount:3});
  await pwField.type(PASSWORD, {delay:30});
  const btn2 = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
  if (btn2) await btn2.click(); else await page.keyboard.press('Enter');
  log('[LOGIN] Submitted');

  try { await page.waitForNavigation({waitUntil:'networkidle2',timeout:30000}); } catch {}
  await waitReady(page, 'post-login', 5000);
  log('[LOGIN] Final URL: ' + page.url());
  return page.url().includes('tools.developer.homey.app');
}

// === Extract error message from build submission/detail page ===
async function extractBuildError(page) {
  const text = await page.evaluate(() => {
    // All visible text
    const body = document.body?.innerText || '';
    
    // Look for error indicators
    const errorEls = [...document.querySelectorAll('[class*="error"],[class*="Error"],[class*="alert"],[class*="warning"],[class*="failed"],[class*="fail"],[role="alert"]')];
    const errorTexts = errorEls.map(e => e.innerText?.trim()).filter(Boolean);
    
    // Look for log/console output
    const preEls = [...document.querySelectorAll('pre,code,[class*="log"],[class*="console"],[class*="output"],[class*="detail"]')];
    const logTexts = preEls.map(e => e.innerText?.trim()).filter(t => t && t.length > 10);
    
    // Look for specific error patterns in full text
    const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
    const errorLines = lines.filter(l => 
      /error|failed|invalid|reject|crash|exception|timeout|limit/i.test(l) ||
      /aggregateerror|processing failed|too large|file size/i.test(l)
    );
    
    return { 
      bodyText: body.slice(0, 5000),
      errorTexts,
      logTexts: logTexts.slice(0, 5),
      errorLines: errorLines.slice(0, 20),
      url: window.location.href,
    };
  });
  return text;
}

// === Classify the error type from extracted text ===
function classifyError(text, logData) {
  const combined = [
    logData?.bodyText || '',
    ...(logData?.errorTexts || []),
    ...(logData?.logTexts || []),
    ...(logData?.errorLines || []),
  ].join(' ').toLowerCase();
  
  if (/too large|file size|size limit|exceeds/i.test(combined)) 
    return { type: 'SIZE_LIMIT', fix: 'Reduce archive size — add missing files to .homeyignore' };
  if (/aggregateerror|aggregate error/i.test(combined)) 
    return { type: 'AGGREGATE_ERROR', fix: 'Check dual-layer drivers: add manufacturerName or fix Zigbee data' };
  if (/invalid image|image.*dimension|resolution/i.test(combined)) 
    return { type: 'INVALID_IMAGE', fix: 'Fix driver image dimensions (small=75x75, large=500x500)' };
  if (/invalid json|json.*parse|syntax.*error/i.test(combined)) 
    return { type: 'JSON_PARSE', fix: 'Fix malformed JSON in app.json or driver configs' };
  if (/bom|utf-8|encoding/i.test(combined)) 
    return { type: 'ENCODING', fix: 'Remove UTF-8 BOM from README/JSON files' };
  if (/manifest|app\.json/i.test(combined)) 
    return { type: 'MANIFEST', fix: 'Fix app.json structure' };
  if (/timeout|timed out/i.test(combined)) 
    return { type: 'TIMEOUT', fix: 'Athom server timeout — retry or reduce archive' };
  if (/processing failed/i.test(combined)) 
    return { type: 'PROCESSING_FAILED_UNKNOWN', fix: 'Unknown — check Athom logs or retry' };
  return { type: 'UNKNOWN', fix: 'No specific error pattern detected' };
}

async function main() {
  log('\n╔══════════════════════════════════════════════════════════════╗');
  log(`║  ATHOM BUILD ERROR DIAGNOSTIC (Puppeteer) — ${APP_ID}`);
  log(`║  v${APP_VER} | Target: ${TARGET_BUILD || 'ALL FAILED'} | ${new Date().toISOString()}`);
  log('╚══════════════════════════════════════════════════════════════╝\n');

  if (!EMAIL || !PASSWORD) {
    log('❌ HOMEY_EMAIL and HOMEY_PASSWORD required');
    log('   Set them as environment variables or GitHub Secrets');
    process.exit(1);
  }

  let puppeteer;
  try { puppeteer = require('puppeteer'); } catch {
    log('❌ puppeteer not installed. Run: npm install puppeteer --no-save');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const report = { timestamp: new Date().toISOString(), appId: APP_ID, version: APP_VER, builds: {} };

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // Intercept network to capture auth token (same as auto-promote-puppeteer.js)
    const captured = { token: null };
    page.on('request', req => {
      try {
        const auth = req.headers()['authorization'] || '';
        if (auth && req.url().includes('apps-api')) {
          captured.token = auth.replace(/^Bearer\s+/i,'');
          log(`  [NET] Token captured from: ${req.url().split('?')[0]}`);
        }
      } catch {}
    });

    // Step 1: Navigate to tools
    log('[STEP 1] Navigating to Developer Tools...');
    await page.goto(BASE, { waitUntil: 'networkidle2' });
    await waitReady(page, 'initial', 5000);
    await snap(page, 'diag-00-initial');

    // Step 2: Login if needed
    const pageText = await page.evaluate(() => document.body?.innerText || '');
    const needsLogin = page.url().includes('accounts.athom') || 
                       pageText.includes('LOG IN') || pageText.includes('Log in');
    
    if (needsLogin) {
      log('[STEP 2] Login required...');
      // Click LOG IN if in-page button
      if (pageText.includes('LOG IN') || pageText.includes('Log in')) {
        await page.evaluate(() => {
          const els = [...document.querySelectorAll('a, button')];
          const btn = els.find(e => /log\s*in|sign\s*in/i.test(e.textContent));
          if (btn) btn.click();
        });
        await page.waitForNavigation({waitUntil:'networkidle2',timeout:15000}).catch(() => {});
        await waitReady(page, 'after-login-click', 3000);
      }
      const ok = await doLogin(page);
      if (!ok) { log('❌ Login failed'); process.exit(1); }
    } else {
      log('[STEP 2] Already logged in');
    }

    // Step 3: Navigate to versions page (SPA navigation)
    log('[STEP 3] Navigating to builds/versions page...');
    // Direct deep-link (faster than SPA nav)
    await page.goto(BUILDS_URL, { waitUntil: 'networkidle2' });
    await waitReady(page, 'versions-page', 8000);
    await snap(page, 'diag-02-versions');
    log('  URL: ' + page.url());

    // Step 4: Extract build list from page
    log('[STEP 4] Extracting build list...');
    const builds = await page.evaluate(() => {
      const rows = [...document.querySelectorAll('tr, [class*="row"], [class*="build"], [class*="item"]')];
      return rows.map(row => {
        const text = row.innerText || '';
        const links = [...row.querySelectorAll('a')].map(a => ({ href: a.href, text: (a.textContent||'').trim() }));
        const hasFailed = /processing failed/i.test(text);
        const versionMatch = text.match(/\d+\.\d+\.\d+/);
        const buildIdMatch = text.match(/#?(\d{4,6})/);
        return {
          text: text.slice(0,200),
          version: versionMatch?.[0],
          buildId: buildIdMatch?.[1],
          failed: hasFailed,
          links,
        };
      }).filter(r => r.buildId || r.failed);
    });

    log(`  Found ${builds.length} build rows`);
    builds.forEach(b => log(`  Build ${b.buildId} v${b.version} failed=${b.failed}`));

    // Step 5: For each failed build, navigate to detail and extract error
    const failedBuilds = builds.filter(b => b.failed || TARGET_BUILD);
    const targetBuilds = TARGET_BUILD 
      ? failedBuilds.filter(b => b.buildId === TARGET_BUILD || builds.find(b2 => b2.buildId === TARGET_BUILD))
      : failedBuilds.slice(0, 5); // Limit to 5 most recent

    log(`\n[STEP 5] Investigating ${targetBuilds.length || 1} failed build(s)...`);

    // If no rows found via SPA, try API-style URL navigation
    const buildsToCheck = targetBuilds.length > 0 
      ? targetBuilds 
      : [{ buildId: TARGET_BUILD || '2202', version: APP_VER, failed: true, links: [] }];

    for (const build of buildsToCheck) {
      const bid = build.buildId;
      if (!bid) continue;
      log(`\n  --- Build #${bid} (v${build.version || '?'}) ---`);
      
      // Navigate to build detail via SUBMISSION link or direct URL
      const submissionLink = build.links?.find(l => /submission/i.test(l.text) || l.href?.includes('/build/'));
      const buildUrl = submissionLink?.href || `${BASE}/apps/app/${APP_ID}/build/${bid}`;
      
      log(`  Navigating to: ${buildUrl}`);
      await page.goto(buildUrl, { waitUntil: 'networkidle2' });
      await waitReady(page, `build-${bid}`, 8000);
      await snap(page, `diag-03-build-${bid}`);

      // Extract error info
      const errorData = await extractBuildError(page);
      const classification = classifyError(null, errorData);

      log(`  Status: ${classification.type}`);
      log(`  Fix: ${classification.fix}`);
      if (errorData.errorLines.length) {
        log(`  Error lines:`);
        errorData.errorLines.slice(0,5).forEach(l => log(`    - ${l}`));
      }
      if (errorData.errorTexts.length) {
        log(`  Error elements:`);
        errorData.errorTexts.slice(0,3).forEach(t => log(`    [ERR] ${t.slice(0,200)}`));
      }
      if (errorData.logTexts.length) {
        log(`  Log output:`);
        errorData.logTexts.slice(0,2).forEach(t => log(`    [LOG] ${t.slice(0,300)}`));
      }

      // Save HTML dump for deeper analysis
      const html = await page.evaluate(() => document.documentElement.outerHTML);
      const dumpDir = path.join(__dirname,'..','..','screenshots');
      fs.mkdirSync(dumpDir, { recursive: true });
      fs.writeFileSync(path.join(dumpDir, `build-${bid}-dump.html`), html);
      log(`  HTML dump saved: screenshots/build-${bid}-dump.html`);

      report.builds[bid] = {
        version: build.version,
        errorType: classification.type,
        fix: classification.fix,
        errorLines: errorData.errorLines.slice(0,10),
        errorTexts: errorData.errorTexts.slice(0,5),
        bodyText: errorData.bodyText.slice(0,2000),
        url: buildUrl,
        screenshot: `screenshots/diag-03-build-${bid}.png`,
        htmlDump: `screenshots/build-${bid}-dump.html`,
      };
    }

    // Step 6: Save report
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    log(`\n[REPORT] Saved to: ${REPORT_PATH}`);

    // Step 7: Summary
    log('\n╔══════════════════════════════════════════════════════════════╗');
    log('║  DIAGNOSTIC SUMMARY');
    log('╠══════════════════════════════════════════════════════════════╣');
    for (const [bid, info] of Object.entries(report.builds)) {
      log(`║  Build #${bid} (v${info.version || '?'}): ${info.errorType}`);
      log(`║    → ${info.fix}`);
    }
    log('╚══════════════════════════════════════════════════════════════╝');

  } finally {
    await browser.close();
  }
}

main().catch(e => { console.error('❌ FATAL:', e.message, '\n', e.stack); process.exit(1); });
