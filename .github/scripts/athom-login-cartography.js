// athom-login-cartography.js - Login complet + cartographie visuelle Athom
// Utilise les credentials du athom-cli local (pas besoin de HOMEY_EMAIL/PASSWORD)
// Le CLI stocke le token OAuth dans %APPDATA%/athom-cli/settings.json
'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

const APP_ID = 'com.dlnraja.tuya.zigbee';
const SHOTS  = path.resolve('screenshots/portal');
fs.mkdirSync(SHOTS, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Load Athom credentials ──────────────────────────────────────────────────
const SETTINGS = path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json');
let cfg = {};
try { cfg = JSON.parse(fs.readFileSync(SETTINGS, 'utf8')); }
catch(e) { console.error('Cannot read athom-cli settings:', e.message); }

const ACCESS_TOKEN  = cfg?.homeyApi?.token?.access_token || '';
const REFRESH_TOKEN = cfg?.homeyApi?.token?.refresh_token || '';
const CLIENT_ID     = cfg?.homeyApi?.clientId || 'homey-cli';

console.log('Access token:', ACCESS_TOKEN ? ACCESS_TOKEN.slice(0,20)+'...' : 'MISSING');
console.log('Client ID:', CLIENT_ID);

// ── API Helper with delegation ──────────────────────────────────────────────
function apiReq(method, url, body, extraHeaders) {
  return new Promise(resolve => {
    const u = new URL(url);
    const headers = {
      'Authorization': 'Bearer ' + ACCESS_TOKEN,
      'Accept': 'application/json',
      'User-Agent': 'homey-cli/6.4.0',
      'Origin': 'https://tools.developer.homey.app',
      ...(extraHeaders || {})
    };
    if (body) headers['Content-Type'] = 'application/json';

    const opts = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: method,
      headers
    };

    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, headers: res.headers, raw: d.slice(0, 800) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ error: 'timeout' }); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// ── Get delegation token for apps store API ─────────────────────────────────
async function getDelegationToken() {
  console.log('\n[AUTH] Getting delegation token for apps API...');
  const r = await apiReq('POST', 'https://api.athom.com/delegation/token', {
    audience: 'apps',
    grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subjectToken: ACCESS_TOKEN,
    subjectTokenType: 'urn:ietf:params:oauth:token-type:access_token'
  });
  if (r.data && r.data.access_token) {
    console.log('[AUTH] Delegation token obtained!');
    return r.data.access_token;
  }
  console.log('[AUTH] Delegation failed:', JSON.stringify(r).slice(0, 200));
  return null;
}

// ── Main cartography ─────────────────────────────────────────────────────────
async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    app: APP_ID,
    phases: {}
  };

  // Phase 1: Try delegation token → apps-api
  const delegToken = await getDelegationToken();
  const activeToken = delegToken || ACCESS_TOKEN;

  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 1: ATHOM APPS API (avec delegation)');
  console.log('═'.repeat(60));

  // Essayer les APIs avec le token de délégation
  const apiTests = [
    [`https://api.athom.com/app/${APP_ID}`, 'store_info'],
    [`https://api.athom.com/app/${APP_ID}/build?limit=20`, 'builds_list'],
    [`https://apps-api.athom.com/api/v1/app/${APP_ID}/build?limit=10`, 'apps_api_builds'],
    [`https://api.athom.com/delegation/token`, 'deleg_endpoint'],
  ];

  const phase1Results = {};
  for (const [url, key] of apiTests) {
    const overrideHeaders = delegToken
      ? { 'Authorization': 'Bearer ' + delegToken }
      : {};
    const r = await apiReq('GET', url, null, overrideHeaders);
    phase1Results[key] = { url, status: r.status };

    if (r.error) { console.log(`  ${key}: ERROR ${r.error}`); continue; }
    console.log(`  ${key}: HTTP ${r.status}`);
    if (r.status === 200 && r.data) {
      const s = JSON.stringify(r.data);
      console.log(`    len=${s.length}`);
      if (Array.isArray(r.data)) {
        r.data.slice(0, 5).forEach((b, i) =>
          console.log(`    [${i}] id=${b.id} v=${b.version||b.build_version} state=${b.state||b.channel}`)
        );
        phase1Results[key].builds = r.data.slice(0, 20);
      } else {
        console.log('    ' + s.slice(0, 300));
        phase1Results[key].data = r.data;
      }
    } else {
      console.log('    ' + (r.raw || '').slice(0, 150));
    }
  }
  report.phases.api = phase1Results;

  // Phase 2: CDN direct test
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 2: CDN ARCHIVE VERIFICATION');
  console.log('═'.repeat(60));

  const builds_to_check = [
    { id: 2159, v: '8.1.6',  hA: '1baccab5-6eaf-424f-9dae-8a0ba944d21b', hB: '5836c4ed-3ce6-4d79-afb2-16c5e3c43449' },
    { id: 2204, v: '8.1.17', hA: 'undefined', hB: 'c98df506-6ef7-4465-9aef-ee6602244763' },
  ];

  const cdnResults = [];
  for (const b of builds_to_check) {
    const tarUrl  = `https://apps.homeycdn.net/app/${APP_ID}/${b.id}/${b.hA}/${b.hB}.tar.gz`;
    const iconUrl = `https://apps.homeycdn.net/app/${APP_ID}/${b.id}/${b.hA}/assets/icon.svg`;

    const headRes = await new Promise(resolve => {
      const u = new URL(tarUrl);
      const req = https.request({
        hostname: u.hostname, path: u.pathname, method: 'HEAD',
        headers: { 'User-Agent': 'curl/7.88.0' }
      }, res => resolve({ status: res.statusCode, cl: res.headers['content-length'], ct: res.headers['content-type'] }));
      req.on('error', e => resolve({ error: e.message }));
      req.setTimeout(8000, () => { req.destroy(); resolve({ error: 'timeout' }); });
      req.end();
    });

    const iconRes = await new Promise(resolve => {
      const u = new URL(iconUrl);
      const req = https.request({
        hostname: u.hostname, path: u.pathname, method: 'HEAD',
        headers: { 'User-Agent': 'curl/7.88.0' }
      }, res => resolve({ status: res.statusCode }));
      req.on('error', e => resolve({ error: e.message }));
      req.setTimeout(5000, () => { req.destroy(); resolve({ error: 'timeout' }); });
      req.end();
    });

    const sizeMb = headRes.cl ? (parseInt(headRes.cl) / 1024 / 1024).toFixed(2) + 'MB' : 'unknown';
    const ok = headRes.status === 200;

    console.log(`\nBuild #${b.id} v${b.v}:`);
    console.log(`  Archive: HTTP ${headRes.status || headRes.error}  size=${sizeMb}`);
    console.log(`  Icon:    HTTP ${iconRes.status || iconRes.error}`);
    console.log(`  URL:     ${tarUrl.slice(0, 90)}`);
    console.log(`  Status:  ${ok ? '✅ ACCESSIBLE' : '❌ NOT FOUND'}`);

    cdnResults.push({
      buildId: b.id, version: b.v,
      archiveStatus: headRes.status,
      archiveSizeMb: sizeMb,
      iconStatus: iconRes.status,
      accessible: ok,
      urlHasUndefined: b.hA === 'undefined'
    });
  }
  report.phases.cdn = cdnResults;

  // Phase 3: Puppeteer avec injection token via cookie
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 3: PUPPETEER WITH COOKIE INJECTION');
  console.log('═'.repeat(60));

  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch(e) { console.log('Puppeteer not available:', e.message); puppeteer = null; }

  if (puppeteer && ACCESS_TOKEN) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 1440, height: 900 }
    });

    // First navigate to domain to set cookies
    const page = await browser.newPage();

    // Set request interception to inject auth headers
    await page.setRequestInterception(true);
    page.on('request', req => {
      if (req.url().includes('athom.com') || req.url().includes('homey.app')) {
        req.continue({
          headers: {
            ...req.headers(),
            'Authorization': 'Bearer ' + ACCESS_TOKEN
          }
        });
      } else {
        req.continue();
      }
    });

    // Navigate to portal
    await page.goto('https://tools.developer.homey.app/', { waitUntil: 'networkidle2', timeout: 20000 }).catch(e => {});

    // Inject token via evaluate
    await page.evaluate(tok => {
      try {
        localStorage.setItem('__athom_access_token', tok);
        sessionStorage.setItem('access_token', tok);
        // Try setting the store token
        Object.keys(localStorage).forEach(k => {
          if (k.includes('token') || k.includes('auth')) {
            console.log('Existing key:', k, '=', localStorage.getItem(k).slice(0, 30));
          }
        });
      } catch(e) {}
    }, ACCESS_TOKEN).catch(() => {});

    await sleep(2000);

    // Try app page
    const pagesToCapture = [
      { url: `https://tools.developer.homey.app/apps/app/${APP_ID}`, name: 'app_detail' },
      { url: `https://tools.developer.homey.app/apps/app/${APP_ID}/builds`, name: 'builds' },
      { url: `https://my.homey.app/`, name: 'my_homey' },
    ];

    const pageResults = [];
    for (const p of pagesToCapture) {
      try {
        await page.goto(p.url, { waitUntil: 'networkidle2', timeout: 20000 });
        await sleep(3000);
        const shot = path.join(SHOTS, p.name + '_auth.png');
        await page.screenshot({ path: shot, fullPage: true });
        const title   = await page.title().catch(() => '?');
        const content = await page.evaluate(() => document.body?.innerText?.slice(0, 1500) || '').catch(() => '');
        const url_now = page.url();

        console.log(`  ${p.name}: "${title}" | ${content.slice(0,100).replace(/\n/g,' ')}`);
        pageResults.push({ name: p.name, title, url_final: url_now, screenshot: shot, loggedIn: !content.includes('Please log in') });
      } catch(e) {
        console.log(`  ${p.name} ERROR:`, e.message);
        pageResults.push({ name: p.name, error: e.message });
      }
    }

    await browser.close();
    report.phases.puppeteer = pageResults;
  }

  // ── Save & Summary ───────────────────────────────────────────────────────
  const rpath = path.join(SHOTS, 'login-cartography.json');
  fs.writeFileSync(rpath, JSON.stringify(report, null, 2));
  console.log('\n' + '═'.repeat(60));
  console.log('REPORT saved:', rpath);

  // Print CDN summary
  console.log('\n=== SYNTHÈSE CDN ===');
  (report.phases.cdn || []).forEach(b => {
    const icon = b.accessible ? '✅' : '❌';
    console.log(`${icon} Build #${b.buildId} v${b.version}: ${b.archiveStatus} ${b.archiveSizeMb} ${b.urlHasUndefined ? '[URL=undefined!]' : ''}`);
  });

  return report;
}

main().catch(e => {
  console.error('FATAL:', e.stack);
  process.exit(1);
});
