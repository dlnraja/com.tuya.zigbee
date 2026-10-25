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
const { wireEquivalentEnabled } = require('./build-wire-equivalents.cjs');

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

/**
 * WHY(P3027b): with HOMEY_ZIGBEE_PIN_WIRE_EQUIVALENT=1 (default off) a pinned
 * minted case form also counts as present when its recorded wire spelling
 * (baseline.wireEquivalents, same driver) is in the payload with the same pid.
 */
function checkBaseline(manifest, baseline, opts = {}) {
  const have = payloadCouples(manifest);
  const eq = wireEquivalentEnabled(opts) && baseline && baseline.wireEquivalents
    ? (baseline.wireEquivalents.drivers || {})
    : null;
  const equivalentKey = (c) => {
    const e = eq && eq[c.driverId];
    if (!e) return null;
    const m = (e.m && e.m[c.mfr]) || c.mfr;
    const p = (e.p && e.p[c.pid]) || c.pid;
    return m === c.mfr && p === c.pid ? null : `${m}\u0000${p}`;
  };
  let viaEquivalent = 0;
  const exempt = new Set(((baseline && baseline.exemptions) || [])
    .filter((e) => e && e.mfr && e.pid && e.reason)
    .map((e) => `${e.mfr}\u0000${e.pid}`));
  const missing = [];
  const seen = new Set();
  const couples = baselineCouples(baseline);
  const byKey = new Map();
  for (const c of couples) {
    const k = `${c.mfr}\u0000${c.pid}`;
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k).push(c);
  }
  for (const [k, list] of byKey) {
    seen.add(k);
    if (have.has(k) || exempt.has(k)) continue;
    const alt = list.map(equivalentKey).find((ek) => ek && have.has(ek));
    if (alt) { viaEquivalent += 1; continue; }
    const c = list[0];
    missing.push(`${c.mfr}+${c.pid} (was ${c.driverId})`);
  }
  return { total: seen.size, missing, viaEquivalent };
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
  console.log(`[P3024b] OK: all ${r.total} couples of Test package ${baseline.version} present in payload${r.viaEquivalent ? ` (${r.viaEquivalent} via P3027b wire equivalent)` : ''}`);
}

module.exports = { checkBaseline, payloadCouples };
