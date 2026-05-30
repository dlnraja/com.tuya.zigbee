#!/usr/bin/env node
/**
 * diag-portal-oauth.js
 * Diagnostic portail Athom via intercepteur OAuth + API directe
 * - Utilise le homey CLI pour lancer une session et capturer le token OAuth SPA
 * - Interroge le portail tools.developer.homey.app
 * - Compare build stable vs build courant
 * 
 * Approche: le CLI athom stocke le token dans settings.json.
 * Le portail SPA utilise ce même token via Authorization: Bearer.
 * On intercept les requests XHR pour capturer les données réelles.
 */
'use strict';

const puppeteer = require('puppeteer');
const fs   = require('fs');
const path = require('path');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────
const SETTINGS_PATH = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
const ACCESS_TOKEN  = settings?.homeyApi?.token?.access_token || '';
const REFRESH_TOKEN = settings?.homeyApi?.token?.refresh_token || '';

const APP_ID  = 'com.dlnraja.tuya.zigbee';
const PORTAL  = 'https://tools.developer.homey.app';
const APP_URL = `${PORTAL}/apps/app/${APP_ID}`;
const SHOTS   = path.join(__dirname, '..', '..', 'screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const log   = m => console.log(m);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const snap  = async (page, name) => {
  const p = path.join(SHOTS, name + '.png');
  await page.screenshot({ path: p, fullPage: true }).catch(() => {});
  return p;
};

// ── HTTP helper ───────────────────────────────────────────────────────────
function httpsGet(hostname, path, token) {
  return new Promise(resolve => {
    const req = https.request({ 
      hostname, path, method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 athom-cli',
        'Origin': 'https://tools.developer.homey.app',
        'Referer': 'https://tools.developer.homey.app/',
      }
    }, res => {
      // Follow redirect
      if ([301,302,307,308].includes(res.statusCode) && res.headers.location) {
        const loc = res.headers.location;
        if (loc.startsWith('http')) {
          const u = new URL(loc);
          return resolve(httpsGet(u.hostname, u.pathname + u.search, token));
        }
      }
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), raw: null }); }
        catch { resolve({ status: res.statusCode, data: null, raw: data.substring(0, 300) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.setTimeout(12000, () => { req.destroy(); resolve({ error: 'timeout' }); });
    req.end();
  });
}

// ── Athom API endpoints to try ─────────────────────────────────────────────
async function probeAPIs() {
  log('\n=== API PROBE ===');
  
  const candidates = [
    ['api.developer.homey.app', `/v1/app/${APP_ID}`],
    ['api.developer.homey.app', `/v1/app/${APP_ID}/build`],
    ['developer.athom.com',     `/api/v1/app/${APP_ID}/builds`],
    ['api.athom.com',           `/v1/app/${APP_ID}`],
    ['api.athom.com',           `/v1/apps/${APP_ID}`],
    ['api.athom.com',           `/v2/app/${APP_ID}/builds`],
  ];

  const results = await Promise.all(candidates.map(([host, ep]) =>
    httpsGet(host, ep, ACCESS_TOKEN).then(r => ({ host, ep, ...r }))
  ));

  let bestToken = ACCESS_TOKEN;
  for (const r of results) {
    const status = r.status;
    const snippet = JSON.stringify(r.data || r.raw || r.error || '').substring(0, 120);
    log(`  ${r.host}${r.ep} → ${status}: ${snippet}`);
    if (status === 200 && r.data) {
      log('  ✅ FOUND working endpoint!');
    }
  }
  return results;
}

