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

function readAppJson() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
  } catch {
    return {};
  }
}

const APP_JSON = readAppJson();
const APP_ID = process.env.TARGET_APP_ID || process.env.APP_ID || APP_JSON.id || 'com.dlnraja.tuya.zigbee';
const APP_VER = APP_JSON.version || 'unknown';
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
  version: APP_VER,
  buildId: BUILD_ID,
  noFailedBuildFound: false,
  tier1_api: null,
  tier2_puppeteer: null,
  rootCause: null,
};

function summarizeBuild(build) {
  if (!build) return null;
  return {
    id: build.id || build.buildId || null,
    version: build.version || null,
    state: build.state || null,
    stateMeta: build.stateMeta || build.state_meta || build.error || build.errorMessage || build.feedback || null,
    createdAt: build.createdAt || build.created_at || null,
    stateChangedAt: build.stateChangedAt || build.state_changed_at || null,
    sdk: build.sdk ?? null,
    size: build.size || null,
  };
}

function summarizeLocalizedTextMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const languages = {};
  let totalChars = 0;
  for (const [lang, text] of Object.entries(value)) {
    const len = typeof text === 'string' ? text.length : JSON.stringify(text || '').length;
    languages[lang] = len;
    totalChars += len;
  }
  return { languages, totalChars };
}

function sanitizeForReport(key, value, depth = 0) {
  const lower = String(key || '').toLowerCase();
  if (/token|secret|password|authorization|cookie|credential|session/.test(lower)) return '[REDACTED]';
  if (/url|uri|link/.test(lower)) return value ? '[URL_REDACTED]' : value;
  if (lower === 'env') {
    if (!value || typeof value !== 'object') return value ? '[REDACTED]' : value;
    return Object.fromEntries(Object.keys(value).map((envKey) => [envKey, '[REDACTED]']));
  }
  if (lower === 'readme' || lower === 'changelog') return summarizeLocalizedTextMap(value);
  if (typeof value === 'string') {
    if (/^https?:\/\//i.test(value)) return '[URL_REDACTED]';
    return value.length > 500 ? `${value.slice(0, 500)}...[truncated ${value.length - 500} chars]` : value;
  }
  if (!value || typeof value !== 'object') return value;
  if (depth > 4) return '[OBJECT_TRUNCATED]';
  if (Array.isArray(value)) return value.slice(0, 50).map((item, idx) => sanitizeForReport(`${key}[${idx}]`, item, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [
    childKey,
    sanitizeForReport(childKey, childValue, depth + 1),
  ]));
}

function deriveBuildFindings(build) {
  const urlFields = ['archiveUrl', 'icon', 'imageLarge', 'imageSmall'];
  const undefinedUrlFields = urlFields.filter((field) => typeof build[field] === 'string' && build[field].includes('/undefined/'));
  const diagnosticHints = [];
  if (undefinedUrlFields.length > 0) {
    diagnosticHints.push('url_has_undefined: Athom did not fully parse the processed manifest/assets');
  }
  if (!build.sdk) {
    diagnosticHints.push('sdk_missing: processed build has no SDK field');
  }
  if (!Array.isArray(build.platforms) || build.platforms.length === 0) {
    diagnosticHints.push('platforms_missing: processed build has no target platforms');
  }
  return {
    urlHasUndefined: undefinedUrlFields.length > 0,
    undefinedUrlFields,
    diagnosticHints,
  };
}

function resolveHomeyCliRoot() {
  const candidates = [];
  try {
    candidates.push(path.dirname(require.resolve('homey/package.json', { paths: [process.cwd(), __dirname] })));
  } catch {
    // package not installed locally; try global locations below.
  }

  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, 'npm', 'node_modules', 'homey'));
  }

  try {
    const { execSync } = require('child_process');
    const globalRoot = execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim();
    candidates.push(path.join(globalRoot, 'homey'));
  } catch {
    // npm may be unavailable in very small CI images.
  }

  return candidates.find((candidate) => candidate && fs.existsSync(path.join(candidate, 'services', 'AthomApi.js'))) || null;
}

