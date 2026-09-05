'use strict';

/**
 * UserMisattributionRegistry — community wrong-driver / pairing conflict cases.
 *
 * Master: static fingerprints in driver.compose.json + dynamic force-match here.
 * Stable: keep the same static compose entries; do not rely on dynamic overlay.
 *
 * Lookup key is always sacred couple (manufacturerName + productId), case-insensitive.
 */

const fs = require('fs');
const path = require('path');

const REGISTRY_PATH = path.join(__dirname, '..', '..', 'data', 'user-misattribution-registry.json');

let _cache = null;

function _norm(s) {
  return String(s || '').trim().toLowerCase();
}

function loadRegistry(force = false) {
  if (_cache && !force) {return _cache;}
  try {
    const raw = fs.readFileSync(REGISTRY_PATH);
    _cache = JSON.parse(raw);
  } catch {
    _cache = { version: 0, cases: [] };
  }
  return _cache;
}

function invalidate() {
  _cache = null;
}

/**
 * @param {string} mfr
 * @param {string} [pid]
 * @returns {object|null} matching case or null
 */
function lookup(mfr, pid) {
  const nm = _norm(mfr);
  const np = _norm(pid);
  if (!nm) {return null;}
  const { cases } = loadRegistry();
  for (const c of cases || []) {
    let mfrs = (c.mfr || []).map(_norm);
    let pids = (c.productId || []).map(_norm);
    if (!mfrs.length && Array.isArray(c.couple)) {
      for (const pair of c.couple) {
        const parts = String(pair).split('+');
        if (parts.length === 2) {
          mfrs.push(_norm(parts[0]));
          pids.push(_norm(parts[1]));
        }
      }
    }
    if (!mfrs.includes(nm)) {continue;}
    // WHY(P2289): productId-scoped cases must not match when pid is unknown.
    // Empty pid previously matched first single-pid HOBEIAN soil case → false
    // "expect soil_sensor" target (Peter #2202/#2203).
    if (pids.length) {
      if (!np) {continue;}
      if (!pids.includes(np)) {continue;}
    }
    return c;
  }
  return null;
}

/**
 * Build a fingerprint-matcher style entry for force-match (score 1.0).
 */
function toMatcherEntry(c) {
  if (!c) {return null;}
  return {
    driverId: c.canonicalDriver,
    modelIds: c.productId || [],
    source: 'user-misattribution-registry',
    forbiddenDrivers: c.forbiddenDrivers || [],
    protocol: c.protocol,
    caseId: c.id,
  };
}

/**
 * True if driverId is forbidden for this couple.
 */
function isForbiddenDriver(mfr, pid, driverId) {
  const c = lookup(mfr, pid);
  if (!c || !driverId) {return false;}
  return (c.forbiddenDrivers || []).some((d) => _norm(d) === _norm(driverId));
}

/**
 * True if ANY registry case for this manufacturer forbids driverId.
 * Use this in enrichers that may not have a productId yet — mfr-only
 * placement into a known-wrong class is how the re-inject loop starts.
 *
 * WHY(P2282): Skip forbidMode:"couple" — those bans are pid-scoped. Applying
 * them mfr-wide marked HOBEIAN water as rain/soil (forum #2202 Peter).
 */
function isForbiddenPlacement(mfr, driverId) {
  const nm = _norm(mfr);
  const nd = _norm(driverId);
  if (!nm || !nd) {return false;}
  const { cases } = loadRegistry();
  for (const c of cases || []) {
    if (_norm(c.forbidMode) === 'couple') {continue;}
    const mfrs = (c.mfr || []).map(_norm);
    if (!mfrs.includes(nm)) {continue;}
    if ((c.forbiddenDrivers || []).some((d) => _norm(d) === nd)) {return true;}
  }
  return false;
}

module.exports = {
  REGISTRY_PATH,
  loadRegistry,
  invalidate,
  lookup,
  toMatcherEntry,
  isForbiddenDriver,
  isForbiddenPlacement,
};
