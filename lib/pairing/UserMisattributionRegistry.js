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
    const mfrs = (c.mfr || []).map(_norm);
    if (!mfrs.includes(nm)) {continue;}
    const pids = (c.productId || []).map(_norm);
    if (pids.length && np && !pids.includes(np)) {continue;}
    // If pid unknown but case is mfr-specific single-product, still match
    if (pids.length && !np && pids.length > 1) {continue;}
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
 */
function isForbiddenPlacement(mfr, driverId) {
  const nm = _norm(mfr);
  const nd = _norm(driverId);
  if (!nm || !nd) {return false;}
  const { cases } = loadRegistry();
  for (const c of cases || []) {
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
