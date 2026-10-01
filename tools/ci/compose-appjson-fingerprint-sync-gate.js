#!/usr/bin/env node
/**
 * P2791 — compose ↔ app.json fingerprint drift gate (check only, never writes).
 *
 * The published app.json must carry exactly the manufacturerName / productId sets declared in each
 * drivers/<id>/driver.compose.json (order ignored, exact case kept). A drift means a device that
 * pairs locally from compose would not pair from the shipped manifest, or the reverse.
 * Fix with: node tools/ci/sync-appjson-with-drivers.js (or a homey build) and commit app.json.
 *
 * Usage: node tools/ci/compose-appjson-fingerprint-sync-gate.js [--json]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

function diffSets(a, b) {
  const A = new Set(a || []);
  const B = new Set(b || []);
  return { onlyCompose: [...A].filter(x => !B.has(x)), onlyApp: [...B].filter(x => !A.has(x)) };
}

function check(root = ROOT) {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  const drifts = [];
  for (const d of app.drivers || []) {
    const p = path.join(root, 'drivers', d.id, 'driver.compose.json');
    if (!fs.existsSync(p)) {continue;}
    let c;
    try { c = JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { drifts.push({ driver: d.id, error: `compose parse: ${e.message}` }); continue; }
    for (const key of ['manufacturerName', 'productId']) {
      const r = diffSets(c.zigbee && c.zigbee[key], d.zigbee && d.zigbee[key]);
      if (r.onlyCompose.length || r.onlyApp.length) {drifts.push({ driver: d.id, key, ...r });}
    }
  }
  return drifts;
}

module.exports = { check, diffSets };

if (require.main === module) {
  const drifts = check();
  if (process.argv.includes('--json')) {console.log(JSON.stringify(drifts, null, 2));}
  if (!drifts.length) { console.log('✅ compose ↔ app.json fingerprints in sync'); process.exit(0); }
  for (const x of drifts.slice(0, 40)) {
    console.error(`❌ ${x.driver} ${x.key || ''} ${x.error || ''} onlyCompose=${JSON.stringify((x.onlyCompose || []).slice(0, 8))} onlyApp=${JSON.stringify((x.onlyApp || []).slice(0, 8))}`);
  }
  console.error(`${drifts.length} drift(s). Run node tools/ci/sync-appjson-with-drivers.js and commit app.json.`);
  process.exit(1);
}