function classifyRootCauseFromText(text) {
  const s = String(text || '').toLowerCase();
  if (/manufacturername|required property/.test(s)) return 'MANIFEST/ZIGBEE IDENTIFIERS';
  if (/invalid sdk version|sdk version:\s*undefined|sdkversion/.test(s)) return 'MANIFEST/SDK ISSUE';
  if (/socket hang up|econnreset|etimedout|network/.test(s)) return 'ATHOM TRANSIENT NETWORK';
  if (/url_has_undefined|did not fully parse|manifest\/assets|sdk_missing|platforms_missing/.test(s)) return 'ATHOM PROCESSOR DID NOT PARSE MANIFEST';
  if (/aggregateerror|aggregate error/.test(s)) return 'ATHOM AGGREGATEERROR (MANIFEST/DRIVER MATRIX)';
  if (/quota|rate limit|limit exceeded|exceed|too many/.test(s)) return 'QUOTA/RATE LIMIT';
  if (/size|large|big|byte|mb|archive/.test(s)) return 'ARCHIVE SIZE';
  if (/not allowed|forbidden|permission|unauthorized|banned|suspend/.test(s)) return 'ACCOUNT/PERMISSION BLOCK';
  if (/processing[_ -]?failed/.test(s)) return 'PROCESSING FAILED (NO DETAIL EXPOSED)';
  return null;
}

function collectRootCauseText() {
  const parts = [];
  const add = (value) => {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      parts.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(add);
      return;
    }
    if (typeof value === 'object') {
      Object.values(value).forEach(add);
    }
  };

  add(report.tier1_api?.summary?.stateMeta);
  add(report.tier1_api?.autoDetectedBuild?.stateMeta);
  add(report.tier1_api?.build?.stateMeta);
  add(report.tier1_api?.build?.state_meta);
  add(report.tier1_api?.build?.error);
  add(report.tier1_api?.build?.errorMessage);
  add(report.tier1_api?.build?.feedback);
  add(report.tier1_api?.derivedFindings?.diagnosticHints);
  add(report.tier1_api?.suspicious);
  add(report.tier2_puppeteer?.pageText);
  add(report.tier2_puppeteer?.afterLoginText);
  add(report.tier2_puppeteer?.error);
  return parts.join('\n');
}

