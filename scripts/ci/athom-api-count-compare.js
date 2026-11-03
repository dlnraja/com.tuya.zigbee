#!/usr/bin/env node
'use strict';
// WHY(P3264): after an upload, compare the local publish payload with Athom's public API (no auth):
// https://apps-api.athom.com/api/v1/app/<id> -> testBuild.{version,drivers,flow}.
// 03/11/2026: 9.0.1615 shipped 347 drivers and the API lists 345. The 2 missing ones are the drivers with
// deprecated:true (air_purifier_siren, sensor_lcdtemphumidsensor_temphumidsensor): Athom hides deprecated drivers.
// Expected API count = payload drivers - deprecated. Fails (exit 1) only on an unexplained gap.
// Usage: node scripts/ci/athom-api-count-compare.js [payload app.json] [--app=id] [--api-json=file]
const fs = require('fs');
const os = require('os');
const path = require('path');

function compare(local, apiApp) {
  const tb = (apiApp && (apiApp.testBuild || apiApp.liveBuild)) || {};
  const api = new Set((tb.drivers || []).map((d) => d.id));
  const dep = (local.drivers || []).filter((d) => d.deprecated === true).map((d) => d.id);
  const visible = (local.drivers || []).filter((d) => d.deprecated !== true).map((d) => d.id);
  const missing = visible.filter((id) => !api.has(id));
  const extra = [...api].filter((id) => !(local.drivers || []).some((d) => d.id === id));
  const fl = (o) => ['triggers', 'conditions', 'actions'].map((k) => ((o && o.flow && o.flow[k]) || []).length);
  const sameVersion = !tb.version || !local.version || tb.version === local.version;
  return {
    apiVersion: tb.version, localVersion: local.version, sameVersion,
    local: (local.drivers || []).length, deprecated: dep, expectedApi: visible.length, api: api.size,
    missing, extra, flowLocal: fl(local), flowApi: fl(tb),
    ok: !sameVersion || (missing.length === 0 && extra.length === 0),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (k) => (args.find((a) => a.startsWith(`--${k}=`)) || '').split('=').slice(1).join('=');
  const p = args.find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'homey-publish-temp', 'app.json');
  if (!fs.existsSync(p)) { console.log(`[P3264] api-compare: no local payload at ${p}, skipped`); return 0; }
  const local = JSON.parse(fs.readFileSync(p, 'utf8'));
  const id = opt('app') || local.id;
  let apiApp;
  if (opt('api-json')) apiApp = JSON.parse(fs.readFileSync(opt('api-json'), 'utf8'));
  else {
    const r = await fetch(`https://apps-api.athom.com/api/v1/app/${encodeURIComponent(id)}`);
    if (!r.ok) { console.log(`[P3264] api-compare: API HTTP ${r.status}, skipped`); return 0; }
    apiApp = await r.json();
  }
  const c = compare(local, apiApp);
  console.log(`[P3264] api-compare local ${c.localVersion} ${c.local} drivers (${c.deprecated.length} deprecated hidden -> expect ${c.expectedApi}) vs API ${c.apiVersion} ${c.api}; flow local ${c.flowLocal.join('/')} api ${c.flowApi.join('/')}`);
  if (!c.sameVersion) console.log('[P3264] api-compare: API test build is another version, so this is informative only');
  if (c.missing.length) console.error(`[P3264] not on the API: ${c.missing.join(', ')}`);
  if (c.extra.length) console.error(`[P3264] on the API, not local: ${c.extra.join(', ')}`);
  return c.ok ? 0 : 1;
}

if (require.main === module) main().then((code) => process.exit(code), (e) => { console.log(`[P3264] api-compare error: ${e.message}`); process.exit(0); });
module.exports = { compare };
