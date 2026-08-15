#!/usr/bin/env node
'use strict';

/**
 * Fetch a Homey *app* diagnostic report by UUID (forum "Diagnostic code").
 *
 * Auth chain (same as CI):
 *   1. HOMEY_REFRESH_TOKEN env  OR  local athom-cli settings.json refresh
 *   2. OAuth refresh → account token
 *   3. delegation audience=apps → apps-api JWT
 *   4. Probe known crash/diagnostic endpoints + optional Gmail cross-check hooks
 *
 * Usage:
 *   node scripts/ci/fetch-homey-app-diag-by-uuid.js f1e5b12d-5f69-4311-aaa7-b8bef967667c
 *   HOMEY_REFRESH_TOKEN=... node scripts/ci/fetch-homey-app-diag-by-uuid.js <uuid>
 *
 * Output (gitignored-friendly):
 *   .github/state/homey-app-diag/<uuid>.json
 *   .github/state/homey-app-diag/<uuid>.sanitized.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.join(__dirname, '..', '..');
const APP_ID = process.env.TARGET_APP_ID || 'com.dlnraja.tuya.zigbee';
const OUT_DIR = path.join(ROOT, '.github', 'state', 'homey-app-diag');

function argUuid() {
  const a = process.argv.slice(2).find((x) => !x.startsWith('-'));
  return (a || process.env.HOMEY_DIAG_UUID || '').trim().toLowerCase();
}

function readCliRefresh() {
  const candidates = [];
  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, 'athom-cli', 'settings.json'));
  }
  const home = process.env.HOME || process.env.USERPROFILE || '';
  candidates.push(
    path.join(home, '.config', 'athom-cli', 'settings.json'),
    path.join(home, '.athom-cli', 'settings.json'),
  );
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const s = JSON.parse(fs.readFileSync(p, 'utf8'));
      const t = s?.homeyApi?.token;
      if (t?.refresh_token) {
        return { refresh: t.refresh_token, access: t.access_token, settingsPath: p, settings: s };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function syncCliSession(cli, body) {
  if (!cli?.settingsPath || !body?.refresh_token) return;
  try {
    cli.settings.homeyApi = cli.settings.homeyApi || {};
    cli.settings.homeyApi.token = {
      ...(cli.settings.homeyApi.token || {}),
      token_type: body.token_type || 'Bearer',
      access_token: body.access_token,
      refresh_token: body.refresh_token,
      expires_in: body.expires_in,
      grant_type: 'refresh_token',
    };
    fs.writeFileSync(cli.settingsPath, JSON.stringify(cli.settings, null, 2));
    console.log('Local athom-cli session synced');
  } catch (e) {
    console.log('CLI sync skipped:', e.message);
  }
}

async function refreshAccountToken() {
  const cli = readCliRefresh();
  const refreshToken = process.env.HOMEY_REFRESH_TOKEN || cli?.refresh;
  if (!refreshToken) {
    throw new Error('No HOMEY_REFRESH_TOKEN env and no athom-cli refresh token');
  }

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
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(`Token refresh failed (${res.status}): ${body.error_description || body.error || 'unknown'}`);
  }
  console.log(`Account token OK (expires_in=${body.expires_in}s)`);
  syncCliSession(cli, body);

  // Persist rotated refresh for CI (same as homey-token-refresh.js)
  if (body.refresh_token && process.env.GH_PAT && process.env.CI) {
    try {
      const { execFileSync } = require('child_process');
      execFileSync('gh', ['secret', 'set', 'HOMEY_REFRESH_TOKEN'], {
        input: body.refresh_token,
        env: { ...process.env, GH_TOKEN: process.env.GH_PAT },
        stdio: ['pipe', 'inherit', 'inherit'],
      });
      console.log('Rotated HOMEY_REFRESH_TOKEN secret updated');
    } catch (e) {
      console.log('::warning::Could not write back HOMEY_REFRESH_TOKEN:', e.message);
    }
  }

  return { accountToken: body.access_token, refreshToken: body.refresh_token || refreshToken };
}

async function getAppsDelegation(accountToken) {
  const attempts = [
    async () => {
      const r = await fetch('https://api.athom.com/delegation/token?audience=apps', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accountToken}`,
          'Content-Type': 'application/json',
        },
        body: '"apps"',
      });
      const text = await r.text();
      return { status: r.status, text };
    },
    async () => {
      const r = await fetch('https://api.athom.com/delegation/token', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accountToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audience: 'apps' }),
      });
      const text = await r.text();
      return { status: r.status, text };
    },
  ];

  for (const fn of attempts) {
    const { status, text } = await fn();
    let token = null;
    try {
      const j = JSON.parse(text);
      token = typeof j === 'string' ? j : j.token || j.access_token || null;
    } catch {
      token = text.trim().replace(/^"|"$/g, '');
    }
    if (status >= 200 && status < 300 && token && token.length > 20) {
      console.log('Apps delegation OK');
      return token;
    }
    console.log(`Delegation attempt HTTP ${status}: ${String(text).slice(0, 120)}`);
  }
  return null;
}

function httpJson(method, url, token, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'com.dlnraja.tuya.zigbee-diag-fetch/1.0',
      Origin: 'https://tools.developer.homey.app',
    };
    let payload = null;
    if (body !== undefined && body !== null) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = https.request(
      {
        hostname: u.hostname,
        path: u.pathname + u.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = JSON.parse(raw);
          } catch {
            /* keep raw */
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            raw,
            json,
            len: raw.length,
          });
        });
      },
    );
    req.on('error', (e) => resolve({ status: 0, error: e.message, raw: '', json: null, len: 0 }));
    req.setTimeout(30000, () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout', raw: '', json: null, len: 0 });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function looksLikeDiagPayload(json, raw, uuid) {
  if (!json && !raw) return false;
  const s = typeof raw === 'string' ? raw : JSON.stringify(json || {});
  if (s.length < 80) return false;
  if (uuid && s.toLowerCase().includes(uuid.toLowerCase())) return true;
  if (json && (json.devices || json.apps || json.logs || json.system || json.report || json.diagnostics)) {
    return true;
  }
  if (/measure_|manufacturerName|productId|zigbee|capability|alarm_/i.test(s) && s.length > 500) {
    return true;
  }
  return false;
}

