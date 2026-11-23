'use strict';

/**
 * P3401: TS020C PIR sensor - parallel RX next to the IAS path (forum 140352 #2275/#2277).
 *
 * WHY: on TS020C the occupancy can come as Tuya datapoint 1 instead of (or as well as) the IAS
 * zone alarm, and the illuminance only comes as attribute 57345 (0xE001) on cluster 0xE002
 * (manuSpecificTuya2). The driver only listened to IAS, so motion could stay silent.
 *
 * Source (facts only, rewritten): Koenkk/zigbee-herdsman-converters src/devices/tuya.ts @9bb230d,
 * model "TS020C" (zigbeeModel TS020C, any manufacturer): fz.ias_occupancy_alarm_1 + tuyaBase dp,
 * DP1 occupancy trueFalse0 (0 = occupied), DP4 battery raw %, DP12 illuminance raw
 * ("doesn't work" upstream, kept as a harmless fallback), fzLocal.ts020cIlluminance reads
 * manuSpecificTuya2 attributeReport key 57345.
 *
 * Receive only: nothing is written to the device (sleepy end device, no query storm).
 * Locked to productId TS020C so other pir_sensor_2 couples (TS0601 radars use DP1 with the
 * opposite polarity) are never touched.
 */

const PID = 'TS020C';

function productIdOf(device) {
  try {
    return String(
      (device.getData && device.getData() && device.getData().productId)
      || (device.getSetting && device.getSetting('zb_model_id'))
      || (device.getStoreValue && device.getStoreValue('zb_model_id'))
      || '',
    ).trim().toUpperCase();
  } catch (_e) {
    return '';
  }
}

function isTs020c(device) {
  return productIdOf(device) === PID;
}

function _num(v) {
  if (typeof v === 'boolean') { return v ? 1 : 0; }
  if (Buffer.isBuffer(v)) {
    if (v.length === 0) { return NaN; }
    return v.length === 1 ? v[0] : v.readUIntBE(0, Math.min(v.length, 4));
  }
  return Number(v);
}

/** DP -> { capability, value } or null (unknown DP / undecodable value: never guessed). */
function decodeDp(dp, value) {
  const n = _num(value);
  if (!Number.isFinite(n)) { return null; }
  switch (Number(dp)) {
    case 1: return { capability: 'alarm_motion', value: n === 0 };
    case 4: return { capability: 'measure_battery', value: Math.max(0, Math.min(100, n)) };
    case 12: return { capability: 'measure_luminance', value: Math.max(0, n) };
    default: return null;
  }
}

function findE002(zclNode) {
  const eps = zclNode && zclNode.endpoints;
  if (!eps) { return null; }
  for (const ep of Object.keys(eps)) {
    const c = eps[ep] && eps[ep].clusters;
    const e = c && (c.tuyaE002 || c[0xE002] || c['57346']);
    if (e && typeof e.on === 'function') { return e; }
  }
  return null;
}

function _set(device, cap, value) {
  try {
    const run = () => {
      const fn = typeof device.safeSetCapabilityValue === 'function'
        ? device.safeSetCapabilityValue.bind(device) : device.setCapabilityValue.bind(device);
      const p = fn(cap, value);
      return p && typeof p.catch === 'function' ? p.catch(() => {}) : p;
    };
    if (typeof device.hasCapability === 'function' && !device.hasCapability(cap)) {
      // WHY: measure_luminance is not in the pir_sensor_2 manifest; add it only once a TS020C
      // really reported a lux value (other couples keep their capability list unchanged).
      if (cap !== 'measure_luminance' || typeof device.addCapability !== 'function') { return; }
      Promise.resolve(device.addCapability(cap)).then(run).catch(() => {});
      return;
    }
    run();
  } catch (_e) { /* never break RX */ }
}

/**
 * @returns {{ts020c:boolean, dp:boolean, lux:boolean}}
 */
function attach(device, zclNode) {
  const res = { ts020c: false, dp: false, lux: false };
  if (!device || !isTs020c(device)) { return res; }
  res.ts020c = true;
  const log = (m) => { try { if (typeof device.log === 'function') { device.log(m); } } catch (_e) { /* log only */ } };
  try {
    res.dp = require('../tuya/PassiveDpRx').attach(device, (dp, raw) => {
      const hit = decodeDp(dp, raw);
      if (!hit) { return; }
      log(`[P3401-TS020C] DP${dp} -> ${hit.capability} = ${hit.value}`);
      _set(device, hit.capability, hit.value);
    }) === true;
  } catch (_e) { res.dp = false; }
  const e002 = findE002(zclNode);
  if (e002) {
    res.lux = true;
    // 0xE001 is registered on our 0xE002 cluster as presenceKeepTime (Linptech radar name);
    // on TS020C the same attribute id carries illuminance (Z2M ts020cIlluminance).
    e002.on('attr.presenceKeepTime', (v) => {
      const n = _num(v);
      if (!Number.isFinite(n)) { return; }
      log(`[P3401-TS020C] 0xE002/0xE001 illuminance = ${n}`);
      _set(device, 'measure_luminance', Math.max(0, n));
    });
  }
  return res;
}

module.exports = { PID, isTs020c, decodeDp, attach, findE002 };
