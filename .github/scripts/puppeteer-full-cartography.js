// puppeteer-full-cartography.js - Cartographie VISUELLE Athom portal
// Usage: node .github/scripts/puppeteer-full-cartography.js
'use strict';

const fs   = require('fs');
const path = require('path');
const https = require('https');

const APP_ID  = 'com.dlnraja.tuya.zigbee';
const SHOTS   = path.resolve('screenshots/portal');
fs.mkdirSync(SHOTS, { recursive: true });

// ── Token Athom ─────────────────────────────────────────────────────────────
let TOKEN = '';
try {
  const cfg = JSON.parse(fs.readFileSync(
    path.join(process.env.APPDATA || '', 'athom-cli', 'settings.json'), 'utf8'
  ));
  TOKEN = cfg?.homeyApi?.token?.access_token || '';
  console.log('Token:', TOKEN.substring(0, 25) + '...');
} catch(e) { console.log('No Athom token:', e.message); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── API helper ───────────────────────────────────────────────────────────────
function apiGet(url, opts) {
  return new Promise(resolve => {
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'homey-cli/6.4.0',
    };
    if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
    if (opts && opts.headers) Object.assign(headers, opts.headers);

    const req = https.get(url, { headers }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, raw: d.slice(0, 500) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.setTimeout(15000, () => { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const report = {
    timestamp: new Date().toISOString(),
    app: APP_ID,
    token_ok: !!TOKEN,
    api: {},
    pages: [],
    builds: [],
    screenshots: [],
    analysis: {}
  };

  // ─── PHASE 1: API REST directe ──────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 1: API REST DIRECTE');
  console.log('═'.repeat(60));

  const apiEndpoints = [
    // Athom Apps API (dev portal backend)
    [`https://apps-api.developer.homey.app/api/app/${APP_ID}`,          'dev_app_info'],
    [`https://apps-api.developer.homey.app/api/app/${APP_ID}/builds`,   'dev_builds'],
    // Athom public store API
    [`https://api.athom.com/app/${APP_ID}`,                              'store_app_info'],
    // CDN direct - check if latest archive is accessible
    [`https://apps.homeycdn.net/app/${APP_ID}/latest`,                   'cdn_latest'],
  ];

  for (const [url, key] of apiEndpoints) {
    console.log('\nGET ' + url.replace('https://', '').slice(0, 70));
    const r = await apiGet(url);
    report.api[key] = { url, ...r };

    if (r.data) {
      const s = JSON.stringify(r.data);
      console.log('  status=' + r.status + '  len=' + s.length + 'B');
      // Extract useful info
      if (Array.isArray(r.data)) {
        console.log('  Array[' + r.data.length + '] items');
        r.data.slice(0, 5).forEach((item, i) => {
          console.log('  [' + i + '] id=' + item.id + ' v=' + item.version + ' state=' + item.state +
            ' size=' + (item.size ? (item.size/1024/1024).toFixed(2) + 'MB' : '?'));
        });
        report.builds = r.data.slice(0, 20);
      } else {
        const d = r.data;
        console.log('  id=' + d.id + ' v=' + d.version + ' state=' + d.state);
        console.log('  testBuild:', d.testBuild ? 'v'+d.testBuild.version+' ['+d.testBuild.state+']' : 'none');
        console.log('  liveBuild:', d.liveBuild ? 'v'+d.liveBuild.version+' ['+d.liveBuild.state+']' : 'none');
      }
    } else if (r.error) {
      console.log('  ERROR: ' + r.error);
    } else {
      console.log('  status=' + r.status + ' raw:', (r.raw || '').slice(0, 150));
    }
  }

  // ─── PHASE 2: Tester les URLs CDN des builds connus ─────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 2: CDN ARCHIVE URLS');
  console.log('═'.repeat(60));

  // Builds à tester (depuis le rapport cartographique)
  const knownBuilds = [
    { id: 2159, version: '8.1.6',  hashA: '1baccab5-6eaf-424f-9dae-8a0ba944d21b', hashB: '5836c4ed-3ce6-4d79-afb2-16c5e3c43449' },
    { id: 2204, version: '8.1.17', hashA: 'undefined', hashB: 'c98df506-6ef7-4465-9aef-ee6602244763' },
  ];

  for (const b of knownBuilds) {
    const archiveUrl = `https://apps.homeycdn.net/app/${APP_ID}/${b.id}/${b.hashA}/${b.hashB}.tar.gz`;
    const iconUrl    = `https://apps.homeycdn.net/app/${APP_ID}/${b.id}/${b.hashA}/assets/icon.svg`;

    console.log(`\nBuild #${b.id} v${b.version}:`);
    console.log('  Archive URL:', archiveUrl.slice(0, 100));

    // Test archive HEAD request
    const archResp = await new Promise(resolve => {
      const u = new URL(archiveUrl);
      const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'HEAD' }, res => {
        resolve({ status: res.statusCode, headers: res.headers });
      });
      req.on('error', e => resolve({ error: e.message }));
      req.setTimeout(10000, () => { req.destroy(); resolve({ error: 'timeout' }); });
      req.end();
    });

    console.log('  Archive HEAD:', archResp.status || archResp.error,
      archResp.headers ? 'content-length=' + archResp.headers['content-length'] : '');
    report.analysis['build_' + b.id] = {
      archiveUrl, status: archResp.status,
      contentLength: archResp.headers && archResp.headers['content-length'],
      hashA_undefined: b.hashA === 'undefined'
    };
  }

  // ─── PHASE 3: Puppeteer - Screenshots visuels ───────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 3: PUPPETEER VISUAL SCREENSHOTS');
  console.log('═'.repeat(60));

  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch(e) { console.log('Puppeteer not installed locally:', e.message); puppeteer = null; }

  if (puppeteer) {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox', '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', '--disable-gpu',
        '--window-size=1440,900'
      ],
      defaultViewport: { width: 1440, height: 900 }
    });

    const pagesToVisit = [
      { url: `https://tools.developer.homey.app/apps/app/${APP_ID}`,         name: '01_app_overview',    wait: 4000 },
      { url: `https://tools.developer.homey.app/apps/app/${APP_ID}/builds`,  name: '02_builds_list',     wait: 4000 },
      { url: `https://tools.developer.homey.app/apps/app/${APP_ID}/builds/2159`, name: '03_build_2159_good', wait: 3000 },
      { url: `https://tools.developer.homey.app/apps/app/${APP_ID}/builds/2204`, name: '04_build_2204_bad',  wait: 3000 },
      { url: 'https://tools.developer.homey.app/',                            name: '00_portal_home',    wait: 3000 },
    ];

    for (const p of pagesToVisit) {
      try {
        console.log('\nNavigating:', p.name, '->', p.url.slice(0, 70));
        const page = await browser.newPage();

        // Inject auth
        await page.evaluateOnNewDocument(tok => {
          try {
            localStorage.setItem('athom_token', tok);
            localStorage.setItem('access_token', tok);
            document.cookie = `token=${tok}; domain=.homey.app; path=/`;
          } catch(e) {}
        }, TOKEN);

        const resp = await page.goto(p.url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        }).catch(e => ({ status: () => 'nav_error', error: e.message }));

        await sleep(p.wait);

        const shot = path.join(SHOTS, p.name + '.png');
        await page.screenshot({ path: shot, fullPage: true });

        const title   = await page.title().catch(() => '?');
        const content = await page.evaluate(() => {
          const body = document.body;
          return body ? body.innerText.slice(0, 2000) : '';
        }).catch(() => '');

        const url_final = page.url();

        console.log('  Title:', title);
        console.log('  Final URL:', url_final.slice(0, 80));
        console.log('  Content:', content.replace(/\s+/g, ' ').slice(0, 300));
        console.log('  Screenshot:', shot);

        report.pages.push({
          name: p.name,
          url_requested: p.url,
          url_final,
          title,
          content: content.slice(0, 1000),
          screenshot: shot,
          redirected: url_final !== p.url
        });

        await page.close();
      } catch(e) {
        console.log('  ERROR:', e.message);
        report.pages.push({ name: p.name, url: p.url, error: e.message });
      }
    }

    await browser.close();
  }

  // ─── PHASE 4: Analyse & Rapport ─────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('PHASE 4: ANALYSE & RAPPORT');
  console.log('═'.repeat(60));

  // Analyse des builds depuis la cartographie existante
  const cartoFile = 'screenshots/cartography/report.json';
  if (fs.existsSync(cartoFile)) {
    const carto = JSON.parse(fs.readFileSync(cartoFile, 'utf8'));
    report.previous_cartography = {
      builds: carto.builds,
      comparison: carto.comparison,
      timestamp: carto.timestamp
    };

    console.log('\nPrevious cartography:', carto.timestamp);
    console.log('Build #2159:', JSON.stringify(carto.builds && carto.builds['2159'] || {}).slice(0, 200));
    console.log('Build #2204:', JSON.stringify(carto.builds && carto.builds['2204'] || {}).slice(0, 200));
  }

  // Key findings
  report.key_findings = {
    archive_url_2204_has_undefined: true,
    archive_url_2159_has_uuid:      true,
    probable_cause: 'archive parsing failed on Athom side: archive hash = undefined means app.json was not parsed',
    good_build_size_mb: (17326313 / 1024 / 1024).toFixed(2),
    bad_build_state: 'processing_failed',
    tar_format_confirmed: 'tar.gz (not zip)'
  };

  // Save report
  const rpath = path.join(SHOTS, 'cartography-full.json');
  fs.writeFileSync(rpath, JSON.stringify(report, null, 2));
  fs.writeFileSync('screenshots/cartography/puppeteer-report.json', JSON.stringify(report, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('DONE. Report saved to:', rpath);
  console.log('Screenshots in:', SHOTS);
  console.log('Pages captured:', report.pages.length);
  console.log('API endpoints tested:', Object.keys(report.api).length);

  // Print screenshot list for embedding
  report.screenshots = report.pages.filter(p => !p.error).map(p => ({
    name: p.name,
    path: p.screenshot,
    title: p.title,
    redirected: p.redirected
  }));

  return report;
}

main().catch(e => {
  console.error('FATAL:', e.stack || e.message);
  process.exit(1);
});
