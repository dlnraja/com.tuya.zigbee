#!/usr/bin/env node
/**
 * athom-dev-cartographer.js  v3
 *
 * DUAL-MODE cartography of the Athom dev portal:
 *
 * MODE 1 — API (always works with CLI login):
 *   - Uses AthomAppsAPI (same auth as homey CLI) for structured build data
 *   - Fetches all builds, analyzes good vs bad, reports all fields
 *   - Saves JSON report
 *
 * MODE 2 — Puppeteer (requires HOMEY_EMAIL + HOMEY_PASSWORD):
 *   - Navigates all pages of tools.developer.homey.app
 *   - Clicks error triangles, captures AggregateError popup text
 *   - Screenshots each tab of build pages
 *
 * Usage:
 *   node .github/scripts/athom-dev-cartographer.js           # API mode only
 *   node .github/scripts/athom-dev-cartographer.js --visual  # API + Puppeteer
 *   HOMEY_EMAIL=x HOMEY_PASSWORD=y node ... --visual
 *   node .github/scripts/athom-dev-cartographer.js --build 2204
 */
'use strict';

const path      = require('path');
const fs        = require('fs');
const https     = require('https');

let APP_JSON = {};
try { APP_JSON = JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','app.json'),'utf8')); } catch(e) {}
const APP_ID     = process.env.TARGET_APP_ID || APP_JSON.id || 'com.dlnraja.tuya.zigbee';
const BASE_URL   = 'https://tools.developer.homey.app';
const EMAIL      = process.env.HOMEY_EMAIL    || '';
const PASSWORD   = process.env.HOMEY_PASSWORD || '';
const DO_VISUAL  = process.argv.includes('--visual');
const FOCUS_BUILD= process.argv.includes('--build')
  ? process.argv[process.argv.indexOf('--build') + 1]
  : null;
const GOOD_ID    = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '2159';
const BAD_ID     = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : '2204';

const SHOTS_DIR  = path.join(__dirname, '..', '..', 'screenshots', 'cartography');
fs.mkdirSync(SHOTS_DIR, { recursive: true });

const REPORT = {
  timestamp: new Date().toISOString(),
  mode: DO_VISUAL ? 'api+puppeteer' : 'api-only',
  builds: {},
  allBuilds: [],
  comparison: {},
  aggregateErrors: [],
  pages: [],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── AthomAppsAPI Helper ─────────────────────────────────────────────────────
async function getAthomApi() {
  const homeyRoot = path.join(process.env.APPDATA || '', 'npm', 'node_modules', 'homey');
  try {
    const AthomApi = require(path.join(homeyRoot, 'services', 'AthomApi'));
    const { AthomAppsAPI } = require(path.join(homeyRoot, 'node_modules', 'homey-api'));
    const token = await AthomApi.createDelegationToken({ audience: 'apps' });
    const api = new AthomAppsAPI();
    return { api, token };
  } catch (e) {
    console.error('[API] AthomAppsAPI load error:', e.message);
    return null;
  }
}

function apiCall(api, method, ...args) {
  // Inject token into args
  const lastArg = args[args.length - 1];
  if (typeof lastArg === 'object' && lastArg !== null) {
    lastArg['$token'] = lastArg['$token'] || api._token;
  }
  return api[method](...args);
}

// ─── API MODE ────────────────────────────────────────────────────────────────
async function runApiMode() {
  console.log('\n[API] Loading AthomAppsAPI...');
  const ctx = await getAthomApi();
  if (!ctx) {
    console.log('[API] ❌ Cannot load AthomAppsAPI — ensure homey CLI is installed and logged in');
    return false;
  }

  const { api, token } = ctx;
  api._token = token;

  // ── Fetch all builds ──
  console.log('[API] Fetching all builds...');
  let allBuilds = [];
  try {
    const result = await api.getBuilds({ '$token': token, appId: APP_ID });
    allBuilds = Array.isArray(result) ? result : (result.items || result.data || []);
    console.log(`[API] ✅ ${allBuilds.length} builds found`);
    REPORT.allBuilds = allBuilds.map(b => ({
      id: b.id,
      version: b.version,
      state: b.state,
      stateChangedAt: b.stateChangedAt,
      sdk: b.sdk,
      platforms: b.platforms,
      drivers: b.drivers?.length,
    }));
  } catch (e) {
    console.log('[API] ⚠️  getBuilds error:', e.message);
  }

  // ── Analyze specific builds ──
  for (const buildId of [GOOD_ID, BAD_ID, FOCUS_BUILD].filter(Boolean)) {
    console.log(`\n[API] Analyzing build #${buildId}...`);
    try {
      const build = await api.getBuild({ '$token': token, appId: APP_ID, buildId: String(buildId) });

      const analysis = {
        id:          build.id,
        version:     build.version,
        state:       build.state,
        stateMeta:   build.stateMeta,
        sdk:         build.sdk,
        platforms:   build.platforms,
        permissions: build.permissions,
        driverCount: (build.drivers || []).length,
        archiveUrl:  build.archiveUrl,
        archiveSize: build.size,
        changelog:   build.changelog,
        name:        build.name,
        description: build.description ? '✅ present' : '❌ MISSING',
        category:    build.category,
        brandColor:  build.brandColor,
        icon:        build.icon,
        imageLarge:  build.imageLarge,
        stateChangedAt: build.stateChangedAt,
      };

      // Check for "undefined" in URLs (sign of failed processing)
      const hasUndefinedInUrl = (build.archiveUrl || '').includes('/undefined/') ||
                                (build.icon || '').includes('/undefined/');
      analysis.urlHasUndefined = hasUndefinedInUrl;

      // Classify
      analysis.status = build.state === 'test'     ? '✅ GOOD'
                      : build.state === 'processing_failed' ? '❌ FAILED'
                      : build.state === 'draft'    ? '🔵 DRAFT'
                      : '⚪ ' + build.state;

      console.log(`  State:    ${analysis.status}`);
      console.log(`  Version:  ${analysis.version}`);
      console.log(`  SDK:      ${analysis.sdk ?? '❌ undefined'}`);
      console.log(`  Drivers:  ${analysis.driverCount}`);
      console.log(`  Desc:     ${analysis.description}`);
      console.log(`  Archive:  ${analysis.archiveSize ? (analysis.archiveSize/1024/1024).toFixed(2)+' MB' : '❌ undefined'}`);
      if (hasUndefinedInUrl) console.log(`  ⚠️  URL contains /undefined/ — manifest not parsed!`);
      if (build.stateMeta) console.log(`  StateMeta: ${JSON.stringify(build.stateMeta).slice(0, 200)}`);

      REPORT.builds[buildId] = analysis;

      // Save full build data for detailed inspection
      const buildFile = path.join(SHOTS_DIR, `build-${buildId}-api.json`);
      fs.writeFileSync(buildFile, JSON.stringify(build, null, 2));
      console.log(`  Saved: ${path.basename(buildFile)}`);

    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      REPORT.builds[buildId] = { error: e.message };
    }
  }

  // ── Comparison ──
  const good = REPORT.builds[GOOD_ID];
  const bad  = REPORT.builds[BAD_ID];
  if (good && bad && !good.error && !bad.error) {
    console.log('\n[API] Comparing builds...');
    const diff = {};
    const fields = ['state', 'sdk', 'platforms', 'driverCount', 'description', 'archiveSize', 'urlHasUndefined'];
    for (const f of fields) {
      if (JSON.stringify(good[f]) !== JSON.stringify(bad[f])) {
        diff[f] = { good: good[f], bad: bad[f] };
      }
    }
    REPORT.comparison = diff;

    console.log('\n=== BUILD COMPARISON ===');
    for (const [f, { good: g, bad: b }] of Object.entries(diff)) {
      const icon = ['state', 'sdk', 'driverCount', 'description'].includes(f) ? '❌' : '⚠️';
      console.log(`  ${icon} ${f}: GOOD=${JSON.stringify(g)} | BAD=${JSON.stringify(b)}`);
    }

    // Root cause analysis
    console.log('\n=== ROOT CAUSE ANALYSIS ===');
    if (bad.urlHasUndefined) {
      console.log('  🔴 PRIMARY CAUSE: Archive URL contains /undefined/ → server could not parse app.json');
      console.log('     This happens when the archive is too large or malformed.');
      console.log('     Archive size was: ~47MB (now fixed to ~17.8MB via .homeyignore)');
    }
    if (!bad.sdk) {
      console.log('  🔴 sdk=undefined → Athom server did not extract app.json from archive');
    }
    if (bad.driverCount === 0) {
      console.log('  🔴 0 drivers → app.json content not parsed, all fields undefined in UI');
      console.log('     This causes AggregateError when React tries to map over undefined drivers array');
    }
    if (!bad.description || bad.description.includes('MISSING')) {
      console.log('  🔴 description missing → "Description" text missing from submission page');
    }
  }

  return true;
}

// ─── PUPPETEER MODE ───────────────────────────────────────────────────────────
async function runPuppeteerMode() {
  console.log('\n[PUPPETEER] Starting browser...');

  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch { console.log('[PUPPETEER] ❌ Not installed — run: npm install puppeteer'); return; }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
           '--disable-web-security', '--no-first-run'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();

  // Capture JS errors
  page.on('pageerror', err => {
    const msg = err.message;
    if (/aggregateerror|TypeError|cannot read/i.test(msg)) {
      REPORT.aggregateErrors.push({ source: 'pageerror', url: page.url(), text: msg });
      console.log(`  [JS ERROR] ${msg.slice(0, 100)}`);
    }
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (/aggregateerror|TypeError/i.test(text)) {
        REPORT.aggregateErrors.push({ source: 'console', url: page.url(), text });
      }
    }
  });

  const shot = async (name) => {
    const file = path.join(SHOTS_DIR, name.replace(/[^a-zA-Z0-9._-]/g, '_') + '.png');
    await page.screenshot({ path: file, fullPage: true }).catch(() => {});
    console.log(`  📸 ${path.basename(file)}`);
    return file;
  };

  // ── Auth ──
  console.log('[PUPPETEER] Attempting login...');
  let authenticated = false;

  if (EMAIL && PASSWORD) {
    try {
      // Navigate to Athom login
      await page.goto('https://accounts.athom.com/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2000);
      await shot('pup_00_login');

      // Fill email
      const emailSel = 'input[type="email"], input[name="email"], #email';
      try {
        await page.waitForSelector(emailSel, { timeout: 8000 });
        await page.type(emailSel, EMAIL, { delay: 40 });
      } catch {}

      // Next (some flows have two-step)
      try {
        const nextBtn = await page.$('button[type="submit"], button:has-text("Next"), button:has-text("Continue")');
        if (nextBtn) { await nextBtn.click(); await sleep(2000); }
      } catch {}

      // Fill password
      const pwSel = 'input[type="password"], input[name="password"], #password';
      try {
        await page.waitForSelector(pwSel, { timeout: 8000 });
        await page.type(pwSel, PASSWORD, { delay: 40 });
        await page.keyboard.press('Enter');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
        await sleep(3000);
        authenticated = true;
        console.log('[PUPPETEER] ✅ Logged in');
      } catch (e) {
        console.log('[PUPPETEER] ⚠️  Login error:', e.message);
      }
    } catch (e) {
      console.log('[PUPPETEER] Login nav error:', e.message);
    }
  } else {
    console.log('[PUPPETEER] ⚠️  No HOMEY_EMAIL/HOMEY_PASSWORD — screenshots may show login page');
  }

  // ── Navigate all dev portal pages ──
  const PAGES = [
    { url: `${BASE_URL}/`, name: 'pup_01_dashboard' },
    { url: `${BASE_URL}/apps`, name: 'pup_02_apps_list' },
    { url: `${BASE_URL}/apps/app/${APP_ID}`, name: 'pup_03_app_overview' },
    { url: `${BASE_URL}/apps/app/${APP_ID}/builds`, name: 'pup_04_builds_list' },
    { url: `${BASE_URL}/apps/app/${APP_ID}/build/${GOOD_ID}`, name: `pup_05_build_${GOOD_ID}_good` },
    { url: `${BASE_URL}/apps/app/${APP_ID}/build/${BAD_ID}`, name: `pup_06_build_${BAD_ID}_bad` },
  ];
  if (FOCUS_BUILD) {
    PAGES.push({ url: `${BASE_URL}/apps/app/${APP_ID}/build/${FOCUS_BUILD}`, name: `pup_07_build_${FOCUS_BUILD}` });
  }

  for (const { url, name } of PAGES) {
    console.log(`\n[PUPPETEER] ${name}: ${url}`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
      await sleep(3000);
      await shot(name);

      const title = await page.title();
      const bodyLen = await page.evaluate(() => document.body?.innerText?.length || 0);
      console.log(`  Title: ${title} | Body: ${bodyLen}c`);

      // Try to find and click error triangles
      const errorClicked = await page.evaluate(() => {
        const candidates = [
          ...document.querySelectorAll('[class*="error"], [class*="Error"], [class*="warning"], [class*="failed"]'),
          ...document.querySelectorAll('svg[data-testid*="Error"], svg[data-testid*="Warning"]'),
          ...document.querySelectorAll('[role="alert"]'),
        ];
        for (const el of candidates) {
          const t = el.innerText || el.textContent || '';
          if (t.length > 0 && t.length < 300) {
            el.click();
            return `Clicked: ${el.tagName}.${el.className?.toString().slice(0,40)} = "${t.slice(0,60)}"`;
          }
        }
        return null;
      });

      if (errorClicked) {
        console.log(`  ⚡ ${errorClicked}`);
        await sleep(2000);
        await shot(name + '_after_error_click');

        // Capture popup / dialog text
        const popupText = await page.evaluate(() => {
          for (const sel of ['[role="dialog"]', '[role="alert"]', '[class*="modal"]', '[class*="popup"]', '[class*="tooltip"]', '[class*="Popover"]', '[class*="Dialog"]']) {
            const el = document.querySelector(sel);
            if (el && el.innerText?.trim()) return el.innerText.trim().slice(0, 1000);
          }
          // scan all for AggregateError
          for (const el of document.querySelectorAll('*')) {
            if (/AggregateError|TypeError|processing.?failed/i.test(el.innerText || '')) {
              return el.innerText.trim().slice(0, 500);
            }
          }
          return null;
        });

        if (popupText) {
          console.log(`  📋 Popup: ${popupText.slice(0, 200)}`);
          REPORT.aggregateErrors.push({ source: 'popup', url, name, text: popupText });
        }
      }

      // Navigate build tabs
      if (name.includes('build_')) {
        const tabs = ['Overview', 'Drivers', 'Flow cards', 'Changelog', 'Submit'];
        for (const tabName of tabs) {
          const clicked = await page.evaluate(name => {
            const el = [...document.querySelectorAll('[role="tab"], button, li, a')]
              .find(e => e.textContent?.trim().toLowerCase() === name.toLowerCase());
            if (el) { el.click(); return true; }
            return false;
          }, tabName);

          if (clicked) {
            await sleep(1500);
            await shot(`${name}_tab_${tabName.replace(/ /g, '_')}`);
          }
        }
      }

      REPORT.pages.push({ name, url, title, bodyLen, errorClicked });

    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      REPORT.pages.push({ name, url, error: e.message });
    }
  }

  await browser.close();
  console.log('\n[PUPPETEER] ✅ Done');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  ATHOM DEV CARTOGRAPHER v3 — ${APP_ID}`);
  console.log(`║  Mode: ${DO_VISUAL ? 'API + Puppeteer' : 'API only'}`);
  console.log(`║  Builds: ${GOOD_ID} (good) vs ${BAD_ID} (bad)${FOCUS_BUILD ? ` + focus ${FOCUS_BUILD}` : ''}`);
  console.log('╚═══════════════════════════════════════════════════════════╝');

  // Phase 1: API (always)
  await runApiMode();

  // Phase 2: Puppeteer (optional)
  if (DO_VISUAL) {
    await runPuppeteerMode();
  } else {
    console.log('\n[INFO] Run with --visual for Puppeteer screenshots');
  }

  // ── Save report ──
  const reportPath = path.join(SHOTS_DIR, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify(REPORT, null, 2));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log(`  Builds analyzed:    ${Object.keys(REPORT.builds).length}`);
  console.log(`  AggregateErrors:    ${REPORT.aggregateErrors.length}`);
  console.log(`  Screenshots:        ${REPORT.pages.length}`);
  console.log(`  Report:             ${reportPath}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  if (REPORT.aggregateErrors.length > 0) {
    console.log('🔴 AggregateError details:');
    REPORT.aggregateErrors.forEach(({ source, text }) => {
      console.log(`  [${source}] ${text?.slice(0, 200)}`);
    });
  }

})().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
