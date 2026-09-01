'use strict';
/**
 * List recent Homey app diagnostic crashes (tip builds).
 * Usage: node reports/inbox-l99-2026-08-31/_list-recent-crashes.js [buildLimit=8] [perBuild=15]
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
process.chdir(ROOT);

async function main() {
  // Reuse auth helpers by requiring the fetch script's patterns via child spawn of athom
  const { spawnSync } = require('child_process');
  const buildLimit = Number(process.argv[2] || 10);
  const perBuild = Number(process.argv[3] || 20);

  // Inline minimal copy of auth from fetch script
  const fetchModPath = path.join(ROOT, 'scripts/ci/fetch-homey-app-diag-by-uuid.js');
  // Execute embedded listing via evaluating fetch file helpers — instead call Homey via duplicated minimal flow:
  const fs = require('fs');
  const https = require('https');

  function readCliRefresh() {
    const candidates = [];
    if (process.env.APPDATA) candidates.push(path.join(process.env.APPDATA, 'athom-cli', 'settings.json'));
    const home = process.env.HOME || process.env.USERPROFILE || '';
    candidates.push(path.join(home, '.config', 'athom-cli', 'settings.json'), path.join(home, '.athom-cli', 'settings.json'));
    for (const p of candidates) {
      try {
        if (!fs.existsSync(p)) continue;
        const s = JSON.parse(fs.readFileSync(p, 'utf8'));
        const t = s?.homeyApi?.token;
        if (t?.refresh_token) return { refresh: t.refresh_token, access: t.access_token, settingsPath: p, settings: s };
      } catch { /* */ }
    }
    return null;
  }

  function httpJson(method, url, headers, body) {
    return new Promise((resolve, reject) => {
      const u = new URL(url);
      const req = https.request({
        hostname: u.hostname, path: u.pathname + u.search, method, headers,
      }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try { resolve({ status: res.statusCode, json: JSON.parse(raw) }); }
          catch { resolve({ status: res.statusCode, raw }); }
        });
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  const cli = readCliRefresh();
  if (!cli) throw new Error('no athom-cli refresh');
  const refreshBody = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: process.env.HOMEY_REFRESH_TOKEN || cli.refresh,
    client_id: 'athom-cli',
  }).toString();
  const tok = await httpJson('POST', 'https://api.athom.com/oauth2/token', {
    'Content-Type': 'application/x-www-form-urlencoded',
  }, refreshBody);
  if (tok.status >= 400) throw new Error('oauth refresh failed ' + tok.status);
  const account = tok.json.access_token;

  const del = await httpJson('POST', 'https://api.athom.com/delegation/token?audience=apps', {
    Authorization: `Bearer ${account}`,
    'Content-Type': 'application/json',
  }, '{}');
  if (del.status >= 400) throw new Error('delegation failed ' + del.status);
  const appsToken = typeof del.json === 'string' ? del.json : (del.json.token || del.json.access_token);
  console.log('apps token ok');

  // Use AthomAppsAPI via dynamic require if available
  let AthomAppsAPI;
  try { AthomAppsAPI = require('homey-api').AthomAppsAPI; } catch {
    try { AthomAppsAPI = require('athom-api').AthomAppsAPI; } catch (e) {
      console.error('no AthomAppsAPI', e.message);
    }
  }

  const APP_ID = 'com.dlnraja.tuya.zigbee';
  if (AthomAppsAPI) {
    const client = new AthomAppsAPI({ token: appsToken });
    const builds = await client.getBuilds({ appId: APP_ID, limit: 50 });
    const sorted = [...builds].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, buildLimit);
    const out = [];
    for (const b of sorted) {
      try {
        const crashes = await client.getCrashes({ appId: APP_ID, buildId: b.id, limit: perBuild });
        const list = Array.isArray(crashes) ? crashes : (crashes?.crashes || crashes?.data || []);
        for (const c of list) {
          const id = c.id || c.crashId || c.uuid;
          const msg = (c.message || c.userMessage || c.comments || '').toString().replace(/\s+/g, ' ').slice(0, 120);
          const created = c.created || c.createdAt || c.date;
          out.push({ buildId: b.id, version: b.version, id, msg, created, homey: c.homeyVersion });
        }
        console.log(`build ${b.id} v${b.version}: ${list.length} crashes`);
      } catch (e) {
        console.log(`build ${b.id} crash list fail:`, e.message);
      }
    }
    const dest = path.join(__dirname, 'recent-crashes.json');
    fs.writeFileSync(dest, JSON.stringify(out, null, 2));
    console.log('wrote', dest, 'n=', out.length);
    for (const r of out.slice(0, 40)) {
      console.log(`#${r.buildId} ${r.version} ${r.id} | ${r.msg}`);
    }
    return;
  }

  console.log('fallback: no SDK — skip');
}

main().catch((e) => { console.error(e); process.exit(1); });