// ── Puppeteer with intercepted token ──────────────────────────────────────
async function runPuppeteer() {
  log('\n=== PUPPETEER AUTH ===');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1440, height: 900 },
  });

  const captured = {
    authHeader: null,
    apiToken: null,
    buildList: [],
    stableVersion: null,
    testVersion: null,
    errors: [],
    apiResponses: [],
    archiveLinks: [],
  };

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // Override navigator.webdriver to appear more human
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    // Capture ALL network requests with auth header
    page.on('request', req => {
      const auth = req.headers()['authorization'];
      if (auth && !captured.authHeader) {
        captured.authHeader = auth;
        captured.apiToken = auth.replace(/^Bearer\s+/i, '');
        log(`  [TOKEN captured from request] ${captured.apiToken.substring(0, 20)}...`);
      }
    });

    page.on('response', async res => {
      try {
        const url = res.url();
        const ct  = res.headers()['content-type'] || '';
        
        // Skip static assets
        if (/\.(js|css|png|jpg|svg|woff|ico)(\?|$)/i.test(url)) return;
        if (!ct.includes('json')) return;
        
        const j = await res.json().catch(() => null);
        if (!j) return;
        const s = JSON.stringify(j);
        
        // Log any non-trivial API response
        if (url.includes('developer.homey') || url.includes('athom')) {
          const short = url.split('?')[0].slice(-60);
          log(`  [API] ${res.status()} ${short} → ${s.substring(0, 150)}`);
          captured.apiResponses.push({ url: short, status: res.status(), snippet: s.substring(0, 400) });
        }
        
        // Extract build data
        if (j.result?.builds || j.builds || j.data?.builds) {
          const builds = j.result?.builds || j.builds || j.data?.builds || [];
          if (Array.isArray(builds) && builds.length > 0) {
            captured.buildList = builds.slice(0, 10);
            log(`  [BUILDS] ${builds.length} builds captured`);
          }
        }
        
        // Find stable/test versions
        if (/stable|test|published/i.test(s) && j.stableVersion || j.testVersion) {
          captured.stableVersion = j.stableVersion;
          captured.testVersion   = j.testVersion;
        }

        // Find archive links
        const archives = s.match(/https?:\/\/[^"'\s]+\.(tgz|tar\.gz|zip)/g) || [];
        captured.archiveLinks.push(...archives);
        
        // Collect errors
        if (/error|fail|aggregate/i.test(s) && res.status() >= 400) {
          captured.errors.push({ url: url.slice(-50), status: res.status(), data: s.substring(0, 300) });
        }
      } catch {}
    });

    // ── Navigate: warm-up pattern ────────────────────────────────────────
    log(`  [NAV] ${PORTAL}/apps (warm-up)`);
    await page.goto(`${PORTAL}/apps`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
    await sleep(2000);

    // Inject token into multiple storage locations
    await page.evaluate((tok, ref) => {
      const stores = [localStorage, sessionStorage];
      const keys = ['token', 'access_token', '_token', 'homeyApiToken', '_authToken', 'bearer_token'];
      stores.forEach(store => keys.forEach(k => { try { store.setItem(k, tok); } catch {} }));
      try { localStorage.setItem('refresh_token', ref); } catch {}
      // Try to set via cookie
      ['homey.app', 'developer.homey.app'].forEach(domain => {
        document.cookie = `token=${tok}; path=/; domain=${domain}; SameSite=None; Secure`;
        document.cookie = `access_token=${tok}; path=/; domain=${domain}; SameSite=None; Secure`;
      });
    }, ACCESS_TOKEN, REFRESH_TOKEN);

    // Navigate to app page
    log(`  [NAV] ${APP_URL}`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 35000 }).catch(() => {});
    await sleep(7000);
    
    const pageText = await page.evaluate(() => document.body?.innerText || '');
    const isAuth = pageText.includes(APP_ID) || pageText.includes('Build') 
                || pageText.includes('8.1.') || pageText.includes('dlnraja')
                || !(/log\s*in|sign\s*in/i.test(pageText.substring(0, 100)));
    
    log(`  Auth: ${isAuth ? '✅' : '❌'}`);
    log(`  Page (250c): ${pageText.substring(0, 250).replace(/\n/g, ' ')}`);
    await snap(page, 'portal-main');

    if (isAuth) {
      // Extract structured data
      const pageData = await page.evaluate(() => {
        const text = document.body?.innerText || '';
        
        // Versions
        const versions = [...new Set(text.match(/\b8\.\d+\.\d+\b/g) || [])];
        
        // Build statuses
        const rows = [...document.querySelectorAll('tr, [class*="row"], [class*="Row"]')]
          .map(r => r.innerText?.trim()).filter(t => t && t.length > 3 && t.length < 200)
          .slice(0, 15);
        
        // Stable/test indicators
        const stableEls = [...document.querySelectorAll('*')]
          .filter(el => /stable|test|live/i.test(el.className || '') && el.innerText?.trim().length < 100)
          .map(el => ({ class: el.className, text: el.innerText?.trim() }))
          .slice(0, 5);
        
        // Download links
        const links = [...document.querySelectorAll('a')]
          .filter(a => /download|archive|tgz|tar/i.test(a.href + a.innerText))
          .map(a => a.href)
          .slice(0, 5);
        
        return { versions, rows, stableEls, downloadLinks: links };
      });
      
      log(`\n  Versions: ${pageData.versions.join(', ')}`);
      log(`  Rows (${pageData.rows.length}): ${pageData.rows.slice(0,3).map(r=>r.replace(/\n/g,' | ').substring(0,80)).join('\n    ')}`);
      if (pageData.stableEls.length > 0) {
        log(`  Stable elements: ${JSON.stringify(pageData.stableEls)}`);
      }
      
      captured.stableVersion = captured.stableVersion || pageData.versions[0];
      captured.archiveLinks.push(...pageData.downloadLinks);

      // Look for "test" / "stable" tabs and click
      const tabClicked = await page.evaluate(() => {
        const tabs = [...document.querySelectorAll('[role="tab"], button, a')]
          .find(el => /\b(stable|test|published)\b/i.test(el.innerText || el.textContent));
        if (tabs) { tabs.click(); return tabs.innerText?.trim().substring(0, 50); }
        return null;
      });
      if (tabClicked) {
        log(`  Clicked tab: ${tabClicked}`);
        await sleep(3000);
        await snap(page, 'portal-stable-tab');
        
        // Recapture after click
        const afterClick = await page.evaluate(() => {
          const text = document.body?.innerText || '';
          const versions = [...new Set(text.match(/\b8\.\d+\.\d+\b/g) || [])];
          return { versions, text: text.substring(0, 300) };
        });
        log(`  After tab click — versions: ${afterClick.versions.join(', ')}`);
        captured.stableVersion = afterClick.versions[0] || captured.stableVersion;
      }
      
      // Try to find and click first failing build for error details
      const errorClicked = await page.evaluate(() => {
        const errorEl = [...document.querySelectorAll('[class*="error"],[class*="Error"],[class*="fail"],[class*="Fail"]')]
          .find(el => el.innerText?.trim().length > 0);
        if (errorEl) { errorEl.click(); return errorEl.innerText?.trim().substring(0, 60); }
        // Click first row as fallback
        const firstRow = document.querySelector('tr:nth-child(2), [class*="row"]:first-child');
        if (firstRow) { firstRow.click(); return 'first-row: ' + firstRow.innerText?.substring(0, 40); }
        return null;
      });
      if (errorClicked) {
        await sleep(3000);
        await snap(page, 'portal-build-detail');
        
        const errorDetails = await page.evaluate(() => {
          const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alert"],[class*="modal"],[class*="Modal"]')];
          const allErrors = [...document.querySelectorAll('*')].filter(el => {
            const t = el.innerText?.trim();
            return t && /aggregateerror|failed|invalid/i.test(t) && t.length < 2000;
          });
          return {
            dialogs: dialogs.map(d => d.innerText?.trim().substring(0,200)).filter(Boolean),
            errors: allErrors.map(e => e.innerText?.trim().substring(0,200)).filter(Boolean).slice(0,5),
          };
        });
        if (errorDetails.errors.length > 0 || errorDetails.dialogs.length > 0) {
          log('\n  🔴 PORTAL ERRORS:');
          [...errorDetails.dialogs, ...errorDetails.errors].forEach(e => 
            log('    ' + e.replace(/\n/g,' | ').substring(0, 150))
          );
        }
      }
    }

    // Save full report
    const report = {
      timestamp: new Date().toISOString(),
      authenticated: isAuth,
      stableVersion: captured.stableVersion,
      testVersion:   captured.testVersion,
      buildCount:    captured.buildList.length,
      builds:        captured.buildList.slice(0, 5),
      archiveLinks:  [...new Set(captured.archiveLinks)].slice(0, 5),
      apiResponses:  captured.apiResponses.slice(0, 10),
      errors:        captured.errors,
      tokenCaptured: captured.apiToken ? captured.apiToken.substring(0, 20) + '...' : null,
    };
    
    const reportPath = path.join(SHOTS, 'portal-oauth-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    log(`\n📄 ${reportPath}`);
    
    return report;
    
  } finally {
    await browser.close();
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────
async function main() {
  log(`\n╔══════════════════════════════════════════════════════╗`);
  log(`║  PORTAIL ATHOM DIAG — ${APP_ID}`);
  log(`║  Token: ${ACCESS_TOKEN.substring(0,20)}...`);
  log(`╚══════════════════════════════════════════════════════╝`);
  
  // Run API probe and puppeteer in parallel
  const [apiResults, portalData] = await Promise.all([
    probeAPIs(),
    runPuppeteer(),
  ]);
  
  log('\n╔══════════════════════════════════════════════════════╗');
  log(`║  RÉSUMÉ FINAL`);
  log(`║  Auth portail: ${portalData.authenticated ? '✅' : '❌'}`);
  log(`║  Version stable: ${portalData.stableVersion || 'non trouvée'}`);
  log(`║  Version test:   ${portalData.testVersion   || 'non trouvée'}`);
  log(`║  Builds capturés: ${portalData.buildCount}`);
  log(`║  Archives: ${portalData.archiveLinks.length}`);
  log(`║  Erreurs portail: ${portalData.errors.length}`);
  log(`╚══════════════════════════════════════════════════════╝`);
  
  if (portalData.archiveLinks.length > 0) {
    log('\n📦 Archive URLs:');
    portalData.archiveLinks.forEach(u => log('  ' + u));
  }
}

main().catch(e => {
  console.error('❌ FATAL:', e.message);
  process.exit(1);
});
