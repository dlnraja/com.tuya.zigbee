'use strict';

/**
 * P3067: power metering datapoints of a few Tuya thermostats / TRVs, exact manufacturer names only
 * (facts from Zigbee2MQTT tuya.ts; own implementation, credit Koen Kanters and the
 * zigbee-herdsman-converters contributors):
 *  - AETZ01_AC `_TZE200_snfdqllf`: DP116 power (W, raw), DP117 energy (kWh, raw)
 *  - TWC-R01 `_TZE204_ilzkxrav`: DP11 power, DP115 voltage, DP116 current, DP117 energy (all /10)
 *  - pilot wire thermostat `_TZE204_0hcjew5p`: DP11 power /10, DP101 voltage /10, DP102 current /1000,
 *    DP107 energy /10
 * The capabilities are added on the first real report (LateCapability), never at pairing.
 * Sources re-checked 2026-10-26 in zhc tuya.ts (AETZ01_AC raw, TWC-R01 /10, pilot-wire /10 + current /1000).
 * The wall thermostat must consume DP101 here: it is also an FCU signal DP and would otherwise arm the FCU path.
 */
const TABLE = Object.freeze({
  _tze200_snfdqllf: { 116: ['measure_power', 1], 117: ['meter_power', 1] },
  _tze204_ilzkxrav: { 11: ['measure_power', 10], 115: ['measure_voltage', 10], 116: ['measure_current', 10], 117: ['meter_power', 10] },
  _tze204_0hcjew5p: { 11: ['measure_power', 10], 101: ['measure_voltage', 10], 102: ['measure_current', 1000], 107: ['meter_power', 10] },
});

function decode(mfr, dp, raw) {
  const row = TABLE[String(mfr || '').toLowerCase()];
  const spec = row && row[Number(dp)];
  if (!spec) {return null;}
  const n = Buffer.isBuffer(raw) ? raw.length >= 4 ? raw.readInt32BE(0) : NaN : Number(raw);
  if (!Number.isFinite(n) || n < 0) {return { capability: spec[0], value: null };}
  return { capability: spec[0], value: Math.round((n / spec[1]) * 1000) / 1000 };
}

/** @returns {boolean} true when the DP was a metering DP of this couple (consumed). */
function handle(device, mfr, dp, raw) {
  const r = decode(mfr, dp, raw);
  if (!r) {return false;}
  if (r.value !== null) {
    require('../helpers/LateCapability').ensureAndSet(device, r.capability, r.value).catch(() => {});
  }
  return true;
}

module.exports = { TABLE, decode, handle };
