'use strict';

/**
 * P2772 — hide the position slider on curtains that only support open/stop/close.
 *
 * Some curtain switches / motors never report a position DP. Exposing
 * `windowcoverings_set` for them shows a slider that does nothing and confuses
 * bridges (e.g. HomeKit expects a working position).
 *
 * Conservative and reversible:
 *   - a position report (DP2/3/4/8/9 mapped to windowcoverings_set, or ZCL lift %)
 *     marks the device as position-capable forever (store `cover_position_seen`);
 *   - only after >= MIN_MOVES movement/state reports AND >= MIN_AGE_MS since the
 *     first observation without ANY position report, and only on pure Tuya-DP
 *     covers (no ZCL windowCovering registered), the capability is removed;
 *   - if a position report ever arrives later, the capability is added back.
 * Lead: docs/automation/leads-other-apps.md "Unsupported position".
 */

const MIN_MOVES = 20;
const MIN_AGE_MS = 7 * 24 * 3600 * 1000;
const CAP = 'windowcoverings_set';

function store(device, key, val) {
  try { const p = device.setStoreValue?.(key, val); if (p && p.catch) {p.catch(() => {});} } catch (_e) { /* soft */ }
}
function get(device, key) {
  try { return device.getStoreValue?.(key); } catch (_e) { return undefined; }
}

function notePosition(device) {
  try {
    if (!get(device, 'cover_position_seen')) {store(device, 'cover_position_seen', true);}
    if (get(device, 'cover_position_hidden') && typeof device.hasCapability === 'function'
        && !device.hasCapability(CAP) && typeof device.addCapability === 'function') {
      store(device, 'cover_position_hidden', false);
      Promise.resolve(device.addCapability(CAP)).then(() => {
        device.log?.('[COVER] position report seen — position slider restored');
      }).catch(() => {});
    }
  } catch (_e) { /* soft */ }
}

/** @returns {boolean} true when the slider was (asynchronously) removed by this call */
function noteMovement(device, now = Date.now()) {
  try {
    if (get(device, 'cover_position_seen')) {return false;}
    let first = Number(get(device, 'cover_nopos_first')) || 0;
    if (!first) { first = now; store(device, 'cover_nopos_first', now); }
    const moves = (Number(get(device, 'cover_nopos_moves')) || 0) + 1;
    store(device, 'cover_nopos_moves', moves);
    return maybeHide(device, now, first, moves);
  } catch (_e) {
    return false;
  }
}

function maybeHide(device, now, first, moves) {
  if (moves < MIN_MOVES || now - first < MIN_AGE_MS) {return false;}
  if (device._zclCoverRegistered) {return false;}
  try {
    if (typeof device.getSetting === 'function' && device.getSetting('keep_position_slider') === true) {return false;}
  } catch (_e) { /* soft */ }
  if (typeof device.hasCapability !== 'function' || !device.hasCapability(CAP)) {return false;}
  if (typeof device.removeCapability !== 'function') {return false;}
  store(device, 'cover_position_hidden', true);
  Promise.resolve(device.removeCapability(CAP)).then(() => {
    device.log?.(`[COVER] no position DP after ${moves} movements — position slider hidden (open/stop/close only)`);
  }).catch(() => {});
  return true;
}

module.exports = { MIN_MOVES, MIN_AGE_MS, notePosition, noteMovement };
