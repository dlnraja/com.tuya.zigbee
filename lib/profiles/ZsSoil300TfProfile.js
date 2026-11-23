'use strict';

/**
 * P3401: Excellux ZS-300TF / ZS-301Z soil fertility sensor - exact couples
 * `_TZE284_hdml1aav` | `TS0601` and `_TZE2841000000_hdml1aav` | `TS0601`.
 *
 * WHY (forum 140352 #2278/#2279, 3 units): temperature showed the right value, then fell to
 * 0 / 0.1 C; luminance stayed null. The generic soil map read DP102 (illuminance on this unit)
 * as soil calibration, DP107 (temperature calibration) as soil moisture, DP111 (water warning)
 * as a sampling setting, and DPs it did not know (115 fertility threshold, 116 fertility warning
 * enum) fell through to the universal "auto-temp" heuristic, which wrote value/10 into
 * measure_temperature (116 = 0 -> 0 C, 115 = 1 -> 0.1 C). DP5 is always tenths on this unit.
 *
 * Source (facts only, rewritten): Koenkk/zigbee-herdsman-converters src/devices/tuya.ts,
 * definition model "ZS-300TF" (vendor Excellux, fingerprint TS0601 +
 * ["_TZE284_hdml1aav", "_TZE2841000000_hdml1aav"]) @9bb230d (2026-11-21).
 *
 * Pure: no Homey or Zigbee access. decode() returns what the driver should do:
 *  - { capability, value }  measurement / alarm
 *  - { store, value }       device-side configuration echo (store only, never a Homey offset)
 *  - { skip: true }         DP outside the Z2M map for this couple: never guessed
 *  - null                   keep the generic path (battery DP14/DP15 go to the battery handler)
 */

const MFRS = Object.freeze(['_tze284_hdml1aav', '_tze2841000000_hdml1aav']);
const PID = 'TS0601';

function isZs300Tf(manufacturerName, productId) {
  return MFRS.includes(String(manufacturerName || '').trim().toLowerCase())
    && String(productId || '').trim().toUpperCase() === PID;
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

const DPS = Object.freeze({
  3: (n) => ({ capability: 'measure_humidity.soil', value: clamp(n, 0, 100) }),
  5: (n) => ({ capability: 'measure_temperature', value: Math.round(n) / 10 }),
  101: (n) => ({ capability: 'measure_humidity', value: clamp(n, 0, 100) }),
  102: (n) => ({ capability: 'measure_luminance', value: Math.max(0, n) }),
  103: (n) => ({ store: 'zs300tf_report_period', value: n }),
  104: (n) => ({ store: 'zs300tf_soil_calibration', value: n }),
  105: (n) => ({ store: 'zs300tf_humidity_calibration', value: n }),
  106: (n) => ({ store: 'zs300tf_illuminance_calibration', value: n }),
  107: (n) => ({ store: 'zs300tf_temperature_calibration', value: n / 10 }),
  110: (n) => ({ store: 'zs300tf_soil_warning', value: n }),
  111: (n) => ({ capability: 'alarm_water', value: n === 1 }),
  112: (n) => ({ capability: 'measure_ec', value: clamp(n, 0, 5000) }),
  113: (n) => ({ store: 'zs300tf_soil_fertility_calibration', value: n }),
  114: (n) => ({ store: 'zs300tf_soil_fertility_set_v0', value: n }),
  115: (n) => ({ store: 'zs300tf_soil_fertility_set_v1', value: n }),
  116: (n) => ({ store: 'zs300tf_soil_fertility_warning', value: ['none', 'low', 'high'][n] || String(n) }),
});

// Battery: DP15 % (Z2M) and DP14 state stay on the driver's battery path (SoilDpGuards).
const PASS_THROUGH = Object.freeze([14, 15]);

function decode(dp, value) {
  const d = Number(dp);
  if (PASS_THROUGH.includes(d)) { return null; }
  const fn = DPS[d];
  if (!fn) { return { dp: d, skip: true }; }
  const n = _num(value);
  if (!Number.isFinite(n)) { return { dp: d, skip: true }; }
  return Object.assign({ dp: d }, fn(n));
}

const SOURCE = 'z2m:zigbee-herdsman-converters tuya.ts ZS-300TF (Excellux, TS0601 _TZE284_hdml1aav/_TZE2841000000_hdml1aav) @9bb230d';

module.exports = { MFRS, PID, DPS, SOURCE, isZs300Tf, decode };
