'use strict';

/**
 * v9.0.413 (P92.121): GangIndexResolver — 0-based vs 1-based normalisation.
 *
 * Tuya firmwares disagree on index spaces:
 *  - ZCL endpoints are 1-based (Zigbee spec),
 *  - Homey capabilities are 1-based (button.1..4, onoff.gang2..),
 *  - Tuya DPs for gangs are usually 1-based (DP1=gang1),
 *  - but E000/E001 multi-press frames and scene recalls are 0-based on
 *    several firmwares (button index 0..3), 1-based on others.
 *
 * The old code did `frameData[3] || endpointId` — a 0-based button 0 is
 * falsy and was silently replaced by the endpoint id, mis-mapping presses.
 *
 * This resolver auto-detects the base PER DEVICE and PER SOURCE: as soon
 * as an index 0 is observed the source is known 0-based (persisted in the
 * device store), and every subsequent index is shifted +1. Until a 0 is
 * seen, indices pass through unchanged (1-based default, the common case).
 * Result is always a 1-based gang number, clamped to [1, maxGangs] when
 * the gang count is known.
 */

const STORE_KEY = 'gang_index_base';

/**
 * Read the persisted base map { e000: 0, scene: 1, ... }.
 * @param {Object} device
 * @returns {Object}
 */
function _bases(device) {
  try {
    if (typeof device.getStoreValue === 'function') {
      const v = device.getStoreValue(STORE_KEY);
      if (v && typeof v === 'object') { return v; }
    }
  } catch (_e) { /* no-op */ }
  if (!device._gangIndexBases) { device._gangIndexBases = {}; }
  return device._gangIndexBases;
}

function _persist(device, bases) {
  device._gangIndexBases = bases;
  try {
    if (typeof device.setStoreValue === 'function') {
      device.setStoreValue(STORE_KEY, bases).catch(() => {});
    }
  } catch (_e) { /* no-op */ }
}

/**
 * Resolve a raw button/gang index to a 1-based gang number.
 *
 * @param {Object} device - Homey device instance
 * @param {number} rawIndex - index as received from the device
 * @param {string} source - 'e000' | 'e001' | 'scene' | 'dp' | 'endpoint'
 * @param {number} [maxGangs] - known gang count (for clamping), 0 = unknown
 * @returns {number} 1-based gang number (>= 1)
 */
function resolveGang(device, rawIndex, source, maxGangs = 0) {
  const original = Number(rawIndex);
  if (!Number.isFinite(original) || original < 0) {
    // Invalid index: fall back to gang 1 WITHOUT learning anything —
    // a garbage frame must never flip the detected numbering base.
    return 1;
  }
  const raw = original;

  const bases = _bases(device);

  if (raw === 0 && bases[source] !== 0) {
    // An index 0 can only come from a 0-based numbering: learn it once.
    bases[source] = 0;
    _persist(device, bases);
    try {
      device.log(`[GANG-BASE] ${source} is 0-based on this device — shifting +1`);
    } catch (_e) { /* no-op */ }
  }

  let gang = raw + (bases[source] === 0 ? 1 : 0);
  if (gang < 1) { gang = 1; }
  if (maxGangs > 0 && gang > maxGangs) {
    // Out-of-range high index: tolerate rather than drop — clamp and log.
    try {
      device.log(`[GANG-BASE] ${source} index ${raw} → gang ${gang} exceeds ${maxGangs} gangs, clamped`);
    } catch (_e) { /* no-op */ }
    gang = maxGangs;
  }
  return gang;
}

/**
 * Resolve a Tuya DP id to a 1-based gang number. DP gang ids are 1-based
 * on most devices; when a device reports DP0 for gang data (rare), the
 * base is learned the same way.
 *
 * @param {Object} device
 * @param {number} dpId
 * @param {number} [maxGangs]
 * @returns {number} 1-based gang
 */
function resolveDpGang(device, dpId, maxGangs = 0) {
  return resolveGang(device, dpId, 'dp', maxGangs);
}

module.exports = { resolveGang, resolveDpGang };
