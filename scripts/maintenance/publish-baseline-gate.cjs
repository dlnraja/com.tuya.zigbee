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
 * P3041 (owner yes t526s3030): with the artifact case prune ON the gate runs in a documented case-equivalent
 * mode (see checkBaseline): no couple lost case-insensitively, the sourced/canonical form stays on the same driver.
 *
 * Usage: node scripts/maintenance/publish-baseline-gate.cjs <payload app.json> [baseline.json] [--case-equivalent <p3041-case-prune.json>]
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

function checkBaseline(manifest, baseline, opts = {}) {
  const have = payloadCouples(manifest);
  // P3041 case-equivalent mode (owner yes t526s3030, 25/10/2026 18:32 Paris). Homey matches byte-exact, so
  // the default stays exact. With the artifact prune ON, a baseline couple whose exact mfr string is gone counts
  // as kept only if (a) that string has no external source and is all-lower/all-upper, and (b) a sourced or
  // mixed-case form of the same manufacturer ships with the same productId: on the very driver the prune took
  // it from when opts.caseEquivalentPruned (the prune report) is given, anywhere otherwise. Any couple lost
  // case-insensitively still fails.
  const sourced = opts.caseEquivalentSourced instanceof Set ? opts.caseEquivalentSourced : null;
  const pruned = Array.isArray(opts.caseEquivalentPruned) ? opts.caseEquivalentPruned : null;
  let folded = null;
  let foldedByDriver = null;
  let prunedAt = null;
  if (sourced) {
    const { isPureCase } = require('../lib/case-form-sources.cjs');
    const keep = (m) => sourced.has(m) || !isPureCase(m);
    folded = new Set();
    for (const k of have) {
      const [m, p] = k.split('\u0000');
      if (keep(m)) folded.add(`${m.trim().toLowerCase()}\u0000${p}`);
    }
    if (pruned) {
      foldedByDriver = new Set();
      for (const d of manifest.drivers || []) {
        const z = d && d.zigbee;
        if (!z) continue;
        for (const m of z.manufacturerName || []) {
          if (!keep(m)) continue;
          for (const p of z.productId || []) foldedByDriver.add(`${d.id}\u0000${m.trim().toLowerCase()}\u0000${p}`);
        }
      }
      prunedAt = new Map();
      for (const r of pruned) {
        for (const p of (r && r.productIds) || []) {
          const k = `${r.form}\u0000${p}`;
          if (!prunedAt.has(k)) prunedAt.set(k, new Set());
          prunedAt.get(k).add(r.driverId);
        }
      }
    }
  }
  const caseKept = (mfr, pid) => {
    if (!folded || sourced.has(mfr)) return false;
    const low = `${String(mfr).trim().toLowerCase()}\u0000${pid}`;
    if (!prunedAt) return folded.has(low);
    const at = prunedAt.get(`${mfr}\u0000${pid}`);
    return !!at && [...at].some((id) => foldedByDriver.has(`${id}\u0000${low}`));
  };
  let caseEquivalent = 0;
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
    if (have.has(k) || exempt.has(k)) continue;
    if (caseKept(c.mfr, c.pid)) { caseEquivalent += 1; continue; }
    missing.push(`${c.mfr}+${c.pid} (was ${c.driverId})`);
  }
  return { total: seen.size, missing, caseEquivalent };
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: publish-baseline-gate.cjs <payload app.json> [baseline.json] [--case-equivalent <p3041-case-prune.json>]');
    process.exit(2);
  }
  const repoRoot = path.join(__dirname, '..', '..');
  const ci = process.argv.indexOf('--case-equivalent');
  // P3041: with pruneArtifactCaseForms ON, the prune report written next to the payload is used by default.
  let prunePath = ci > 0 ? process.argv[ci + 1] : null;
  if (!prunePath) {
    const sib = path.join(path.dirname(path.resolve(file)), 'p3041-case-prune.json');
    let on = 0;
    try { on = require('../lib/publish-caps.cjs').loadPublishCaps({ root: repoRoot }).pruneArtifactCaseForms; } catch (_) { on = 0; }
    if (on && fs.existsSync(sib)) prunePath = sib;
  }
  const bArg = process.argv[3] && process.argv[3] !== '--case-equivalent' ? process.argv[3] : undefined;
  const baseline = loadPublishBaseline(repoRoot, bArg);
  if (!baseline) {
    console.error('[P3024b] FATAL: baseline couples file missing (test/fixtures/athom-last-test-package-couples.json)');
    process.exit(1);
  }
  const opts = prunePath ? {
    caseEquivalentSourced: require('../lib/case-form-sources.cjs').loadSourcedForms(repoRoot),
    caseEquivalentPruned: JSON.parse(fs.readFileSync(prunePath, 'utf8')),
  } : {};
  const r = checkBaseline(JSON.parse(fs.readFileSync(file, 'utf8')), baseline, opts);
  if (r.caseEquivalent) console.log(`[P3041] ${r.caseEquivalent} couple(s) kept case-insensitively on their driver through the sourced/canonical form`);
  if (r.missing.length) {
    console.error(`[P3024b] FATAL: ${r.missing.length}/${r.total} couple(s) of Test package ${baseline.version} would disappear:`);
    for (const m of r.missing.slice(0, 30)) console.error(`  - ${m}`);
    process.exit(1);
  }
  console.log(`[P3024b] OK: all ${r.total} couples of Test package ${baseline.version} present in payload`);
}

module.exports = { checkBaseline, payloadCouples };
