'use strict';

/**
 * P3057 — driver families: a sibling driver that only exists to give a fingerprint family its own
 * Athom combo budget (manufacturerName x productId per driver) runs the SAME device.js/driver.js as
 * its parent. Migration / "wrong driver" checks must treat both ids as one driver, otherwise a device
 * on the sibling would be told to move to the parent (or back) for nothing.
 */
const SIBLING_TO_PARENT = Object.freeze({
  presence_sensor_radar_ts0601: 'presence_sensor_radar',
});

function canonicalDriverId(id) {
  if (!id) {
    return id;
  }
  return SIBLING_TO_PARENT[id] || id;
}

function sameDriverFamily(a, b) {
  if (!a || !b) {
    return a === b;
  }
  return canonicalDriverId(a) === canonicalDriverId(b);
}

module.exports = { SIBLING_TO_PARENT, canonicalDriverId, sameDriverFamily };
