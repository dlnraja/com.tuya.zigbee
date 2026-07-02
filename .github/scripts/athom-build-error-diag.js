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

let APP_JSON = {};
try { APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')); } catch(e) {}
const APP_ID   = process.env.TARGET_APP_ID || APP_JSON.id || 'com.dlnraja.tuya.zigbee';
const APP_VER  = APP_JSON.version || 'unknown';
const TARGET_BUILD = process.argv[2] || null; // optional specific build ID

const BASE         = 'https://tools.developer.homey.app';
const BUILDS_URL   = `${BASE}/apps/app/${APP_ID}/versions`;
const EMAIL        = process.env.HOMEY_EMAIL;
const PASSWORD     = process.env.HOMEY_PASSWORD;
const SUM          = process.env.GITHUB_STEP_SUMMARY || null;
const REPORT_PATH  = path.join(__dirname,'..','..','screenshots','build-error-report.json');
const DRY          = process.env.DRY_RUN === 'true';
const NAV_TIMEOUT_MS = Math.max(30000, Number(process.env.HOMEY_DIAG_NAV_TIMEOUT_MS || process.env.DIAG_NAV_TIMEOUT_MS || 90000) || 90000);

function log(m) {
  console.log(m);
  // ponytail: SUMMARY_APPEND - best-effort; failure is non-fatal for a diagnostic script
  if (SUM) try { fs.appendFileSync(SUM, m+'\n'); } catch { /* ponytail: best-effort summary */ }
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
  // ponytail: NETWORK_IDLE - timeout is expected for slow loads; non-fatal
  try { await page.waitForNetworkIdle({ idleTime: 1500, timeout: 8000 }); } catch { /* ponytail: timeout OK */ }
  const len = await safeEvaluate(page, label, () => document.body?.innerText?.length || 0, 0);
  log(`  [wait:${label}] ${len} chars`);
}

async function safeEvaluate(page, label, fn, fallback) {
  try {
    return await page.evaluate(fn);
  } catch (err) {
    log(`  [EVAL] ${label} warning: ${err.message}`);
    return fallback;
  }
}

async function setPageTimeouts(page) {
  if (!page) return;
  try { page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS); } catch { /* best-effort */ }
  try { page.setDefaultTimeout(Math.min(NAV_TIMEOUT_MS, 60000)); } catch { /* best-effort */ }
}

async function gotoBestEffort(page, url, label) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    return true;
  } catch (err) {
    log(`  [NAV] ${label} navigation warning: ${err.message}`);
    try { await page.evaluate(() => window.stop()); } catch { /* best-effort */ }
    try {
      const client = typeof page._client === 'function' ? page._client() : null;
      await client?.send?.('Page.stopLoading');
    } catch { /* best-effort */ }
    await waitReady(page, `${label}-after-timeout`, 5000).catch(() => {});
    return false;
  }
}

// === Same login flow as auto-promote-puppeteer.js ===
async function doLogin(page) {
  log('[LOGIN] URL: ' + page.url());
  await waitReady(page, 'login-page', 5000);
  await snap(page, 'diag-01-login');

  const emailSelectors = ['input[type="email"]','input[name="email"]','input[name="username"]','#email'];
  let emailField = null;
  for (const s of emailSelectors) {
    // ponytail: SELECTOR_PROBE - try multiple selectors, timeout means "not found"
    try { emailField = await page.waitForSelector(s, {visible:true,timeout:5000}); if(emailField) break; } catch { /* ponytail: probe */ }
  }
  if (!emailField) { log('[LOGIN] ❌ Email field not found'); return false; }
  
  await emailField.click({clickCount:3});
  await emailField.type(EMAIL, {delay:30});
  log('[LOGIN] Email entered');

  let pwField = null;
  for (const s of ['input[type="password"]','input[name="password"]','#password']) {
    // ponytail: SELECTOR_PROBE - $() never throws, catch is defensive
    try { pwField = await page.$(s); if(pwField) break; } catch { /* ponytail: defensive */ }
  }
  if (!pwField) {
    // Email-first flow
    const btn = await page.$('button[type="submit"]');
    if (btn) await btn.click(); else await page.keyboard.press('Enter');
    await page.waitForNavigation({waitUntil:'networkidle2',timeout:12000}).catch(() => {});
    await waitReady(page, 'after-email', 3000);
    for (const s of ['input[type="password"]','input[name="password"]']) {
      // ponytail: SELECTOR_PROBE - timeout means "not found"
      try { pwField = await page.waitForSelector(s, {visible:true,timeout:8000}); if(pwField) break; } catch { /* ponytail: probe */ }
    }
  }
  if (!pwField) { log('[LOGIN] ❌ Password field not found'); return false; }

  await pwField.click({clickCount:3});
  await pwField.type(PASSWORD, {delay:30});
  const btn2 = await page.$('button[type="submit"]') || await page.$('input[type="submit"]');
  if (btn2) await btn2.click(); else await page.keyboard.press('Enter');
  log('[LOGIN] Submitted');

  // ponytail: NAVIGATION_WAIT - SPA may already be navigated; non-fatal
  try { await page.waitForNavigation({waitUntil:'networkidle2',timeout:30000}); } catch { /* ponytail: already navigated */ }
  await waitReady(page, 'post-login', 5000);
  log('[LOGIN] Final URL: ' + page.url());
  return page.url().includes('tools.developer.homey.app');
}

