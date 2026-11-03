#!/usr/bin/env node
'use strict';
// WHY(P3264): CI gate. Fails when drivers/ gains an id not in config/architecture/driver-cap.json sourceIds,
// or when a given payload app.json ships more than cap drivers. Usage: node scripts/ci/driver-cap-gate.js [payload/app.json]
const fs = require('fs');
const DC = require('../../lib/arch/DriverCap');
const cfg = DC.load();
const fresh = DC.newSourceIds(undefined, cfg);
let bad = false;
if (fresh.length) {
  bad = true;
  console.error(`FATAL(P3264): ${fresh.length} new driver id(s) beyond the 347 architecture: ${fresh.join(', ')}`);
  console.error('Put the couples into a surviving driver / folding continuation / hosted profile (docs/rules/FIT_347_HOSTED_PROFILES.md).');
}
const p = process.argv[2];
if (p && fs.existsSync(p)) {
  const r = DC.checkPayload(JSON.parse(fs.readFileSync(p, 'utf8')), cfg);
  console.log(`P3264 payload drivers: ${r.count} / cap ${r.cap} (target ${r.target})`);
  if (!r.ok) { bad = true; console.error(`FATAL(P3264): payload ships ${r.count} drivers > cap ${r.cap}`); }
}
if (!bad) console.log(`P3264 driver cap OK: ${cfg.sourceIds.length} source ids, no new id`);
process.exit(bad ? 1 : 0);
