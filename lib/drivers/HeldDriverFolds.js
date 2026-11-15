'use strict';

// P3330: runtime side of lib/drivers/held-driver-folds.json. A published driver that carries the exact
// couples of a held (never-published) driver maps those makers to the held driver's own device class,
// so the device behaves exactly as it would on its dedicated driver. Makers already on the target
// before the fold are never remapped (the CI test asserts the lists are disjoint), so no paired device
// changes class.

const { folds } = require('./held-driver-folds.json');

// Literal requires so the publish dependency closure keeps these files in the payload.
const LOADERS = Object.freeze({
  wall_switch_rf_ews1154z: () => require('../devices/held/WallSwitchRfEws1154zDevice'),
});

function deviceManufacturer(device) {
  try {
    const s = device && typeof device.getSetting === 'function' ? device.getSetting('zb_manufacturer_name') : null;
    if (s) {return String(s);}
    const st = device && typeof device.getStore === 'function' ? device.getStore() : null;
    if (st && st.manufacturerName) {return String(st.manufacturerName);}
    const d = device && typeof device.getData === 'function' ? device.getData() : null;
    if (d && d.manufacturerName) {return String(d.manufacturerName);}
  } catch (_) { /* unknown maker: default class */ }
  return '';
}

/** Held id whose fold into targetId lists this maker (case-insensitive), else null. */
function foldedHeldId(targetId, manufacturerName) {
  const mfr = String(manufacturerName || '').toLowerCase();
  if (!mfr) {return null;}
  for (const [held, f] of Object.entries(folds)) {
    if (f.into === targetId && f.manufacturerName.some((m) => m.toLowerCase() === mfr)) {return held;}
  }
  return null;
}

/** Device class for a device of targetId, or null to keep the driver's default class. */
function foldedDeviceClass(targetId, device) {
  const held = foldedHeldId(targetId, deviceManufacturer(device));
  return held && LOADERS[held] ? LOADERS[held]() : null;
}

module.exports = { foldedDeviceClass, foldedHeldId, deviceManufacturer, LOADERS };
