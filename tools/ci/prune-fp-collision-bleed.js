#!/usr/bin/env node
'use strict';

/**
 * prune-fp-collision-bleed.js (P2238)
 *
 * Prune manufacturerName bleed causing NEW fp-collision-check failures.
 * Uses mfs_db driverHint + user-misattribution-registry (never invent pid).
 *
 * Usage:
 *   node tools/ci/prune-fp-collision-bleed.js              # dry-run
 *   node tools/ci/prune-fp-collision-bleed.js --apply     # mutate compose
 *   node tools/ci/prune-fp-collision-bleed.js --check    # CI: fail if NEW collisions remain
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const BASELINE = path.join(ROOT, '.github/fingerprint-collision-baseline.json');
const DB_PATH = path.join(ROOT, 'data/mfs_db.json');
const REG_PATH = path.join(ROOT, 'data/user-misattribution-registry.json');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

const APPLY = process.argv.includes('--apply');
const CHECK = process.argv.includes('--check');
const JSON_MODE = process.argv.includes('--json');

const EXEMPT_DRIVERS = new Set([
  'universal_fallback', 'tuya_dummy_device', 'generic_tuya', 'generic_diy',
  'device_generic_diy_universal', 'universal_zigbee',
]);
const EXEMPT_KEY_RE = /_hybrid_.*_needs_device_assignment|_master_.*_needs_device_assignment|_stable_v5_.*_needs_device_assignment|_deprecated_.*_do_not_pair|_tz3000_unknown|_tze200_placeholder_generic/i;
const WIDE_CLAIM = new Set([
  'universal_zigbee', 'generic_tuya', 'generic_diy', 'universal_fallback',
  'tuya_dummy_device', 'device_generic_diy_universal', 'device_generic_tuya',
]);

function norm(s) { return String(s || '').trim().toLowerCase(); }

function collisionId(c) {
  return `${c.key} -> ${[...new Set(c.drivers)].sort().join(',')}`;
}

function normalizeDrivers(drivers) {
  return [...new Set(drivers)].sort((a, b) => a.localeCompare(b));
}

function collectCollisions() {
  const map = new Map();
  if (!fs.existsSync(DRIVERS_DIR)) return [];
  for (const driverId of fs.readdirSync(DRIVERS_DIR)) {
    const file = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(file)) continue;
    let compose;
    try { compose = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    const zigbee = compose.zigbee;
    if (!zigbee?.manufacturerName || !zigbee?.productId) continue;
    for (const mfr of zigbee.manufacturerName) {
      for (const pid of zigbee.productId) {
        const key = `${String(mfr).toLowerCase()}|${String(pid)}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(driverId);
      }
    }
  }
  const collisions = [];
  for (const [key, drivers] of map) {
    const uniqueDrivers = normalizeDrivers(drivers);
    const nonExempt = uniqueDrivers.filter((d) => !EXEMPT_DRIVERS.has(d));
    if (nonExempt.length <= 1) continue;
    if (EXEMPT_KEY_RE.test(key)) continue;
    collisions.push({ key, drivers: uniqueDrivers });
  }
  return collisions.sort((a, b) => collisionId(a).localeCompare(collisionId(b)));
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) return new Set();
  const data = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  return new Set((data.collisions || []).map((c) => collisionId({
    key: c.key,
    drivers: normalizeDrivers(c.drivers || []),
  })));
}

function isCoveredByBaseline(baseline, collision) {
  const id = collisionId(collision);
  if (baseline.has(id)) return true;
  const currentDrivers = new Set(normalizeDrivers(collision.drivers));
  const suffix = ' -> ';
  for (const entry of baseline) {
    const sep = entry.indexOf(suffix);
    if (sep === -1 || entry.slice(0, sep) !== collision.key) continue;
    const baselineDrivers = entry.slice(sep + suffix.length).split(',');
    if ([...currentDrivers].every((d) => baselineDrivers.includes(d))) return true;
  }
  return false;
}

function loadMfsHints() {
  const hints = new Map();
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    for (const [key, row] of Object.entries(db)) {
      if (!row || typeof row !== 'object' || key.startsWith('_meta')) continue;
      const hint = row.driverHint || row.driverId;
      if (hint) hints.set(norm(key.split('|')[0]), hint);
    }
  } catch { /* ignore */ }
  return hints;
}

