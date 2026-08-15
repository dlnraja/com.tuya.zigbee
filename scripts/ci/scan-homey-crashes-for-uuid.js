#!/usr/bin/env node
'use strict';

/**
 * Scan Athom Apps API crashes across recent builds for a diagnostic UUID,
 * then optionally open Developer Tools via Puppeteer and paste the code.
 *
 * Usage:
 *   node scripts/ci/scan-homey-crashes-for-uuid.js f1e5b12d-5f69-4311-aaa7-b8bef967667c
 *   node scripts/ci/scan-homey-crashes-for-uuid.js <uuid> --puppeteer
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..', '..');
const APP_ID = process.env.TARGET_APP_ID || 'com.dlnraja.tuya.zigbee';
const OUT_DIR = path.join(ROOT, '.github', 'state', 'homey-app-diag');
const UUID = (process.argv[2] || process.env.HOMEY_DIAG_UUID || '').trim().toLowerCase();
const DO_PUPPETEER = process.argv.includes('--puppeteer') || process.env.HOMEY_DIAG_PUPPETEER === '1';

function stripQuotes(s) {
  return String(s || '').trim().replace(/^"|"$/g, '');
}

function readCli() {
  const p = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'athom-cli', 'settings.json')
    : null;
  if (!p || !fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

async function refresh() {
  const cli = readCli();
  const refreshToken = process.env.HOMEY_REFRESH_TOKEN || cli?.homeyApi?.token?.refresh_token;
  if (!refreshToken) throw new Error('No refresh token');
  const { ATHOM_API_CLIENT_ID, ATHOM_API_CLIENT_SECRET } = require('homey/config');
  const basic = Buffer.from(`${ATHOM_API_CLIENT_ID}:${ATHOM_API_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api.athom.com/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
  });
  const body = await res.json();
  if (!res.ok || !body.access_token) {
    throw new Error(`refresh failed ${res.status}`);
  }
  if (cli && body.refresh_token) {
    cli.homeyApi.token = {
      ...cli.homeyApi.token,
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_in: body.expires_in,
    };
    const p = path.join(process.env.APPDATA, 'athom-cli', 'settings.json');
    fs.writeFileSync(p, JSON.stringify(cli, null, 2));
  }
  return body.access_token;
}

async function appsToken(account) {
  const r = await fetch('https://api.athom.com/delegation/token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${account}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ audience: 'apps' }),
  });
  const text = await r.text();
  try {
    const j = JSON.parse(text);
    return typeof j === 'string' ? j : j.token || j.access_token || stripQuotes(text);
  } catch {
    return stripQuotes(text);
  }
}

function httpGet(url, token) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          Origin: 'https://tools.developer.homey.app',
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve({ status: res.statusCode, body });
        });
      },
    );
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    req.setTimeout(20000, () => {
      req.destroy();
      resolve({ status: 0, body: 'timeout' });
    });
    req.end();
  });
}

async function scanCrashes(token) {
  const buildsRes = await httpGet(
    `https://apps-api.athom.com/api/v1/app/${APP_ID}/build?limit=30`,
    token,
  );
  let builds = [];
  try {
    const j = JSON.parse(buildsRes.body);
    builds = Array.isArray(j) ? j : j.data || j.builds || [];
  } catch {
    builds = [];
  }
  console.log(`Builds HTTP ${buildsRes.status}, count=${builds.length}`);

  const matches = [];
  const summary = [];
  for (const b of builds.slice(0, 25)) {
    const id = b.id || b.buildId;
    const ver = b.version;
    const crash = await httpGet(
      `https://apps-api.athom.com/api/v1/app/${APP_ID}/build/${id}/crash?limit=50`,
      token,
    );
    const has = (crash.body || '').toLowerCase().includes(UUID);
    summary.push({
      buildId: id,
      version: ver,
      status: crash.status,
      len: (crash.body || '').length,
      hasUuid: has,
    });
    console.log(`build ${id} v${ver} crash→${crash.status} len=${(crash.body || '').length} uuid=${has}`);
    if (has) {
      let parsed = null;
      try {
        parsed = JSON.parse(crash.body);
      } catch {
        /* keep raw */
      }
      matches.push({ buildId: id, version: ver, crash: parsed || crash.body });
    }
  }

  // Direct crash id guesses
  for (const url of [
    `https://apps-api.athom.com/api/v1/app/crash/${UUID}`,
    `https://apps-api.athom.com/api/v1/crash/${UUID}`,
    `https://apps-api.athom.com/api/v1/app/${APP_ID}/crash/${UUID}`,
  ]) {
    const r = await httpGet(url, token);
    console.log(`${url.replace('https://', '')} → ${r.status}`);
    if (r.status >= 200 && r.status < 300 && (r.body || '').length > 50) {
      matches.push({ url, body: r.body });
    }
  }

  return { builds: summary, matches };
}

