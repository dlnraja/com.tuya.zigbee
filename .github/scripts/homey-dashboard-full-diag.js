#!/usr/bin/env node
/**
 * homey-dashboard-full-diag.js
 * Diagnostic Puppeteer complet du portail Homey Dev :
 * - Statut de publication (draft/test/live)
 * - AggregateErrors / Processing Failed
 * - Erreurs de validation
 * - Screenshots pour preuve visuelle
 */
'use strict';

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const APP_ID = 'com.dlnraja.tuya.zigbee';
const PORTAL_URL = 'https://tools.developer.homey.app';

// === AUTH ===
function getHomeyPAT() {
  if (process.env.HOMEY_PAT) return process.env.HOMEY_PAT;
  const envFile = path.join(process.cwd(), '.env');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^HOMEY_PAT=(.+)$/);
      if (m) return m[1].trim();
    }
  }
  // Try athom-cli settings
  const settingsPath = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
  try {
    const s = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    return s.token || s._token || s.accessToken || null;
  } catch { return null; }
}

// === API CHECK via Athom ===
async function checkAthomAPI(pat) {
  console.log('\n--- PHASE 1: Athom API Direct ---');
  if (!pat) { console.log('No PAT — skipping API phase'); return null; }

  const endpoints = [
    `/api/v1/app/${APP_ID}`,
    `/api/v2/app/${APP_ID}`,
    `/app/${APP_ID}`,
  ];

  for (const ep of endpoints) {
    try {
      const result = await new Promise((resolve, reject) => {
        const opts = {
          hostname: 'api.athom.com',
          path: ep,
          headers: { 'Authorization': 'Bearer ' + pat, 'Content-Type': 'application/json', 'User-Agent': 'tuya-diag/1.0' }
        };
        https.get(opts, res => {
          let data = '';
          res.on('data', c => data += c);
          res.on('end', () => resolve({ status: res.statusCode, body: data }));
        }).on('error', reject);
      });
      console.log(`  ${ep}: HTTP ${result.status}`);
      if (result.status === 200) {
        const d = JSON.parse(result.body);
        console.log('  App version:', d.version || 'unknown');
        console.log('  Status:', d.status || d.state || d.publishStatus || 'unknown');
        console.log('  Channel:', d.channel || 'unknown');
        if (d.error || d.processingError) console.log('  ERROR:', d.error || d.processingError);
        return d;
      }
      if (result.status !== 404) console.log('  Body:', result.body.substring(0, 100));
    } catch (e) {
      console.log(`  ${ep}: ERROR ${e.message}`);
    }
  }
  return null;
}

