#!/usr/bin/env node
'use strict';
/**
 * fp-collision-guard.js (P92.126)
 *
 * Cheap collision guard for automation that adds manufacturerName entries to
 * driver.compose.json files (auto-fix-all pipeline, blakadder/forum importers,
 * mfs_db injectors).
 *
 * RULE: before adding mfr M to driver D, skip if another non-fallback driver's
 * compose already contains M (case-insensitive). The collision checker
 * (scripts/validation/check-driver-collisions.js) treats mfr×pid as a full
 * cartesian product, so the same mfr in two drivers almost always collides.
 *
 * EXCEPTION: 'hobeian' is intentionally multi-driver (pid-disambiguated via
 * ZG-xxx productIds — see DOCUMENTED_EXCEPTIONS in check-driver-collisions.js
 * and scripts/diag/hobeian-consistency-check.js). It is never blocked.
 *
 * Fallback/catch-all drivers are excluded from the "other drivers" set: they
 * intentionally duplicate fingerprints and must not block targeted additions.
 */

const fs = require('fs');
const path = require('path');

const FALLBACK_DRIVERS = ['universal_fallback', 'generic_tuya', 'universal_zigbee', 'device_generic_tuya_universal'];
const MULTI_DRIVER_MFRS = new Set(['hobeian']);

let _index = null; // Map<baseLower, Set<driverId>>

function buildIndex(rootDir) {
  if (_index) return _index;
  const driversDir = path.join(rootDir, 'drivers');
  _index = new Map();
  for (const d of fs.readdirSync(driversDir)) {
    if (FALLBACK_DRIVERS.includes(d)) continue;
    let c;
    try { c = JSON.parse(fs.readFileSync(path.join(driversDir, d, 'driver.compose.json'), 'utf8')); } catch (e) { continue; }
    if (!c || !c.zigbee || !Array.isArray(c.zigbee.manufacturerName)) continue;
    for (const m of c.zigbee.manufacturerName) {
      const b = String(m).toLowerCase();
      if (!_index.has(b)) _index.set(b, new Set());
      _index.get(b).add(d);
    }
  }
  return _index;
}

/**
 * Returns the name of another non-fallback driver already claiming `mfr`
 * (case-insensitive), or null if the add is safe. Never blocks HOBEIAN.
 * Call AFTER the write if the target file was just modified on disk, or pass
 * `extraOwners` to account for in-memory state.
 */
function claimedElsewhere(rootDir, mfr, targetDriver) {
  const base = String(mfr).toLowerCase();
  if (MULTI_DRIVER_MFRS.has(base)) return null;
  const index = buildIndex(rootDir);
  const owners = index.get(base);
  if (!owners) return null;
  for (const d of owners) {
    if (d !== targetDriver) return d;
  }
  return null;
}

/** Drop cached index (call if composes were modified during the run). */
function invalidate() { _index = null; }

module.exports = { claimedElsewhere, invalidate, FALLBACK_DRIVERS, MULTI_DRIVER_MFRS };