function sanitizeDiag(obj) {
  let privacy;
  try {
    privacy = require('../../.github/scripts/privacy-redactor');
  } catch {
    privacy = null;
  }
  const text = JSON.stringify(obj, null, 2);
  const redacted = privacy?.redact ? privacy.redact(text) : text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED_IP]')
    .replace(/\b([0-9a-f]{2}:){7}[0-9a-f]{2}\b/gi, '[REDACTED_MAC]');
  try {
    return JSON.parse(redacted);
  } catch {
    return { sanitizedText: redacted.slice(0, 500000) };
  }
}

async function probeEndpoints(uuid, accountToken, appsToken) {
  const tApps = appsToken || accountToken;
  const paths = [
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/crash/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/crashes/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/diagnostic/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/diagnostics/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/log/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/logs/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/report/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/diagnostic/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/diagnostics/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/report/${uuid}`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/crash?limit=50`, tApps],
    ['GET', `https://apps-api.athom.com/api/v1/app/${APP_ID}/crashes?limit=50`, tApps],
    ['GET', `https://api.athom.com/diagnostic/${uuid}`, accountToken],
    ['GET', `https://api.athom.com/diagnostics/${uuid}`, accountToken],
    ['GET', `https://api.athom.com/report/${uuid}`, accountToken],
    ['GET', `https://api.athom.com/app/${APP_ID}/diagnostic/${uuid}`, accountToken],
    ['GET', `https://api.athom.com/app/${APP_ID}/diagnostics/${uuid}`, accountToken],
    ['POST', `https://apps-api.athom.com/api/v1/app/${APP_ID}/diagnostic`, tApps, { id: uuid }],
    ['POST', `https://apps-api.athom.com/api/v1/diagnostics`, tApps, { id: uuid, appId: APP_ID }],
    ['POST', `https://api.athom.com/diagnostics`, accountToken, { code: uuid }],
    ['POST', `https://api.athom.com/diagnostic`, accountToken, { id: uuid }],
  ];

  const results = [];
  let hit = null;
  for (const [method, url, token, body] of paths) {
    const r = await httpJson(method, url, token, body);
    const snippet = (r.raw || r.error || '').slice(0, 160).replace(/\s+/g, ' ');
    const entry = {
      method,
      url,
      status: r.status,
      error: r.error || null,
      len: r.len,
      snippet,
    };
    results.push(entry);
    const ok = r.status >= 200 && r.status < 300 && looksLikeDiagPayload(r.json, r.raw, uuid);
    console.log(`${method} ${url.replace(/^https:\/\//, '')} → ${r.status || r.error} (${r.len}b)`);
    if (ok && !hit) {
      hit = { url, method, status: r.status, json: r.json, raw: r.raw };
    } else if (r.status >= 200 && r.status < 300 && r.json) {
      // Crash list: search for uuid
      const blob = JSON.stringify(r.json);
      if (blob.toLowerCase().includes(uuid.toLowerCase()) && !hit) {
        hit = { url, method, status: r.status, json: r.json, raw: r.raw, matchedInList: true };
      }
    }
  }
  return { results, hit };
}