function loadRegistryCanon() {
  const canon = new Map();
  const forbidden = new Map();
  try {
    const reg = JSON.parse(fs.readFileSync(REG_PATH, 'utf8'));
    for (const c of reg.cases || []) {
      const driver = c.canonicalDriver;
      for (const m of [].concat(c.mfr || [])) {
        if (driver) canon.set(norm(m), driver);
        if (c.forbiddenDrivers?.length) forbidden.set(norm(m), c.forbiddenDrivers);
      }
    }
  } catch { /* ignore */ }
  return { canon, forbidden };
}

function stripMfrFromCompose(driverId, mfrNorm) {
  const p = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
  if (!fs.existsSync(p)) return 0;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = j.zigbee?.manufacturerName;
  if (!Array.isArray(list)) return 0;
  const next = list.filter((m) => norm(m) !== mfrNorm);
  const removed = list.length - next.length;
  if (!removed) return 0;
  if (!APPLY) return removed;
  if (next.length === 0) {
    const s = `_hybrid_${driverId}_needs_device_assignment`;
    j.zigbee.manufacturerName = [s, s.toUpperCase()];
  } else {
    j.zigbee.manufacturerName = next;
  }
  fs.writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
  return removed;
}

function resolveCanonical(mfrNorm, drivers, mfsHints, registry) {
  if (registry.canon.has(mfrNorm)) {
    return registry.canon.get(mfrNorm);
  }
  const hint = mfsHints.get(mfrNorm);
  if (hint && drivers.includes(hint) && !WIDE_CLAIM.has(hint)) {
    return hint;
  }
  return null;
}

function main() {
  const baseline = loadBaseline();
  const all = collectCollisions();
  const newCollisions = all.filter((c) => !isCoveredByBaseline(baseline, c));
  const mfsHints = loadMfsHints();
  const registry = loadRegistryCanon();

  const byMfr = new Map();
  for (const c of newCollisions) {
    const mfrNorm = c.key.split('|')[0];
    if (!byMfr.has(mfrNorm)) byMfr.set(mfrNorm, { collisions: [], drivers: new Set() });
    byMfr.get(mfrNorm).collisions.push(c);
    for (const d of c.drivers) byMfr.get(mfrNorm).drivers.add(d);
  }

  const actions = [];
  for (const [mfrNorm, row] of byMfr) {
    const drivers = [...row.drivers].filter((d) => !EXEMPT_DRIVERS.has(d) && !WIDE_CLAIM.has(d));
    const canonical = resolveCanonical(mfrNorm, drivers, mfsHints, registry);
    if (!canonical || !drivers.includes(canonical)) continue;

    const victims = new Set(drivers.filter((d) => d !== canonical));
    for (const bad of registry.forbidden.get(mfrNorm) || []) {
      if (drivers.includes(bad)) victims.add(bad);
    }
    victims.delete(canonical);

    for (const victim of victims) {
      const removed = stripMfrFromCompose(victim, mfrNorm);
      if (removed) {
        actions.push({
          mfr: mfrNorm,
          canonical,
          strippedFrom: victim,
          removedVariants: removed,
          collisionCount: row.collisions.length,
          source: registry.canon.has(mfrNorm) ? 'registry' : 'mfs_driverHint',
        });
      } else if (!APPLY) {
        actions.push({
          mfr: mfrNorm,
          canonical,
          strippedFrom: victim,
          removedVariants: 0,
          collisionCount: row.collisions.length,
          source: registry.canon.has(mfrNorm) ? 'registry' : 'mfs_driverHint',
          planned: true,
        });
      }
    }
  }

  let remainingNew = newCollisions.length;
  if (APPLY && actions.length) {
    const after = collectCollisions();
    remainingNew = after.filter((c) => !isCoveredByBaseline(baseline, c)).length;
  }

  const summary = {
    timestamp: new Date().toISOString(),
    gate: 'prune-fp-collision-bleed',
    apply: APPLY,
    newCollisionsBefore: newCollisions.length,
    newCollisionsAfter: remainingNew,
    actions,
  };

  if (JSON_MODE) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`prune-fp-collision-bleed: new=${newCollisions.length} actions=${actions.length} ${APPLY ? 'APPLIED' : 'dry-run'}`);
    for (const a of actions.slice(0, 40)) {
      console.log(`  [${a.source}] ${a.mfr} keep=${a.canonical} strip=${a.strippedFrom} (${a.collisionCount} keys)`);
    }
    if (actions.length > 40) console.log(`  ... +${actions.length - 40} more`);
  }

  if (CHECK && remainingNew > 0) {
    console.error(`CHECK FAIL: ${remainingNew} NEW fp collision(s) remain — run with --apply or update baseline`);
    process.exit(1);
  }
  if (!CHECK && !APPLY && actions.length === 0 && newCollisions.length > 0) {
    process.exit(0);
  }
}

main();
