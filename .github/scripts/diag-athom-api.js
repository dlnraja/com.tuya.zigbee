#!/usr/bin/env node
/**
 * diag-athom-api.js - Diagnostic direct via API Athom + Puppeteer
 * Utilise le token CLI Athom pour interroger l'API et le portail dev
 */
'use strict';
const puppeteer = require('puppeteer');
const fs = require('fs'), path = require('path');

const SETTINGS_PATH = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
const TOKEN = settings?.homeyApi?.token?.access_token || '';
const REFRESH = settings?.homeyApi?.token?.refresh_token || '';

const APP_ID  = 'com.dlnraja.tuya.zigbee';
const APP_URL = `https://tools.developer.homey.app/apps/app/${APP_ID}`;
const API_BASE = 'https://apps-api.developer.homey.app';
const SHOTS   = path.join(__dirname, '..', '..', 'screenshots');

fs.mkdirSync(SHOTS, { recursive: true });

const log = m => console.log(m);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callAPI(endpoint, token) {
  const https = require('https');
  return new Promise((resolve) => {
    const url = API_BASE + endpoint;
    const req = https.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'athom-cli/1.0',
      }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, raw: data.substring(0, 500) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

async function main() {
  log(`\n╔════════════════════════════════════════════════════╗`);
  log(`║  ATHOM API + PORTAL DIAG`);
  log(`║  App: ${APP_ID}`);
  log(`║  Token: ${TOKEN.substring(0, 20)}...`);
  log(`╚════════════════════════════════════════════════════╝\n`);

  // ── STEP 1: Direct API calls ─────────────────────────────
  log('=== STEP 1: Direct API Calls ===');

  // Check app info
  const appInfo = await callAPI(`/api/app/${APP_ID}`, TOKEN);
  log(`App info (${appInfo.status}): ${JSON.stringify(appInfo.data || appInfo).substring(0, 300)}`);

  // Check builds
  const builds = await callAPI(`/api/app/${APP_ID}/build?limit=5`, TOKEN);
  log(`\nBuilds (${builds.status}): ${JSON.stringify(builds.data || builds.raw || builds).substring(0, 800)}`);

  // Save API results
  fs.writeFileSync(path.join(SHOTS, 'api-results.json'), JSON.stringify({
    timestamp: new Date().toISOString(),
    token_prefix: TOKEN.substring(0, 20),
    appInfo: appInfo,
    builds: builds,
  }, null, 2));

  // ── STEP 2: Puppeteer Portal ─────────────────────────────
  log('\n=== STEP 2: Puppeteer Portal ===');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
    defaultViewport: { width: 1400, height: 900 },
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(25000);

    // Capture API traffic
    const captured = { errors: [], builds: [], rawRequests: [] };
    
    page.on('request', req => {
      const url = req.url();
      const auth = req.headers()['authorization'] || '';
      if (url.includes('apps-api') || url.includes('developer.homey')) {
        captured.rawRequests.push(url.split('?')[0].slice(-80));
      }
    });
    
    page.on('response', async res => {
      try {
        const url = res.url();
        if (url.includes('apps-api') || (url.includes('developer.homey') && !url.includes('.js') && !url.includes('.css'))) {
          const j = await res.json().catch(() => null);
          if (!j) return;
          const s = JSON.stringify(j);
          if (/error|fail|aggregate|invalid/i.test(s)) {
            captured.errors.push({ url: url.slice(-60), status: res.status(), snippet: s.substring(0, 400) });
          }
          if (j.builds || j.data?.builds || j.items) {
            captured.builds.push({ url: url.slice(-60), snippet: s.substring(0, 600) });
          }
        }
      } catch {}
    });

    // Navigate and inject
    await page.goto('https://tools.developer.homey.app', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    await sleep(1500);

    // Inject all possible token keys the SPA might use
    await page.evaluate((tok, ref) => {
      const keys = ['token', 'access_token', '_token', 'homeyApiToken', '_authToken', 'athomToken'];
      keys.forEach(k => {
        try { localStorage.setItem(k, tok); } catch {}
        try { sessionStorage.setItem(k, tok); } catch {}
      });
      try { localStorage.setItem('refresh_token', ref); } catch {}
      // Some SPAs store in indexedDB - try cookie too
      document.cookie = `token=${tok}; path=/; domain=.homey.app; SameSite=None; Secure`;
    }, TOKEN, REFRESH);

    // Navigate to app page
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    await sleep(6000);
    
    const pageText = await page.evaluate(() => document.body?.innerText || '');
    const isAuthed = !(/log\s*in|sign\s*in/i.test(pageText.substring(0, 200))) || pageText.includes(APP_ID);
    
    log(`Auth status: ${isAuthed ? '✅ Logged in' : '❌ Not logged in'}`);
    log(`Page text (300c): ${pageText.substring(0, 300).replace(/\n/g, ' ')}`);

    await page.screenshot({ path: path.join(SHOTS, 'portal-01-main.png'), fullPage: true });
    log(`📸 portal-01-main.png`);

    if (isAuthed) {
      // Extract builds
      const visibleBuilds = await page.evaluate(() => {
        const items = [...document.querySelectorAll('tr, [class*="row"], [class*="Row"], [class*="build"], li')];
        return items
          .map(el => el.innerText?.trim())
          .filter(t => t && t.length > 5 && t.length < 300 && /\d{4}|\d{4}|fail|error|success|process/i.test(t))
          .slice(0, 15);
      });
      log('\nVisible builds:');
      visibleBuilds.forEach(b => log('  ' + b.replace(/\n/g, ' | ').substring(0, 120)));

      // Look for and click failing build
      const clickedError = await page.evaluate(() => {
        const errorEls = [...document.querySelectorAll('[class*="error"],[class*="Error"],[class*="fail"],[class*="Fail"]')];
        for (const el of errorEls) {
          const t = el.innerText?.trim();
          if (t && t.length > 0) { el.click(); return t.substring(0, 80); }
        }
        // Try clicking first build row
        const rows = [...document.querySelectorAll('tr')].filter(r => r.innerText?.trim().length > 20);
        if (rows[0]) { rows[0].click(); return 'First row: ' + rows[0].innerText?.substring(0, 50); }
        return null;
      });
      if (clickedError) {
        log(`Clicked: ${clickedError}`);
        await sleep(3000);
        await page.screenshot({ path: path.join(SHOTS, 'portal-02-clicked.png'), fullPage: true });
        log(`📸 portal-02-clicked.png`);
      }

      // Get all error text
      const allErrors = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('*').forEach(el => {
          const t = el.innerText?.trim();
          if (t && /aggregateerror|processing.*failed|validation.*error|invalid/i.test(t) && t.length < 2000) {
            results.push(t.substring(0, 400));
          }
        });
        return [...new Set(results)].slice(0, 5);
      });
      if (allErrors.length > 0) {
        log('\n🔴 ERROR TEXT:');
        allErrors.forEach(e => log('  ' + e.replace(/\n/g, ' | ').substring(0, 200)));
      }
    }

    // Save full report
    const report = {
      timestamp: new Date().toISOString(),
      authenticated: isAuthed,
      capturedErrors: captured.errors,
      capturedBuilds: captured.builds,
      rawRequestCount: captured.rawRequests.length,
      sampleRequests: captured.rawRequests.slice(0, 10),
    };
    fs.writeFileSync(path.join(SHOTS, 'portal-diag-full.json'), JSON.stringify(report, null, 2));
    log(`\n📄 portal-diag-full.json`);
    log(`📄 api-results.json`);
    
  } finally {
    await browser.close();
  }
  
  log('\n✅ Done');
}

main().catch(e => { console.error('❌ FATAL:', e.message); process.exit(1); });
