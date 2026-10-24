#!/usr/bin/env node
'use strict';
/**
 * P2975: keep the committed root app.json driver catalog aligned with driver.compose.json.
 *
 * WHY: stable-v5/bastien-home commit a compacted root app.json, while CI publishes the
 * fresh `homey app build` output (.homeybuild/app.json). Driver folders synced from master
 * (P52-auto) never reached the committed root copy, so check:fingerprint-catalog reported
 * "no matching app.json driver" / "manufacturerName mismatch" and blocked `npm run precommit`.
 * This tool upserts the built driver entries into the root file. It never removes a driver
 * that still has a compose file and never touches app id/version/flow/other root keys.
 *
 * Usage: node scripts/ci/sync-root-app-json-drivers.js [--built .homeybuild/app.json] [--check]
 */
const fs = require('fs');
const path = require('path');

function syncDrivers(rootApp, builtApp, composeIds) {
  const built = new Map((builtApp.drivers || []).map(d => [d.id, d]));
  const root = Array.isArray(rootApp.drivers) ? rootApp.drivers : [];
  const keep = composeIds ? new Set(composeIds) : null;
  const added = [];
  const updated = [];
  const seen = new Set();
  const out = [];
  for (const drv of root) {
    seen.add(drv.id);
    const fresh = built.get(drv.id);
    if (!fresh) { out.push(drv); continue; } // WHY: additive only, never drop an entry here
    // WHY: surgical refresh of identity fields only (what pairing + the catalog audit read);
    // the rest of a compacted entry stays as committed so the file does not balloon.
    const before = JSON.stringify(drv);
    const merged = Object.assign({}, drv);
    for (const k of ['name', 'class']) if (fresh[k] !== undefined) merged[k] = fresh[k];
    if (fresh.zigbee) {
      merged.zigbee = Object.assign({}, drv.zigbee || {});
      for (const k of ['manufacturerName', 'productId']) {
        if (fresh.zigbee[k] !== undefined) merged.zigbee[k] = fresh.zigbee[k];
      }
    }
    if (JSON.stringify(merged) !== before) updated.push(drv.id);
    out.push(merged);
  }
  for (const [id, fresh] of built) {
    if (seen.has(id)) continue;
    if (keep && !keep.has(id)) continue;
    out.push(fresh);
    added.push(id);
  }
  out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { app: Object.assign({}, rootApp, { drivers: out }), added, updated };
}

function main(argv) {
  const ROOT = process.cwd();
  const i = argv.indexOf('--built');
  const builtPath = path.resolve(ROOT, i >= 0 ? argv[i + 1] : '.homeybuild/app.json');
  const rootPath = path.join(ROOT, 'app.json');
  const raw = fs.readFileSync(rootPath, 'utf8');
  const rootApp = JSON.parse(raw);
  const builtApp = JSON.parse(fs.readFileSync(builtPath, 'utf8'));
  if (builtApp.id !== rootApp.id) throw new Error(`app id mismatch: built ${builtApp.id} vs root ${rootApp.id}`);
  const driversDir = path.join(ROOT, 'drivers');
  const composeIds = fs.readdirSync(driversDir).filter(d => fs.existsSync(path.join(driversDir, d, 'driver.compose.json')));
  const res = syncDrivers(rootApp, builtApp, composeIds);
  console.log(`added=${res.added.length} updated=${res.updated.length}`);
  if (argv.includes('--check')) return (res.added.length || res.updated.length) ? 1 : 0;
  const minified = !raw.trimStart().startsWith('{\n');
  fs.writeFileSync(rootPath, minified ? JSON.stringify(res.app) : JSON.stringify(res.app, null, 2) + '\n');
  return 0;
}

if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exitCode = 2; }
}
module.exports = { syncDrivers };