async function tryAthomAppsSdk(uuid, appsToken) {
  if (!appsToken) return null;
  try {
    const AthomAppsAPI = require('homey-api/lib/AthomAppsAPI');
    const api = new AthomAppsAPI();
    const candidates = [
      ['getCrash', { $token: appsToken, appId: APP_ID, crashId: uuid }],
      ['getCrashes', { $token: appsToken, appId: APP_ID, query: { id: uuid } }],
      ['getDiagnostic', { $token: appsToken, appId: APP_ID, diagnosticId: uuid }],
      ['getDiagnostics', { $token: appsToken, appId: APP_ID, query: { id: uuid } }],
      ['getLog', { $token: appsToken, appId: APP_ID, logId: uuid }],
      ['getReport', { $token: appsToken, reportId: uuid }],
    ];
    for (const [name, args] of candidates) {
      if (typeof api[name] !== 'function') {
        console.log(`SDK ${name}: not a function`);
        continue;
      }
      try {
        const data = await api[name](args);
        const raw = JSON.stringify(data);
        console.log(`SDK ${name}: ok len=${raw.length}`);
        if (looksLikeDiagPayload(data, raw, uuid) || raw.toLowerCase().includes(uuid)) {
          return { via: `AthomAppsAPI.${name}`, json: data, raw };
        }
      } catch (e) {
        console.log(`SDK ${name}: ${e.message.slice(0, 120)}`);
      }
    }
  } catch (e) {
    console.log('AthomAppsAPI load failed:', e.message);
  }
  return null;
}

async function scanBuildCrashesForUuid(uuid) {
  try {
    const { createClient, getBuilds } = require('../../.github/scripts/homey-apps-api-client');
    const client = await createClient({ log: (m) => console.log(m) });
    const builds = await getBuilds(client, APP_ID, { limit: 500 });
    const sorted = [...builds].sort((a, b) => Number(b.id) - Number(a.id));
    // Manual app-diag logs land on the build the user had installed — scan recent 9.x + high ids.
    const targets = sorted
      .filter((b) => /^9\./.test(String(b.version || '')) || Number(b.id) > 2500)
      .slice(0, 60);
    console.log(`Scanning ${targets.length} recent builds for Log ID ${uuid}`);
    for (const b of targets) {
      try {
        const crashes = await client.api.getCrashes({
          $token: client.token,
          appId: APP_ID,
          buildId: String(b.id),
          query: { limit: 50 },
        });
        const arr = Array.isArray(crashes) ? crashes : crashes?.data || [];
        const hit = arr.find((cr) => String(cr.stack || '').toLowerCase().includes(uuid.toLowerCase()));
        if (hit) {
          console.log(`FOUND in build ${b.id} v${b.version}`);
          return {
            via: 'AthomAppsAPI.getCrashes',
            buildId: b.id,
            version: b.version,
            json: hit,
            raw: JSON.stringify(hit),
          };
        }
      } catch (e) {
        if (/too many requests/i.test(e.message)) {
          console.log('Rate limited — stopping build scan early');
          break;
        }
      }
    }
  } catch (e) {
    console.log('build-crash scan failed:', e.message);
  }
  return null;
}

