'use strict';

/**
 * P3019: Arteco ZS-SF00 soil fertility sensor — exact couple `A89G12C` | `Arteco`.
 *
 * WHY: this couple sends its own DP layout. The generic soil map reads DP102 as soil calibration,
 * DP103 as temperature, DP106 as EC and DP107 as moisture, which is wrong for this unit
 * (illuminance, sampling interval, illuminance calibration and temperature calibration).
 *
 * Source (facts only, rewritten, credited in CREDITS.md): Koenkk/zigbee-herdsman-converters
 * src/devices/tuya.ts, definition model "ZS-SF00" (vendor Arteco, fingerprint
 * {modelID:"Arteco", manufacturerName:"A89G12C"}), upstream commit 1c90116.
 *
 * Pure: no Homey or Zigbee access. decode() returns what the driver should do, or null when the
 * DP is not part of this profile (the driver then keeps its generic path).
 */

const COUPLE = Object.freeze({ mfr: 'a89g12c', pid: 'ARTECO' });

/** True only for the exact couple (manufacturer case-insensitive, productId case-insensitive). */
function isZsSf00(manufacturerName, productId) {
  return String(manufacturerName || '').trim().toLowerCase() === COUPLE.mfr
    && String(productId || '').trim().toUpperCase() === COUPLE.pid;
}

function _num(v) {
  if (typeof v === 'boolean') { return v ? 1 : 0; }
  if (Buffer.isBuffer(v)) {
    if (v.length === 4) { return v.readInt32BE(0); }
    if (v.length === 2) { return v.readInt16BE(0); }
    if (v.length === 1) { return v.readUInt8(0); }
    return NaN;
  }
  return Number(v);
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * DP → action. kinds:
 *  - { capability, value }            measurement / alarm
 *  - { store, value }                 device-side configuration echo (kept in the store, never
 *                                     written back, never mapped onto Homey-side offsets)
 */
const DPS = Object.freeze({
  3: (n) => ({ capability: 'measure_humidity.soil', value: clamp(n, 0, 100) }),
  5: (n) => ({ capability: 'measure_temperature', value: Math.round(n) / 10 }),
  14: (n) => ({ capability: 'measure_battery', value: clamp(n, 0, 100) }),
  101: (n) => ({ capability: 'measure_humidity', value: clamp(n, 0, 100) }),
  102: (n) => ({ capability: 'measure_luminance', value: Math.max(0, n) }),
  103: (n) => ({ store: 'zs_sf00_soil_sampling', value: n }),
  104: (n) => ({ store: 'zs_sf00_soil_calibration', value: n }),
  105: (n) => ({ store: 'zs_sf00_humidity_calibration', value: n }),
  106: (n) => ({ store: 'zs_sf00_illuminance_calibration', value: n }),
  107: (n) => ({ store: 'zs_sf00_temperature_calibration', value: n / 10 }),
  110: (n) => ({ store: 'zs_sf00_soil_warning', value: n }),
  111: (n) => ({ capability: 'alarm_water', value: n === 1 }),
  112: (n) => ({ capability: 'measure_ec', value: clamp(n, 0, 5000) }),
  114: (n) => ({ store: 'zs_sf00_fertility_warning_setting', value: n }),
  115: (n) => ({ store: 'zs_sf00_fertility_warning', value: n === 1 }),
});

function decode(dp, value) {
  const fn = DPS[Number(dp)];
  if (!fn) { return null; }
  const n = _num(value);
  if (!Number.isFinite(n)) { return null; }
  return Object.assign({ dp: Number(dp) }, fn(n));
}

const SOURCE = 'z2m:zigbee-herdsman-converters tuya.ts ZS-SF00 (Arteco, A89G12C|Arteco) @1c90116';

module.exports = { COUPLE, DPS, SOURCE, isZsSf00, decode };
