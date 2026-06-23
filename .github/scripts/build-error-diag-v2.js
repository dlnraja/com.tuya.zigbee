#!/usr/bin/env node
/**
 * build-error-diag-v2.js — lightweight build error diagnostic
 * ---------------------------------------------------------------
 * v1 (athom-build-error-diag.js) hangs on Puppeteer login (Athom dashboard
 * structure changes + 2FA/captcha). v2 tries API-first, Puppeteer-fallback:
 *
 * Tier 1 — API: getBuild + ALL fields + getCrashes + getApp (for buildQuota/
 *          validation errors exposed server-side). Dump everything we can.
 * Tier 2 — Puppeteer: if email/password set, attempt dashboard scrape with
 *          a HARD 90s overall cap + HTML dump (capture page even if login
 *          fails — the build-detail page may be partially public).
 *
 * Output: screenshots/build-error-report.json (machine-readable) + stdout.
 * Exit 0 always (diagnostic should never block CI).
 * ---------------------------------------------------------------
 */
'use strict';

const fs = require('fs');
const path = require('path');

const APP_ID = process.env.APP_ID || 'com.dlnraja.tuya.zigbee';
const BUILD_ID = process.env.BUILD_ID || process.argv[2] || '';
const HOMEY_EMAIL = process.env.HOMEY_EMAIL || '';
const HOMEY_PASSWORD = process.env.HOMEY_PASSWORD || '';
const SCREENSHOTS_DIR = path.join(process.cwd(), 'screenshots');

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function log(...a) { console.log('[diag-v2]', ...a); }
function logErr(...a) { console.error('[diag-v2]', ...a); }

const report = {
  timestamp: new Date().toISOString(),
  appId: APP_ID,
  buildId: BUILD_ID,
  tier1_api: null,
  tier2_puppeteer: null,
  rootCause: null,
};

// ─── Tier 1: API ──────────────────────────────────────────────────────────
async function tier1Api() {
  log('TIER 1: API diagnostic');
  let HOMEY_CLI_ROOT;
  try {
    HOMEY_CLI_ROOT = path.dirname(require.resolve('homey/package.json'));
  } catch {
    HOMEY_CLI_ROOT = 'C:/Users/HP/AppData/Roaming/npm/node_modules/homey';
  }
  const AthomApi = require(path.join(HOMEY_CLI_ROOT, 'services/AthomApi'));
  const AthomAppsAPI = require(path.join(HOMEY_CLI_ROOT, 'node_modules/homey-api/lib/AthomAppsAPI'));

  const token = await AthomApi.createDelegationToken({ audience: 'apps' });
  const api = new AthomAppsAPI({ token });

  // Auto-detect latest failed build if none specified.
  let targetBuild = BUILD_ID;
  if (!targetBuild) {
    const builds = await api.getBuilds({ $token: token, appId: APP_ID, query: { limit: 30 } });
    const list = Array.isArray(builds) ? builds : (builds.data || []);
    const failed = list.find(b => /failed|error|revoked/i.test(b.state));
    if (failed) { targetBuild = String(failed.id); report.buildId = targetBuild; log('auto-detected build #' + targetBuild); }
    else { log('no failed build found'); return; }
  }

  // Dump the FULL build object (every field — Athom may expose the error in
  // a field the high-level SDK doesn't surface by default).
  const build = await api.getBuild({ $token: token, appId: APP_ID, buildId: String(targetBuild) });
  const buildDump = {};
  for (const k of Object.keys(build).sort()) {
    buildDump[k] = build[k] === undefined ? 'UNDEFINED' : build[k];
  }
  report.tier1_api = { buildId: targetBuild, build: buildDump };

  // Highlight any field that looks like an error/feedback/validation message.
  const suspicious = {};
  for (const [k, v] of Object.entries(buildDump)) {
    const sv = String(v).toLowerCase();
    if (/error|fail|invalid|reject|feedback|validation|reason|message|exception|limit|quota|exceed/i.test(k) ||
        /error|fail|invalid|reject|exceed|quota|limit|not allowed|forbidden/i.test(sv)) {
      suspicious[k] = v;
    }
  }
  report.tier1_api.suspicious = suspicious;
  log('build fields:', Object.keys(buildDump).length, '| suspicious:', Object.keys(suspicious).join(',') || 'none');

  // Crashes endpoint (may carry runtime build errors).
  try {
    const crashes = await api.getCrashes({ $token: token, appId: APP_ID, buildId: String(targetBuild), query: {} });
    const arr = Array.isArray(crashes) ? crashes : (crashes?.data || []);
    report.tier1_api.crashes = arr.length;
    if (arr.length) log('crashes:', arr.length);
  } catch (e) { log('getCrashes:', e.message.slice(0, 60)); }

  // App-level quota / validation state.
  try {
    const app = await api.getApp({ $token: token, appId: APP_ID });
    const appKeys = Object.keys(app).filter(k => /quota|limit|validation|review|certification|block|suspend|flag/i.test(k));
    const appInfo = {};
    for (const k of appKeys) appInfo[k] = app[k];
    if (Object.keys(appInfo).length) { report.tier1_api.appFlags = appInfo; log('app flags:', JSON.stringify(appInfo).slice(0, 200)); }
  } catch (e) { log('getApp flags:', e.message.slice(0, 60)); }
}