// === PUPPETEER Dashboard Check ===
async function checkDashboard(pat) {
  console.log('\n--- PHASE 2: Puppeteer Dev Portal ---');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1920,1080']
  });

  const results = { screenshots: [], errors: [], warnings: [], appStatus: null, versions: [] };

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    // Intercepter les API calls
    const apiCalls = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('athom.com') || url.includes('homey.app')) {
        try {
          const body = await response.text();
          apiCalls.push({ url: url.substring(0, 100), status: response.status(), body: body.substring(0, 300) });
        } catch { }
      }
    });

    // === PAGE 1: Login / App listing ===
    console.log('  Loading:', PORTAL_URL + '/apps');
    try {
      await page.goto(PORTAL_URL + '/apps', { waitUntil: 'networkidle2', timeout: 30000 });
      await page.screenshot({ path: 'scripts/validate/diag-01-apps-list.png', fullPage: false });
      results.screenshots.push('diag-01-apps-list.png');
      console.log('  Screenshot: diag-01-apps-list.png');
      
      const text1 = await page.evaluate(() => document.body.innerText);
      console.log('  Page preview:', text1.substring(0, 200).replace(/\n/g, ' '));
    } catch (e) {
      console.log('  Page load error:', e.message);
    }

    // === PAGE 2: App spécifique ===
    const appUrl = `${PORTAL_URL}/apps/${APP_ID}`;
    console.log('\n  Loading:', appUrl);
    try {
      await page.goto(appUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      await page.screenshot({ path: 'scripts/validate/diag-02-app-detail.png', fullPage: true });
      results.screenshots.push('diag-02-app-detail.png');

      const appText = await page.evaluate(() => document.body.innerText);
      console.log('  App page preview:', appText.substring(0, 400).replace(/\n/g, ' | '));

      // Chercher statut
      const status = await page.evaluate(() => {
        const body = document.body.innerText.toLowerCase();
        return {
          hasAggregate:       body.includes('aggregate'),
          hasProcessingFailed: body.includes('processing_failed') || body.includes('processing failed'),
          hasPublished:       body.includes('published') || body.includes('live'),
          hasDraft:           body.includes('draft'),
          hasTest:            body.includes('test'),
          hasError:           body.includes('error'),
          hasSuccess:         body.includes('success') || body.includes('approved'),
          rawFirst500:        document.body.innerText.substring(0, 500)
        };
      });
      results.appStatus = status;
      console.log('\n  Status indicators:', JSON.stringify({
        aggregate: status.hasAggregate,
        processingFailed: status.hasProcessingFailed,
        published: status.hasPublished,
        draft: status.hasDraft,
        test: status.hasTest,
        error: status.hasError
      }));

      // Chercher les erreurs explicites
      const pageErrors = await page.evaluate(() => {
        const els = document.querySelectorAll('[class*="error"], [class*="Error"], [class*="alert"], [class*="warning"], [data-status="error"], [data-status="failed"]');
        return Array.from(els).map(el => el.innerText.trim()).filter(t => t.length > 0);
      });
      if (pageErrors.length > 0) {
        console.log('\n  PAGE ERRORS FOUND:');
        pageErrors.slice(0, 5).forEach(e => { console.log('    - ' + e.substring(0, 150)); results.errors.push(e); });
      }

    } catch (e) {
      console.log('  App page error:', e.message);
    }

    // === PAGE 3: Versions/Build history ===
    const versionsUrl = `${PORTAL_URL}/apps/${APP_ID}/versions`;
    console.log('\n  Loading versions:', versionsUrl);
    try {
      await page.goto(versionsUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      await new Promise(r => setTimeout(r, 1500));
      await page.screenshot({ path: 'scripts/validate/diag-03-versions.png', fullPage: true });
      results.screenshots.push('diag-03-versions.png');
      const verText = await page.evaluate(() => document.body.innerText);
      console.log('  Versions page:', verText.substring(0, 300).replace(/\n/g, ' | '));
    } catch (e) {
      console.log('  Versions page error:', e.message);
    }

    // API calls interceptées
    if (apiCalls.length > 0) {
      console.log('\n  Intercepted API calls (' + apiCalls.length + '):');
      apiCalls.slice(0, 8).forEach(c => {
        console.log('    [' + c.status + '] ' + c.url);
        if (c.body && c.body.includes('"error"')) console.log('      ERROR body: ' + c.body.substring(0, 150));
      });
    }

  } finally {
    await browser.close();
  }

  return results;
}