async function puppeteerPaste(uuid) {
  let launchWithSession;
  try {
    ({ launchWithSession } = require('../../.github/scripts/athom-session-inject'));
  } catch (e) {
    console.log('session inject unavailable:', e.message);
    return null;
  }

  const { browser, page } = await launchWithSession({ headless: true });
  const captured = [];
  page.on('response', async (res) => {
    try {
      const url = res.url();
      if (!/diagnostic|crash|log|report|apps-api|athom\.com/i.test(url)) return;
      const status = res.status();
      let body = '';
      try {
        body = await res.text();
      } catch {
        body = '';
      }
      if (body && (body.toLowerCase().includes(uuid) || body.length > 2000)) {
        captured.push({
          url: url.slice(0, 300),
          status,
          len: body.length,
          preview: body.slice(0, 500),
          full: body.length < 2_000_000 ? body : body.slice(0, 2_000_000),
        });
      }
    } catch {
      /* ignore */
    }
  });

  const candidates = [
    `https://tools.developer.homey.app/tools/system?code=${uuid}`,
    `https://tools.developer.homey.app/tools/system?id=${uuid}`,
    `https://tools.developer.homey.app/tools/system?diagnostic=${uuid}`,
    `https://tools.developer.homey.app/?diagnostic=${uuid}`,
    `https://tools.developer.homey.app/apps/app/${APP_ID}`,
    'https://tools.developer.homey.app/tools/system',
  ];

  const pageTexts = [];
  for (const url of candidates) {
    console.log('navigate', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 2500));

    // Try paste into any visible input
    await page.evaluate((code) => {
      const inputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of inputs) {
        const ph = `${el.placeholder || ''} ${el.name || ''} ${el.id || ''}`.toLowerCase();
        if (/diag|code|report|uuid|reference/i.test(ph) || inputs.length <= 3) {
          el.focus();
          el.value = code;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
      const buttons = Array.from(document.querySelectorAll('button, a, [role=button]'));
      for (const b of buttons) {
        const t = (b.textContent || '').toLowerCase();
        if (/load|fetch|open|submit|search|view|get|go/i.test(t)) {
          try {
            b.click();
          } catch {
            /* ignore */
          }
        }
      }
    }, uuid).catch(() => {});

    await new Promise((r) => setTimeout(r, 3000));
    const text = await page.evaluate(() => (document.body && document.body.innerText) || '').catch(() => '');
    pageTexts.push({ url, text: text.slice(0, 4000), hasUuid: text.toLowerCase().includes(uuid) });
    const shot = path.join(OUT_DIR, `puppeteer-${uuid.slice(0, 8)}-${pageTexts.length}.png`);
    await page.screenshot({ path: shot, fullPage: false }).catch(() => {});
  }

  await browser.close().catch(() => {});
  return { captured, pageTexts };
}

async function main() {
  if (!/^[0-9a-f-]{36}$/i.test(UUID)) {
    console.error('Need UUID arg');
    process.exit(2);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const account = await refresh();
  const apps = await appsToken(account);
  console.log('auth ok');

  const scan = await scanCrashes(apps);
  let puppeteer = null;
  if (DO_PUPPETEER) {
    try {
      puppeteer = await puppeteerPaste(UUID);
    } catch (e) {
      puppeteer = { error: e.message };
      console.log('puppeteer error:', e.message);
    }
  }

  const out = {
    fetchedAt: new Date().toISOString(),
    uuid: UUID,
    appId: APP_ID,
    crashScan: scan,
    puppeteer: puppeteer
      ? {
          error: puppeteer.error || null,
          capturedCount: puppeteer.captured?.length || 0,
          pages: puppeteer.pageTexts,
          captured: (puppeteer.captured || []).map((c) => ({
            url: c.url,
            status: c.status,
            len: c.len,
            preview: c.preview,
          })),
        }
      : null,
  };

  // Persist any large captured bodies separately
  if (puppeteer?.captured?.length) {
    for (let i = 0; i < puppeteer.captured.length; i++) {
      const c = puppeteer.captured[i];
      const fp = path.join(OUT_DIR, `${UUID}.capture-${i}.json`);
      fs.writeFileSync(fp, c.full);
      console.log('wrote capture', fp, c.len);
    }
  }

  const outPath = path.join(OUT_DIR, `${UUID}.crash-scan.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log('wrote', outPath);
  console.log(JSON.stringify({
    matches: scan.matches.length,
    puppeteerCaptures: puppeteer?.captured?.length || 0,
    pagesWithUuid: puppeteer?.pageTexts?.filter((p) => p.hasUuid).length || 0,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
