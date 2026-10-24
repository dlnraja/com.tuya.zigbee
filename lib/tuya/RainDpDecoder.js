'use strict';

/**
 * P2972 — Tuya rain sensor DP decoder (old and new firmware layouts).
 *
 * Sources (facts only, own wording): Koenkk/zigbee-herdsman-converters src/devices/tuya.ts
 *  - RB-SRAIN01 (TS0207 _TZ3210_tgvtvdoc / _TZ3210_p68kms0l): DP4 battery %, DP101 solar mV,
 *    DP102 20-min average mV, DP103 daily max mV, DP104 cleaning reminder, DP105 rain intensity mV;
 *    rain itself comes from IAS Zone alarm_1 (stays primary in the Homey driver).
 *  - older TS0601 rain sensors (this repo, issue #326 _TZE200_u6x1zyv2): DP1 rain bool/enum,
 *    DP2 rain level %, DP4/DP15 battery, DP101 illuminance, DP106 rain level on some variants.
 * Values may arrive as numbers, Buffers, hex, base64, arrays, BE or LE: PayloadNormalizer handles it.
 */
const { toNumber, normalizePayload } = require('./PayloadNormalizer');

const RAIN_MV_THRESHOLD = 50; // matches the existing driver threshold (#417)

const LAYOUTS = {
  rb_srain01: { battery: [4], illuminance_mv: [101], illuminance_avg_mv: [102], illuminance_max_mv: [103], cleaning: [104], rain_mv: [105] },
  legacy_ts0601: { rain: [1], rain_level: [2, 106], battery: [4, 15], illuminance: [101], rain_mv: [105] },
};

/** Guess the layout from the DP ids present (or from the mfr when known). */
function detectLayout(dps, mfr = '') {
  const m = String(mfr).toLowerCase();
  if (m.includes('tgvtvdoc') || m.includes('p68kms0l')) {return 'rb_srain01';}
  const set = new Set(dps);
  if (set.has(103) || set.has(104) || (set.has(105) && !set.has(1) && !set.has(2))) {return 'rb_srain01';}
  return 'legacy_ts0601';
}

function truthy(v) {
  if (typeof v === 'string') {return !['0', 'false', 'normal', 'dry', 'off', ''].includes(v.toLowerCase());}
  const n = toNumber(v);
  return n == null ? !!v : n !== 0;
}

/**
 * Decode rain DPs. `input` may be: {dp: value} map, an array of {dp, value|data}, or any raw
 * payload accepted by normalizePayload (Buffer, hex, base64, COBS, length-prefixed).
 * Returns { layout, values: {...}, unknown: {dp: value} }.
 */
function decodeRain(input, { mfr } = {}) {
  let entries = [];
  if (input && typeof input === 'object' && !Buffer.isBuffer(input) && !Array.isArray(input) && !(input instanceof Uint8Array) && input.type !== 'Buffer') {
    entries = Object.entries(input).map(([dp, value]) => ({ dp: Number(dp), value }));
  } else if (Array.isArray(input) && input.length && typeof input[0] === 'object') {
    entries = input.map((r) => ({ dp: Number(r.dp), value: r.value !== undefined ? r.value : r.data }));
  } else {
    const norm = normalizePayload(input);
    if (!norm || !norm.records) {return null;}
    entries = norm.records.map((r) => ({ dp: r.dp, value: r.value }));
  }
  const layout = detectLayout(entries.map((e) => e.dp), mfr);
  const map = LAYOUTS[layout];
  const values = {};
  const unknown = {};
  for (const { dp, value } of entries) {
    const key = Object.keys(map).find((k) => map[k].includes(dp));
    if (!key) { unknown[dp] = value; continue; }
    if (key === 'rain' || key === 'cleaning') {values[key] = truthy(value);}
    else {
      const n = toNumber(value, { max: key === 'battery' || key === 'rain_level' ? 100 : 100000 });
      if (n != null) {values[key] = n;}
    }
  }
  if (values.battery != null) {values.battery = Math.max(0, Math.min(100, values.battery));}
  if (values.rain_mv != null && values.rain === undefined) {values.raining = values.rain_mv > (layout === 'rb_srain01' ? RAIN_MV_THRESHOLD : 0);}
  if (values.rain !== undefined) {values.raining = values.rain;}
  return { layout, values, unknown };
}

module.exports = { decodeRain, detectLayout, LAYOUTS, RAIN_MV_THRESHOLD };