// === PHASE 3: Local scan ===
function localScan() {
  console.log('\n--- PHASE 3: Local Validation Scan ---');
  const issues = [];

  // app.json size
  const appSize = fs.statSync('app.json').size;
  console.log('  app.json: ' + (appSize / 1024 / 1024).toFixed(2) + 'MB');
  if (appSize > 5 * 1024 * 1024) issues.push('app.json too large: ' + (appSize / 1024 / 1024).toFixed(2) + 'MB');

  // Version consistency
  const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  const pkgJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('  Versions: app.json=' + appJson.version + ' package.json=' + pkgJson.version);
  if (appJson.version !== pkgJson.version) issues.push('Version mismatch: app=' + appJson.version + ' pkg=' + pkgJson.version);

  // Images
  function pngDims(fp) {
    try { const b = fs.readFileSync(fp); if (b.length < 24) return null; return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; } catch { return null; }
  }
  const imgChecks = [
    ['assets/images/small.png', 190, 190, true],
    ['assets/images/large.png', 500, 500, false],
  ];
  for (const [rel, ew, eh, blocking] of imgChecks) {
    if (!fs.existsSync(rel)) { if (blocking) issues.push('MISSING: ' + rel); continue; }
    const d = pngDims(rel);
    if (!d) { issues.push('NOT_PNG: ' + rel); continue; }
    if (d.w !== ew || d.h !== eh) {
      const msg = 'WRONG_DIM: ' + rel + ' = ' + d.w + 'x' + d.h + ' (need ' + ew + 'x' + eh + ')';
      if (blocking) issues.push(msg);
      else console.log('  WARN: ' + msg);
    } else {
      console.log('  OK: ' + rel + ' (' + d.w + 'x' + d.h + ')');
    }
  }

  // .homeyignore
  const hi = fs.readFileSync('.homeyignore', 'utf8');
  const largeExcluded = hi.includes('large.png') || hi.includes('xlarge.png');
  console.log('  .homeyignore excludes large/xlarge:', largeExcluded ? 'YES ✅' : 'NO ⚠️');

  if (issues.length === 0) console.log('  ✅ All local checks PASSED');
  else { console.log('  Issues: ' + issues.length); issues.forEach(i => console.log('    ❌ ' + i)); }

  return issues;
}

// === MAIN ===
async function main() {
  console.log('='.repeat(65));
  console.log('HOMEY DEV DASHBOARD — FULL PUPPETEER DIAGNOSTIC');
  console.log('App:', APP_ID);
  console.log('Time:', new Date().toISOString());
  console.log('='.repeat(65));

  fs.mkdirSync('scripts/validate', { recursive: true });

  const pat = getHomeyPAT();
  console.log('PAT:', pat ? 'found (' + pat.substring(0, 8) + '...)' : 'NOT FOUND');

  // Run all phases
  const apiResult = await checkAthomAPI(pat);
  const dashResult = await checkDashboard(pat);
  const localIssues = localScan();

  // === FINAL REPORT ===
  console.log('\n' + '='.repeat(65));
  console.log('DIAGNOSTIC REPORT');
  console.log('='.repeat(65));

  const allGood =
    localIssues.length === 0 &&
    !dashResult?.appStatus?.hasAggregate &&
    !dashResult?.appStatus?.hasProcessingFailed &&
    (dashResult?.errors || []).length === 0;

  if (allGood) {
    console.log('✅ ALL CLEAR — No AggregateErrors detected');
    console.log('✅ App appears healthy on Homey Dev Portal');
  } else {
    if (localIssues.length > 0) { console.log('\n❌ LOCAL ISSUES:'); localIssues.forEach(i => console.log('  ' + i)); }
    if (dashResult?.appStatus?.hasAggregate) console.log('\n❌ AGGREGATE ERROR detected on portal!');
    if (dashResult?.appStatus?.hasProcessingFailed) console.log('\n❌ PROCESSING_FAILED detected on portal!');
    if ((dashResult?.errors || []).length > 0) { console.log('\n❌ PORTAL ERRORS:'); dashResult.errors.forEach(e => console.log('  ' + e)); }
  }

  console.log('\nScreenshots saved:', (dashResult?.screenshots || []).join(', '));
  console.log('='.repeat(65));

  // Save report
  const report = { timestamp: new Date().toISOString(), appId: APP_ID, localIssues, dashResult, apiResult, allGood };
  fs.writeFileSync('docs/reports/puppeteer-dashboard-diag.json', JSON.stringify(report, null, 2));
  console.log('Report: docs/reports/puppeteer-dashboard-diag.json');

  process.exit(allGood ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