// ─── Tier 1: API ──────────────────────────────────────────────────────────
async function tier1Api() {
  log('TIER 1: API diagnostic');
  const HOMEY_CLI_ROOT = resolveHomeyCliRoot();
  if (!HOMEY_CLI_ROOT) {
    log('TIER 1: homey CLI not found — skipping API diagnostic');
    report.tier1_api = { error: 'homey CLI not installed' };
    return;
  }

  let AthomApi, AthomAppsAPI;
  try {
    AthomApi = require(path.join(HOMEY_CLI_ROOT, 'services/AthomApi'));
    AthomAppsAPI = require(path.join(HOMEY_CLI_ROOT, 'node_modules/homey-api/lib/AthomAppsAPI'));
  } catch (e) {
    log('TIER 1: failed to load homey API modules:', e.message.slice(0, 80));
    report.tier1_api = { error: 'API modules not loadable: ' + e.message.slice(0, 100) };
    return;
  }

  const token = await AthomApi.createDelegationToken({ audience: 'apps' });
  const api = new AthomAppsAPI({ token });

  // Auto-detect latest failed build if none specified.
  let targetBuild = BUILD_ID;
  let latestBuild = null;
  let autoDetectedBuild = null;
  if (!targetBuild) {
    const builds = await api.getBuilds({ $token: token, appId: APP_ID, query: { limit: 30 } });
    const list = Array.isArray(builds) ? builds : (builds.data || []);
    list.sort((a, b) => (b.id || 0) - (a.id || 0));
    latestBuild = list[0] || null;
    const failed = list.find(b => /failed|error|revoked/i.test(b.state));
    if (failed) {
      targetBuild = String(failed.id);
      autoDetectedBuild = summarizeBuild(failed);
      report.buildId = targetBuild;
      log('auto-detected build #' + targetBuild);
    }
    else {
      report.noFailedBuildFound = true;
      report.tier1_api = {
        failedBuildFound: false,
        latestBuild: summarizeBuild(latestBuild),
      };
      log(`no failed build found in last 30; latest is #${latestBuild?.id || '?'} (${latestBuild?.state || 'unknown'})`);
      return;
    }
  }

  // Dump the FULL build object (every field — Athom may expose the error in
  // a field the high-level SDK doesn't surface by default).
  const build = await api.getBuild({ $token: token, appId: APP_ID, buildId: String(targetBuild) });
  const derivedFindings = deriveBuildFindings(build);
  const buildDump = {};
  for (const k of Object.keys(build).sort()) {
    buildDump[k] = build[k] === undefined ? 'UNDEFINED' : sanitizeForReport(k, build[k]);
  }
  report.tier1_api = {
    buildId: targetBuild,
    rawFieldCount: Object.keys(build).length,
    rawFields: Object.keys(build).sort(),
    autoDetectedBuild,
    derivedFindings,
    build: buildDump,
  };

  // Highlight any field that looks like an error/feedback/validation message.
  const suspicious = {};
  for (const [k, v] of Object.entries(buildDump)) {
    const sv = String(v).toLowerCase();
    if (/error|fail|invalid|reject|feedback|validation|reason|message|exception|limit|quota|exceed/i.test(k) ||
        /error|fail|invalid|reject|exceed|quota|limit|not allowed|forbidden/i.test(sv)) {
      suspicious[k] = sanitizeForReport(k, v);
    }
  }
  report.tier1_api.suspicious = suspicious;
  report.tier1_api.summary = summarizeBuild(build);
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
  if (!report.buildId) { log('TIER 2: skipped (no failed build id to inspect)'); return; }
  if (!HOMEY_EMAIL || !HOMEY_PASSWORD) { log('TIER 2: skipped (no HOMEY_EMAIL/PASSWORD)'); return; }
  log('TIER 2: Puppeteer dashboard scrape (90s hard cap)');
  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch { log('puppeteer not installed — skipping'); return; }

  let browser;
  try {
    browser = await puppeteer.launch({
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

    // Build-detail page (may be partially visible without login).
    const url = `https://tools.developer.homey.app/apps/app/${APP_ID}/build/${report.buildId}`;
    log('navigating:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    await new Promise(r => setTimeout(r, 3000));
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
        await new Promise(r => setTimeout(r, 4000));
        await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await new Promise(r => setTimeout(r, 3000));
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
    report.tier2_puppeteer = report.tier2_puppeteer || {};
    report.tier2_puppeteer.error = e.message;
    logErr('puppeteer error:', e.message.slice(0, 100));
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

(async () => {
  log('=== Build Error Diagnostic v2 ===');
  log('app:', APP_ID, '| build:', BUILD_ID || '(auto-detect)', '| email:', HOMEY_EMAIL ? 'set' : 'unset');

  try { await tier1Api(); } catch (e) { report.tier1_api = { error: e.message }; logErr('tier1 failed:', e.message.slice(0, 100)); }
  try { await tier2Puppeteer(); } catch (e) { report.tier2_puppeteer = { error: e.message }; logErr('tier2 failed:', e.message.slice(0, 100)); }

  // Best-effort root cause guess from gathered data.
  const classified = classifyRootCauseFromText(collectRootCauseText());
  if (classified) report.rootCause = classified;
  else if (report.tier2_puppeteer?.afterLoginText || report.tier2_puppeteer?.pageText) report.rootCause = 'SEE DASHBOARD TEXT (review manually)';
  else report.rootCause = 'UNKNOWN (API exposes no error; dashboard scrape inconclusive)';

  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'build-error-report.json'), JSON.stringify(report, null, 2));
  log('=== ROOT CAUSE GUESS:', report.rootCause, '===');
  log('Report written to screenshots/build-error-report.json');
  process.exit(0); // never block CI
})();
