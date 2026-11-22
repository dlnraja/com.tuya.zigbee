'use strict';

// P3360: map exact already-shipped couples on a published host to a held device
// class via onMapDeviceClass. Couples stay on the host; the held driver id stays
// held. JS for the held class is loaded from lib/hosted/<id>/ (payload) or
// drivers/<id>/ (source tree).

const { maps } = require('./published-host-class-maps.json');
const { migrateDeviceClass } = require('../utils/DeviceClassMigration');

const LOADERS = Object.freeze({
  co_sensor_dcr_co: () => {
    try { return require('../hosted/co_sensor_dcr_co/device'); } catch (_e) { return require('../../drivers/co_sensor_dcr_co/device'); }
  },
  fan_light_tuya_5_levels: () => {
    try { return require('../hosted/fan_light_tuya_5_levels/device'); } catch (_e) { return require('../../drivers/fan_light_tuya_5_levels/device'); }
  },
  motion_sensor_excellux_zg104plv: () => {
    try { return require('../hosted/motion_sensor_excellux_zg104plv/device'); } catch (_e) { return require('../../drivers/motion_sensor_excellux_zg104plv/device'); }
  },
  vibration_sensor_excellux_zg103v: () => {
    try { return require('../hosted/vibration_sensor_excellux_zg103v/device'); } catch (_e) { return require('../../drivers/vibration_sensor_excellux_zg103v/device'); }
  },
});

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
const WRAPPED = new Map();

function first(device, getter, keys) {
  try {
    const src = device && typeof device[getter] === 'function' ? device[getter]() : null;
    if (!src) { return ''; }
    for (const k of keys) { if (src[k]) { return String(src[k]); } }
  } catch (_e) { /* unknown */ }
  return '';
}

function setting(device, key) {
  try { return device && typeof device.getSetting === 'function' ? String(device.getSetting(key) || '') : ''; } catch (_e) { return ''; }
}

function deviceManufacturer(device) {
  return setting(device, 'zb_manufacturer_name')
    || first(device, 'getStore', ['manufacturerName', 'zb_manufacturer_name'])
    || first(device, 'getData', ['manufacturerName']);
}

function deviceProduct(device) {
  return setting(device, 'zb_model_id') || setting(device, 'zb_product_id')
    || first(device, 'getStore', ['productId', 'modelId', 'zb_model_id', 'zb_product_id'])
    || first(device, 'getData', ['productId', 'modelId']);
}

function matchOn(hostId, manufacturerName, productId) {
  const mfr = norm(manufacturerName);
  const pid = norm(productId);
  if (!mfr || !pid) { return null; }
  return (maps || []).find((m) => m.into === hostId
    && (m.manufacturerName || []).some((x) => norm(x) === mfr)
    && (m.productId || []).some((x) => norm(x) === pid)) || null;
}

function wrappedClass(entry, Base) {
  const key = `${entry.into}:${entry.held}`;
  if (WRAPPED.has(key)) { return WRAPPED.get(key); }
  class Mapped extends Base {
    async onInit(...args) {
      this._hostedAs = entry.held;
      try {
        if (entry.class && entry.class !== entry.hostClass) {
          await migrateDeviceClass(this, entry.class, [entry.hostClass]);
        }
        const want = entry.capabilities || [];
        for (const cap of want) {
          if (!this.hasCapability(cap)) { await this.addCapability(cap).catch(() => {}); }
          const opts = (entry.capabilitiesOptions || {})[cap];
          if (opts && this.hasCapability(cap) && typeof this.setCapabilityOptions === 'function') {
            await this.setCapabilityOptions(cap, opts).catch(() => {});
          }
        }
      } catch (e) {
        this.error?.(`[P3360] ${entry.held} class map: ${e && e.message}`);
      }
      return super.onInit(...args);
    }
  }
  Object.defineProperty(Mapped, 'name', { value: `Mapped_${entry.held}` });
  WRAPPED.set(key, Mapped);
  return Mapped;
}

/** Device class for a couple already shipped on hostId, or null to keep the host default. */
function mappedDeviceClass(hostId, device) {
  const entry = matchOn(hostId, deviceManufacturer(device), deviceProduct(device));
  if (!entry || !LOADERS[entry.held]) { return null; }
  const Base = LOADERS[entry.held]();
  return wrappedClass(entry, Base);
}

module.exports = { mappedDeviceClass, matchOn, deviceManufacturer, deviceProduct, LOADERS };