// ─── Tier 2: Puppeteer (hard 90s cap + HTML dump) ─────────────────────────
async function tier2Puppeteer() {
  if (!HOMEY_EMAIL || !HOMEY_PASSWORD) { log('TIER 2: skipped (no HOMEY_EMAIL/PASSWORD)'); return; }
  log('TIER 2: Puppeteer dashboard scrape (90s hard cap)');
  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch { log('puppeteer not installed — skipping'); return; }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage();
  await page.setDefaultTimeout(10000);
  await page.setDefaultNavigationTimeout(15000);
  report.tier2_puppeteer = { steps: [] };

  // Hard overall cap: race against a 90s timer that force-closes.
  const deadline = Date.now() + 90000;
  const overTime = () => Date.now() > deadline;

  try {
    // Build-detail page (may be partially visible without login).
    const url = `https://developer.homey.app/apps/app/${APP_ID}/build/${report.buildId}`;
    log('navigating:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `diag-build-${report.buildId}.png`), fullPage: false }).catch(() => {});

    // Capture page text + any error-looking elements.
    const pageText = await page.evaluate(() => document?.body?.innerText?.slice(0, 5000) || '').catch(() => '');
    report.tier2_puppeteer.pageText = pageText.slice(0, 2000);

    // Try login if we see a login form.
    const emailField = await page.$('input[type=email], input[name=email], input[name=username]').catch(() => null);
    if (emailField && !overTime()) {
      log('login form detected — attempting email/password');
      await emailField.type(HOMEY_EMAIL).catch(() => {});
      const pwField = await page.$('input[type=password]').catch(() => null);
      if (pwField) {
        await pwField.type(HOMEY_PASSWORD).catch(() => {});
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
          page.keyboard.press('Enter').catch(() => {}),
        ]);
        await page.waitForTimeout(4000);
        await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForTimeout(3000);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `diag-build-${report.buildId}-after-login.png`), fullPage: false }).catch(() => {});
        const afterLoginText = await page.evaluate(() => document?.body?.innerText?.slice(0, 5000) || '').catch(() => '');
        report.tier2_puppeteer.afterLoginText = afterLoginText.slice(0, 2000);
      }
    }

    // Save raw HTML for offline inspection.
    const html = await page.content().catch(() => '');
    fs.writeFileSync(path.join(SCREENSHOTS_DIR, `diag-build-${report.buildId}.html`), html);
    report.tier2_puppeteer.htmlBytes = html.length;
    log('Puppeteer done. HTML bytes:', html.length);
  } catch (e) {
    report.tier2_puppeteer.error = e.message;
    logErr('puppeteer error:', e.message.slice(0, 100));
  } finally {
    await browser.close().catch(() => {});
  }
}

(async () => {
  log('=== Build Error Diagnostic v2 ===');
  log('app:', APP_ID, '| build:', BUILD_ID || '(auto-detect)', '| email:', HOMEY_EMAIL ? 'set' : 'unset');

  try { await tier1Api(); } catch (e) { report.tier1_api = { error: e.message }; logErr('tier1 failed:', e.message.slice(0, 100)); }
  try { await tier2Puppeteer(); } catch (e) { report.tier2_puppeteer = { error: e.message }; logErr('tier2 failed:', e.message.slice(0, 100)); }

  // Best-effort root cause guess from gathered data.
  const allText = JSON.stringify(report).toLowerCase();
  if (/not allowed|forbidden|permission|unauthorized|banned|suspend/i.test(allText)) report.rootCause = 'ACCOUNT/PERMISSION BLOCK';
  else if (/quota|limit|exceed|too many|rate/i.test(allText)) report.rootCause = 'QUOTA/RATE LIMIT';
  else if (/sdk|sdkversion|manifest|invalid version/i.test(allText)) report.rootCause = 'MANIFEST/SDK ISSUE';
  else if (/size|large|big|byte|mb/i.test(allText)) report.rootCause = 'ARCHIVE SIZE';
  else if (report.tier2_puppeteer?.afterLoginText || report.tier2_puppeteer?.pageText) report.rootCause = 'SEE DASHBOARD TEXT (review manually)';
  else report.rootCause = 'UNKNOWN (API exposes no error; dashboard scrape inconclusive)';

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'build-error-report.json'), JSON.stringify(report, null, 2));
  log('=== ROOT CAUSE GUESS:', report.rootCause, '===');
  log('Report written to screenshots/build-error-report.json');
  process.exit(0); // never block CI
})();