async function main() {
  const uuid = argUuid();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    console.error('Usage: node scripts/ci/fetch-homey-app-diag-by-uuid.js <uuid>');
    process.exit(2);
  }

  console.log(`Fetching Homey app diag ${uuid} for ${APP_ID}`);

  // Fast path: Athom Apps API crashes embed "Log ID: <uuid>" for manual diagnostics.
  const crashHit = await scanBuildCrashesForUuid(uuid);
  if (crashHit) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const stack = String(crashHit.json?.stack || '');
    const report = {
      fetchedAt: new Date().toISOString(),
      uuid,
      appId: APP_ID,
      found: true,
      via: crashHit.via,
      buildId: crashHit.buildId,
      version: crashHit.version,
      homeyVersion: crashHit.json?.homeyVersion,
      createdAt: crashHit.json?.createdAt,
      stack,
    };
    fs.writeFileSync(path.join(OUT_DIR, `${uuid}.json`), JSON.stringify({
      ...report,
      stack: stack.slice(0, 200000),
    }, null, 2));
    let privacy;
    try { privacy = require('../../.github/scripts/privacy-redactor'); } catch { privacy = null; }
    const sanitizedStack = privacy?.redact ? privacy.redact(stack) : stack;
    fs.writeFileSync(path.join(OUT_DIR, `${uuid}.sanitized.json`), JSON.stringify({
      fetchedAt: report.fetchedAt,
      uuid,
      found: true,
      via: crashHit.via,
      buildId: crashHit.buildId,
      version: crashHit.version,
      homeyVersion: report.homeyVersion,
      createdAt: report.createdAt,
      logSanitized: sanitizedStack,
    }, null, 2));
    console.log(JSON.stringify({
      found: true,
      via: crashHit.via,
      buildId: crashHit.buildId,
      version: crashHit.version,
      logBytes: stack.length,
    }, null, 2));
    return;
  }

  const { accountToken } = await refreshAccountToken();
  const appsToken = await getAppsDelegation(accountToken);

  const me = await httpJson('GET', 'https://api.athom.com/user/me', accountToken);
  console.log(`user/me → ${me.status} (${me.len}b)`);

  const sdkHit = await tryAthomAppsSdk(uuid, appsToken || accountToken);
  const { results, hit } = await probeEndpoints(uuid, accountToken, appsToken);

  const report = {
    fetchedAt: new Date().toISOString(),
    uuid,
    appId: APP_ID,
    userMeStatus: me.status,
    probe: results,
    hit: hit
      ? {
          url: hit.url,
          method: hit.method,
          status: hit.status,
          matchedInList: !!hit.matchedInList,
          payload: hit.json || null,
          rawPreview: (hit.raw || '').slice(0, 2000),
        }
      : null,
    sdkHit: sdkHit
      ? { via: sdkHit.via, payload: sdkHit.json }
      : null,
    notes: [],
  };

  if (!report.hit && !report.sdkHit) {
    report.notes.push(
      'No apps-api/account endpoint returned this UUID. Homey app-diag codes are often only visible in Developer Tools UI or the Homey→developer email (Gmail).',
    );
    report.notes.push('Next: Gmail search for the UUID + Puppeteer tools.developer.homey.app paste.');
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const rawPath = path.join(OUT_DIR, `${uuid}.json`);
  const sanPath = path.join(OUT_DIR, `${uuid}.sanitized.json`);
  fs.writeFileSync(rawPath, JSON.stringify(report, null, 2));

  const payload = report.hit?.payload || report.sdkHit?.payload || null;
  const sanitized = {
    fetchedAt: report.fetchedAt,
    uuid,
    appId: APP_ID,
    found: !!(report.hit || report.sdkHit),
    notes: report.notes,
    probeSummary: results.map((r) => ({
      method: r.method,
      url: r.url,
      status: r.status,
      len: r.len,
    })),
    payload: payload ? sanitizeDiag(payload) : null,
  };
  fs.writeFileSync(sanPath, JSON.stringify(sanitized, null, 2));
  console.log(`Wrote ${rawPath}`);
  console.log(`Wrote ${sanPath}`);
  console.log(JSON.stringify({
    found: sanitized.found,
    probeOk: results.filter((r) => r.status >= 200 && r.status < 300).length,
    notes: report.notes,
  }, null, 2));

  // Soft success: script always exits 0 so GHA continue-on-error can upload artifacts;
  // set HOMEY_DIAG_REQUIRE=1 to fail when not found.
  if (!sanitized.found && /^(1|true)$/i.test(process.env.HOMEY_DIAG_REQUIRE || '')) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
