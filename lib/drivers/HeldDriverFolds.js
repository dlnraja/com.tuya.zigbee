'use strict';

// P3330 / P3331: runtime side of lib/drivers/held-driver-folds.json.
// - P3330 fold: a published driver of the same class carries the exact couples of a held driver and
//   maps those makers to the held driver's own device class.
// - P3331 host (kind "host"): a published DORMANT driver (its own couples are fake or unpairable, so
//   no real device is paired on it) carries the free exact couples of a held driver. The exact
//   manufacturerName + productId pair selects the held device class, wrapped so the device migrates
//   its class once and keeps exactly the held capability set (lib/drivers/held-host-profiles.json).
// Makers already on the target before the fold are never remapped (the CI tests assert it), so no
// paired device changes class.

const { folds } = require('./held-driver-folds.json');
const { profiles } = require('./held-host-profiles.json');

// P3331: a hosted held driver folder is not in the Athom payload (driver folders must match app.json).
// lib/hosted/<id>/{device,driver}.js are committed shims re-exporting drivers/<id>/; prepare-publish
// overwrites them in the payload with the held code (relative requires re-resolved).

// Literal requires so the publish dependency closure keeps these files in the payload.
const LOADERS = Object.freeze({
  wall_switch_rf_ews1154z: () => require('../devices/held/WallSwitchRfEws1154zDevice'),
  air_conditioner_aetz01: () => require('../hosted/air_conditioner_aetz01/device'),
  curtain_sonoff_mini_zbrbs: () => require('../hosted/curtain_sonoff_mini_zbrbs/device'),
  energy_meter_3ch_bidirectional: () => require('../hosted/energy_meter_3ch_bidirectional/device'),
  gpo_double_light_mg_au03: () => require('../hosted/gpo_double_light_mg_au03/device'),
  gpo_double_mg_gpo02z: () => require('../hosted/gpo_double_mg_gpo02z/device'),
  heiman_siren: () => require('../hosted/heiman_siren/device'),
  keypad_alarm_wke502z: () => require('../hosted/keypad_alarm_wke502z/device'),
  presence_radar_aoyan_ay204t: () => require('../hosted/presence_radar_aoyan_ay204t/device'),
  siren_moes_mg_bjq002: () => require('../hosted/siren_moes_mg_bjq002/device'),
  smoke_sensor_ts0601_dp: () => require('../hosted/smoke_sensor_ts0601_dp/device'),
  switch_2gang_ts0002: () => require('../hosted/switch_2gang_ts0002/device'),
  switch_wall_6gang_metering: () => require('../hosted/switch_wall_6gang_metering/device'),
  thermostat_vrf_bvrf_l001: () => require('../hosted/thermostat_vrf_bvrf_l001/device'),
  ufh_controller_ch8z: () => require('../hosted/ufh_controller_ch8z/device'),
  ufh_controller_pro_line_x10: () => require('../hosted/ufh_controller_pro_line_x10/device'),
  valve_novato_zpv01: () => require('../hosted/valve_novato_zpv01/device'),
  water_leak_aoyan_ay222z: () => require('../hosted/water_leak_aoyan_ay222z/device'),
  water_leak_blitzwolf_bw_is9: () => require('../hosted/water_leak_blitzwolf_bw_is9/device'),
});

// Driver modules whose static registerFlowCards(driver) the host runs for its hosted flow cards.
const FLOW_REGISTRARS = Object.freeze({
  heiman_siren: () => require('../hosted/heiman_siren/driver'),
  switch_2gang_ts0002: () => require('../hosted/switch_2gang_ts0002/driver'),
});

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

function first(device, getter, keys) {
  try {
    const src = device && typeof device[getter] === 'function' ? device[getter]() : null;
    if (!src) {return '';}
    for (const k of keys) { if (src[k]) {return String(src[k]);} }
  } catch (_) { /* unknown */ }
  return '';
}

