#!/usr/bin/env node
'use strict';

/**
 * P3024b gate: no Zigbee pairing couple of the last Athom Test package may
 * disappear from the publish payload.
 *
 * WHY: the 14000 combo budget silently cut 261 exact couples of 9.0.1574
 * (device_radiator_valve 52, smart_garden_irrigation_control 66, ...): users
 * who paired with 1574 would get "Unknown device" after the next update.
 * Homey pairing matches manufacturerName byte-exact (case-sensitive), so the
 * check is exact on the mfr string. A couple may move to another driver
 * (one couple, one driver) but must stay in the payload; deliberate removals
 * are listed in baseline.exemptions with a reason.
 *
 * Usage: node scripts/maintenance/publish-baseline-gate.cjs <payload app.json> [baseline.json]
 */

const fs = require('fs');
const path = require('path');
const { loadPublishBaseline, baselineCouples } = require('./compact-zigbee-identifiers.cjs');

function payloadCouples(manifest) {
  const set = new Set();
  for (const d of manifest.drivers || []) {
    const z = d && d.zigbee;
    if (!z) continue;
    for (const m of z.manufacturerName || []) {
      for (const p of z.productId || []) set.add(`${m}\u0000${p}`);
    }
  }
  return set;
}

function checkBaseline(manifest, baseline) {
  const have = payloadCouples(manifest);
  const exempt = new Set(((baseline && baseline.exemptions) || [])
    .filter((e) => e && e.mfr && e.pid && e.reason)
    .map((e) => `${e.mfr}\u0000${e.pid}`));
  const missing = [];
  const seen = new Set();
  const couples = baselineCouples(baseline);
  for (const c of couples) {
    const k = `${c.mfr}\u0000${c.pid}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (!have.has(k) && !exempt.has(k)) missing.push(`${c.mfr}+${c.pid} (was ${c.driverId})`);
  }
  return { total: seen.size, missing };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: publish-baseline-gate.cjs <payload app.json> [baseline.json]');
    process.exit(2);
  }
  const repoRoot = path.join(__dirname, '..', '..');
  const baseline = loadPublishBaseline(repoRoot, process.argv[3]);
  if (!baseline) {
    console.error('[P3024b] FATAL: baseline couples file missing (test/fixtures/athom-last-test-package-couples.json)');
    process.exit(1);
  }
  const r = checkBaseline(JSON.parse(fs.readFileSync(file, 'utf8')), baseline);
  if (r.missing.length) {
    console.error(`[P3024b] FATAL: ${r.missing.length}/${r.total} couple(s) of Test package ${baseline.version} would disappear:`);
    for (const m of r.missing.slice(0, 30)) console.error(`  - ${m}`);
    process.exit(1);
  }
  console.log(`[P3024b] OK: all ${r.total} couples of Test package ${baseline.version} present in payload`);
}

module.exports = { checkBaseline, payloadCouples };