// === Extract error message from build submission/detail page ===
async function extractBuildError(page) {
  const text = await safeEvaluate(page, 'extract-build-error', () => {
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
  }, {
    bodyText: '',
    errorTexts: [],
    logTexts: [],
    errorLines: [],
    url: '',
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

  // Determine the target build. If none provided, auto-detect the latest
  // processing_failed build via the Athom Apps API (no Puppeteer needed for that).
  let targetBuild = TARGET_BUILD;
  let targetBuildInfo = null;
  if (!targetBuild) {
    log('[STEP 0] No build ID provided — auto-detecting latest failed build via API...');
    try {
      const HOMEY_CLI_ROOT = require('path').join(__dirname, '..', '..');
      const AthomApi = require(require('path').join(HOMEY_CLI_ROOT, 'node_modules', 'homey', 'services', 'AthomApi'));
      const AthomAppsAPI = require(require('path').join(HOMEY_CLI_ROOT, 'node_modules', 'homey-api', 'lib', 'AthomAppsAPI'));
      const token = await AthomApi.createDelegationToken({ audience: 'apps' });
      const api = new AthomAppsAPI({ token });
      const builds = await api.getBuilds({ $token: token, appId: APP_ID, query: { limit: 50 } });
      const list = Array.isArray(builds) ? builds : (builds.data || builds || []);
      const failed = list.find(b => b.state === 'processing_failed' || b.state === 'error' || b.state === 'revoked');
      if (failed) {
        targetBuild = String(failed.id || failed.buildId);
        targetBuildInfo = failed;
        log(`[STEP 0] Auto-detected latest failed build: #${targetBuild} (state=${failed.state}, v${failed.version})`);
      } else {
        log('[STEP 0] No failed build found in last 50 — nothing to diagnose.');
        return;
      }
    } catch (apiErr) {
      log(`[STEP 0] API auto-detect failed: ${apiErr.message}`);
      log('[STEP 0] Pass a build ID explicitly: node athom-build-error-diag.js <buildId>');
      return;
    }
  }

  const report = { timestamp: new Date().toISOString(), appId: APP_ID, version: APP_VER, builds: {} };

  let browser, page;
  try {
    // Try CLI session injection first (works on Windows local where `homey login` ran).
    // Fall back to email/password login on CI runners (no CLI settings.json).
    let sessionCtx = null;
    try {
      const { launchWithSession } = require('./athom-session-inject');
      sessionCtx = await launchWithSession({
        headless: 'new',
        launchOptions: {
          defaultViewport: { width: 1280, height: 900 },
          protocolTimeout: NAV_TIMEOUT_MS + 30000,
        }
      });
      browser = sessionCtx.browser;
      page = sessionCtx.page;
      await setPageTimeouts(page);
      log('[STEP 1] CLI session injected — browser launched.');
    } catch (sessionErr) {
      log(`[STEP 1] CLI session unavailable (${sessionErr.message.split('\n')[0]}). Falling back to email/password login.`);
      const puppeteer = require('puppeteer');
      browser = await puppeteer.launch({
        headless: 'new',
        protocolTimeout: NAV_TIMEOUT_MS + 30000,
        defaultViewport: { width: 1280, height: 900 },
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      page = await browser.newPage();
      await setPageTimeouts(page);
      await gotoBestEffort(page, `${BASE}/apps/app/${APP_ID}/versions`, 'versions');
      const loggedIn = await doLogin(page);
      if (!loggedIn) { log('[LOGIN] ❌ Login failed — check HOMEY_EMAIL/HOMEY_PASSWORD secrets'); return; }
      log('[STEP 1] Email/password login successful.');
    }
    await waitReady(page, 'initial', 5000);
    await snap(page, 'diag-00-initial');

    const bid = targetBuild;
    const buildUrl = `${BASE}/apps/app/${APP_ID}/build/${bid}`;

      log(`  Navigating to: ${buildUrl}`);
      await gotoBestEffort(page, buildUrl, `build-${bid}`);
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
      const html = await safeEvaluate(page, `html-dump-${bid}`, () => document.documentElement.outerHTML, '<html><body>HTML dump unavailable</body></html>');
      const dumpDir = path.join(__dirname,'..','..','screenshots');
      fs.mkdirSync(dumpDir, { recursive: true });
      fs.writeFileSync(path.join(dumpDir, `build-${bid}-dump.html`), html);
      log(`  HTML dump saved: screenshots/build-${bid}-dump.html`);

      report.builds[bid] = {
        version: targetBuildInfo?.version || APP_VER,
        currentAppVersion: APP_VER,
        state: targetBuildInfo?.state || null,
        createdAt: targetBuildInfo?.createdAt || targetBuildInfo?.created_at || null,
        stateChangedAt: targetBuildInfo?.stateChangedAt || targetBuildInfo?.state_changed_at || null,
        errorType: classification.type,
        fix: classification.fix,
        errorLines: errorData.errorLines.slice(0,10),
        errorTexts: errorData.errorTexts.slice(0,5),
        bodyText: errorData.bodyText.slice(0,2000),
        url: buildUrl,
        screenshot: `screenshots/diag-03-build-${bid}.png`,
        htmlDump: `screenshots/build-${bid}-dump.html`,
      };

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
