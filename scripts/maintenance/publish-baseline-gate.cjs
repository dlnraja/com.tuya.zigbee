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
 *        node scripts/maintenance/publish-baseline-gate.cjs --source [app.json] [baseline.json]
 *
 * P3070: the root app.json is the SOURCE, not the payload. Couples that moved to a dedicated
 * driver are re-pinned on their shipped driver only during compaction, so checking the raw
 * file reported 177 (master) / 115 (stable) / 11 (bastien) false "would disappear" lines.
 * With --source (or when the given file is the repo-root app.json) the gate first builds the
 * payload view in memory: same compaction as prepare-publish step 5, then the publish hold.
 * Nothing is written to disk.
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

function holdIds(repoRoot) {
  const file = path.join(repoRoot, 'config', 'publish-hold-drivers.json');
  if (!fs.existsSync(file)) return new Set();
  try {
    const { effectiveHoldIds } = require('../publish-hold-release');
    return effectiveHoldIds(JSON.parse(fs.readFileSync(file, 'utf8')), process.env.PUBLISH_HOLD_RELEASE).ids;
  } catch (_) {
    return new Set();
  }
}

// In-memory payload view of a source manifest (compaction + publish hold), never written.
function sourceToPayload(manifest, repoRoot, opts = {}) {
  const { compactZigbeeIdentifiers } = require('./compact-zigbee-identifiers.cjs');
  const view = JSON.parse(JSON.stringify(manifest));
  compactZigbeeIdentifiers(view, {
    maxTotalCombos: Number(process.env.HOMEY_ZIGBEE_MAX_TOTAL_COMBOS) || undefined,
    maxDriverCombos: Number(process.env.HOMEY_ZIGBEE_MAX_DRIVER_COMBOS) || undefined,
    ...opts,
  });
  const ids = opts.holdIds || holdIds(repoRoot);
  if (ids.size) view.drivers = (view.drivers || []).filter((d) => !ids.has(d.id));
  return view;
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
  const repoRoot = path.join(__dirname, '..', '..');
  const args = process.argv.slice(2);
  let source = false;
  if (args[0] === '--source') { source = true; args.shift(); }
  const file = args[0] || (source ? path.join(repoRoot, 'app.json') : null);
  if (!file) {
    console.error('Usage: publish-baseline-gate.cjs <payload app.json> [baseline.json] | --source [app.json] [baseline.json]');
    process.exit(2);
  }
  if (path.resolve(file) === path.resolve(repoRoot, 'app.json')) source = true;
  const baseline = loadPublishBaseline(repoRoot, args[1]);
  if (!baseline) {
    console.error('[P3024b] FATAL: baseline couples file missing (test/fixtures/athom-last-test-package-couples.json)');
    process.exit(1);
  }
  let manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (source) {
    manifest = sourceToPayload(manifest, repoRoot);
    console.log('[P3024b] source app.json: checking the in-memory payload view (compaction + publish hold)');
  }
  const r = checkBaseline(manifest, baseline);
  if (r.missing.length) {
    console.error(`[P3024b] FATAL: ${r.missing.length}/${r.total} couple(s) of Test package ${baseline.version} would disappear:`);
    for (const m of r.missing.slice(0, 30)) console.error(`  - ${m}`);
    process.exit(1);
  }
  console.log(`[P3024b] OK: all ${r.total} couples of Test package ${baseline.version} present in payload`);
}

module.exports = { checkBaseline, payloadCouples, sourceToPayload };