function setting(device, key) {
  try { return device && typeof device.getSetting === 'function' ? String(device.getSetting(key) || '') : ''; } catch (_) { return ''; }
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

/**
 * Held id folded into targetId for this couple, else null. Exact maker + product (trimmed, any case);
 * when the product is unknown, the maker alone decides only if exactly one fold of the target lists it.
 */
function foldedHeldId(targetId, manufacturerName, productId) {
  const mfr = norm(manufacturerName);
  if (!mfr) {return null;}
  const pid = norm(productId);
  const byMaker = Object.entries(folds).filter(([, f]) => f.into === targetId && f.manufacturerName.some((m) => norm(m) === mfr));
  if (pid) {
    const exact = byMaker.find(([, f]) => f.productId.some((p) => norm(p) === pid));
    if (exact) {return exact[0];}
    return byMaker.length === 1 && byMaker[0][1].kind !== 'host' ? byMaker[0][0] : null;
  }
  return byMaker.length === 1 ? byMaker[0][0] : null;
}

const WRAPPED = new Map();

/** Held device class wrapped for a dormant host: class migration once, exact held capability set. */
function hostedClass(held, Base) {
  if (WRAPPED.has(held)) {return WRAPPED.get(held);}
  const profile = profiles[held];
  class Hosted extends Base {
    async onInit(...args) {
      this._hostedAs = held;
      await syncHostedProfile(this, profile).catch((e) => this.error?.(`[P3331] ${held} profile: ${e && e.message}`));
      return super.onInit(...args);
    }
  }
  Object.defineProperty(Hosted, 'name', { value: `Hosted_${held}` });
  WRAPPED.set(held, Hosted);
  return Hosted;
}

/** Class once, then capabilities: add the held ones (with their options), drop host-only ones. */
async function syncHostedProfile(device, profile) {
  if (!profile) {return;}
  if (profile.class && profile.class !== profile.hostClass) {
    const { migrateDeviceClass } = require('../utils/DeviceClassMigration');
    await migrateDeviceClass(device, profile.class, [profile.hostClass]);
  }
  const want = profile.capabilities || [];
  const hostCaps = (device.driver && device.driver.manifest && device.driver.manifest.capabilities) || [];
  for (const cap of want) {
    if (!device.hasCapability(cap)) { await device.addCapability(cap).catch(() => {}); }
    const opts = (profile.capabilitiesOptions || {})[cap];
    if (opts && device.hasCapability(cap) && typeof device.setCapabilityOptions === 'function') {
      await device.setCapabilityOptions(cap, opts).catch(() => {});
    }
  }
  for (const cap of [...device.getCapabilities ? device.getCapabilities() : []]) {
    if (!want.includes(cap) && hostCaps.includes(cap)) { await device.removeCapability(cap).catch(() => {}); }
  }
}

/** Device class for a device of targetId, or null to keep the driver's default class. */
function foldedDeviceClass(targetId, device) {
  const held = foldedHeldId(targetId, deviceManufacturer(device), deviceProduct(device));
  if (!held || !LOADERS[held]) {return null;}
  const Base = LOADERS[held]();
  return folds[held].kind === 'host' ? hostedClass(held, Base) : Base;
}

/** Host driver onInit: run the flow-card listeners of its hosted held drivers (held = not in the manifest). */
function registerHostedFlows(driver, hostId) {
  const shipped = new Set(((driver && driver.homey && driver.homey.manifest && driver.homey.manifest.drivers) || []).map((d) => d.id));
  const done = [];
  for (const [held, f] of Object.entries(folds)) {
    if (f.kind !== 'host' || f.into !== hostId || !FLOW_REGISTRARS[held] || shipped.has(held)) {continue;}
    try {
      const Drv = FLOW_REGISTRARS[held]();
      if (typeof Drv.registerFlowCards === 'function') { Drv.registerFlowCards(driver); done.push(held); }
    } catch (e) { driver.error?.(`[P3331] ${held} flow cards: ${e && e.message}`); }
  }
  return done;
}

module.exports = {
  foldedDeviceClass, foldedHeldId, deviceManufacturer, deviceProduct, registerHostedFlows, syncHostedProfile, LOADERS, FLOW_REGISTRARS,
};
