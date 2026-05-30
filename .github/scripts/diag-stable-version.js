#!/usr/bin/env node
/**
 * diag-stable-version.js
 * Compare version stable du portail Athom avec version courante
 * - Télécharge le tar.gz du dernier build stable depuis le portail
 * - Extrait et compare app.json (endpoints, mfrs, structure)
 * - Identifie exactement ce qui diffère
 * 
 * Usage: node diag-stable-version.js [buildId]
 */
'use strict';

const puppeteer = require('puppeteer');
const fs    = require('fs');
const path  = require('path');
const https = require('https');
const http  = require('http');
const zlib  = require('zlib');

const SETTINGS = JSON.parse(fs.readFileSync(
  path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json'), 'utf8'
));
const TOKEN   = SETTINGS?.homeyApi?.token?.access_token || '';
const APP_ID  = 'com.dlnraja.tuya.zigbee';
const APP_URL = `https://tools.developer.homey.app/apps/app/${APP_ID}`;
const SHOTS   = path.join(__dirname, '..', '..', 'screenshots');
const WORK    = path.join(__dirname, '..', '..', '.diag', 'stable-compare');

fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(WORK,  { recursive: true });

const log   = m => console.log(m);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── DIRECT API via Homey API (not apps-api which is internal) ──────────────
async function fetchHomeyAPI(endpoint) {
  return new Promise(resolve => {
    const url = 'https://api.athom.com' + endpoint;
    const req = https.get(url, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; athom-cli/1.0)',
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
    req.setTimeout(15000, () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

// ── PUPPETEER with proper OAuth handling ──────────────────────────────────
async function getBuildsViaPuppeteer() {
  log('\n[PUPPETEER] Launching...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1400, height: 900 },
  });

  const captured = {
    token: null,
    buildList: null,
    archiveUrls: [],
    stableVersion: null,
    builds: [],
    errors: [],
  };

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    // Intercept API calls to capture token + build data
    page.on('request', req => {
      const auth = req.headers()['authorization'];
      if (auth && req.url().includes('homey')) {
        captured.token = auth.replace(/^Bearer\s+/i, '');
      }
    });

    page.on('response', async res => {
      try {
        const url = res.url();
        // Capture any API response with build data
        if (/\/app\/|\/build|\/builds|\/submit/i.test(url) && 
            !url.endsWith('.js') && !url.endsWith('.css') && !url.endsWith('.png')) {
          const ct = res.headers()['content-type'] || '';
          if (ct.includes('json')) {
            const j = await res.json().catch(() => null);
            if (!j) return;
            const s = JSON.stringify(j);
            
            // Look for build list
            if (j.result?.builds || j.builds || j.data?.builds || Array.isArray(j.result)) {
              const builds = j.result?.builds || j.builds || j.data?.builds || j.result || [];
              if (Array.isArray(builds) && builds.length > 0) {
                captured.buildList = builds;
                log(`  [API] Captured ${builds.length} builds from ${url.slice(-60)}`);
              }
            }
            
            // Look for archive URLs
            if (s.includes('.tgz') || s.includes('.tar.gz') || s.includes('archive')) {
              const urls = s.match(/https?:\/\/[^"'\s]+\.tgz[^"'\s]*/g) || [];
              captured.archiveUrls.push(...urls);
            }
            
            // Look for stable/published version info
            if (s.includes('stable') || s.includes('published') || s.includes('version')) {
              log(`  [API] Version data: ${s.substring(0, 200)}`);
            }
            
            // Error data
            if (/error|fail|aggregate/i.test(s)) {
              captured.errors.push({ url: url.slice(-50), snippet: s.substring(0, 300) });
            }
          }
        }
        // Archive download URLs
        if (/\.tgz|\.tar\.gz/i.test(res.url())) {
          captured.archiveUrls.push(res.url());
        }
      } catch {}
    });

    // Step 1: Navigate to base with warm-up (critical for SPA)
    log('  [NAV] Warming up SPA...');
    await page.goto('https://tools.developer.homey.app/apps', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    }).catch(() => {});
    await sleep(2000);

    // Inject token
    await page.evaluate((tok) => {
      ['token','access_token','_token','homeyApiToken','_authToken'].forEach(k => {
        try { localStorage.setItem(k, tok); } catch {}
      });
    }, TOKEN);

    // Step 2: Navigate to app page
    log(`  [NAV] ${APP_URL}`);
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 35000 }).catch(() => {});
    await sleep(6000);

    const bodyText = await page.evaluate(() => document.body?.innerText || '');
    const isLoggedIn = bodyText.includes(APP_ID) || bodyText.includes('Build') || 
                       bodyText.includes('Version') || bodyText.includes('dlnraja');
    log(`  Auth: ${isLoggedIn ? '✅ logged in' : '❌ not logged in'}`);
    log(`  Body (200c): ${bodyText.substring(0, 200).replace(/\n/g, ' ')}`);

    await page.screenshot({ path: path.join(SHOTS, 'stable-01-apppage.png'), fullPage: true });

    if (isLoggedIn) {
      // Extract visible version/build data
      const pageData = await page.evaluate(() => {
        const result = { versions: [], builds: [], stableText: '' };
        
        // Find version numbers
        const versionRe = /\b8\.\d+\.\d+\b/g;
        const allText = document.body?.innerText || '';
        const versions = allText.match(versionRe) || [];
        result.versions = [...new Set(versions)];
        
        // Find "stable" mentions
        const stableEls = [...document.querySelectorAll('*')].filter(el => {
          const t = el.innerText?.trim() || '';
          return /stable|published|approved/i.test(t) && t.length < 200 && el.children.length < 5;
        });
        result.stableText = stableEls.map(e => e.innerText?.trim()).filter(Boolean).slice(0, 5).join(' | ');
        
        // Build rows
        const rows = [...document.querySelectorAll('tr,[class*="row"],[class*="Row"]')];
        result.builds = rows
          .map(r => r.innerText?.trim())
          .filter(t => t && t.length > 5 && t.length < 300)
          .slice(0, 10);
        
        return result;
      });

      log(`\n  Versions found: ${pageData.versions.join(', ')}`);
      log(`  Stable text: ${pageData.stableText}`);
      log(`  Build rows: ${pageData.builds.slice(0,3).map(b => b.replace(/\n/g,' | ').substring(0,80)).join('\n    ')}`);
      captured.builds = pageData.builds;
      captured.stableVersion = pageData.versions[0];

      // Try to navigate to stable/published build
      const stableClicked = await page.evaluate(() => {
        // Look for "stable", "published", "approved" links
        const links = [...document.querySelectorAll('a, button, [role="tab"]')];
        const stableLink = links.find(l => /stable|published|approved|test/i.test(l.innerText || l.textContent));
        if (stableLink) { stableLink.click(); return stableLink.innerText?.trim(); }
        return null;
      });
      if (stableClicked) {
        log(`\n  Clicked stable link: ${stableClicked}`);
        await sleep(4000);
        await page.screenshot({ path: path.join(SHOTS, 'stable-02-stable.png'), fullPage: true });
        
        // Extract build number/version
        const stableData = await page.evaluate(() => {
          const text = document.body?.innerText || '';
          const buildRe = /build\s*#?(\d+)/gi;
          const versionRe = /\b8\.\d+\.\d+\b/g;
          const builds = [];
          let m;
          while ((m = buildRe.exec(text)) !== null) builds.push(m[1]);
          const versions = text.match(versionRe) || [];
          
          // Archive links
          const archLinks = [...document.querySelectorAll('a')].filter(l => /\.tgz|archive|download/i.test(l.href));
          
          return {
            builds: [...new Set(builds)].slice(0, 5),
            versions: [...new Set(versions)].slice(0, 5),
            archiveLinks: archLinks.map(l => l.href).slice(0, 3),
          };
        });
        log(`  Stable builds: ${stableData.builds.join(', ')}`);
        log(`  Stable versions: ${stableData.versions.join(', ')}`);
        log(`  Archive links: ${stableData.archiveLinks.join(', ')}`);
        captured.stableVersion = stableData.versions[0] || captured.stableVersion;
        if (stableData.archiveLinks.length > 0) {
          captured.archiveUrls.push(...stableData.archiveLinks);
        }
      }
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      authenticated: isLoggedIn,
      stableVersion: captured.stableVersion,
      builds: captured.builds,
      capturedToken: captured.token ? captured.token.substring(0, 20) + '...' : null,
      archiveUrls: captured.archiveUrls.slice(0, 5),
      errors: captured.errors,
    };
    
    fs.writeFileSync(path.join(SHOTS, 'stable-report.json'), JSON.stringify(report, null, 2));
    log(`\n  📄 stable-report.json`);
    log(`  📸 Screenshots in ${SHOTS}`);
    
    return report;

  } finally {
    await browser.close();
  }
}

async function main() {
  log(`\n╔══════════════════════════════════════════════════╗`);
  log(`║  STABLE VERSION COMPARISON — ${APP_ID}`);
  log(`╚══════════════════════════════════════════════════╝`);

  // Try direct API first
  log('\n=== STEP 1: Homey API ===');
  const apiApp = await fetchHomeyAPI(`/v2/app/${APP_ID}`);
  log(`App API (${apiApp.status}): ${JSON.stringify(apiApp.data || apiApp).substring(0, 300)}`);

  // Puppeteer
  log('\n=== STEP 2: Puppeteer Portal ===');
  const portalData = await getBuildsViaPuppeteer();

  // Summary
  log('\n╔══════════════════════════════════════════════════╗');
  log(`║  SUMMARY`);
  log(`║  Stable version: ${portalData.stableVersion || 'unknown'}`);
  log(`║  Archive URLs: ${portalData.archiveUrls.length}`);
  log(`║  Errors: ${portalData.errors.length}`);
  log('╚══════════════════════════════════════════════════╝');
  
  if (portalData.archiveUrls.length > 0) {
    log('\n📦 Archive URLs found — can download for comparison');
    portalData.archiveUrls.forEach(u => log('  ' + u));
  }
}

main().catch(e => { console.error('❌ FATAL:', e.message, '\n', e.stack); process.exit(1); });
