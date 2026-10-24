'use strict';

/**
 * P3013 — exact DP tables for four master-only dedicated drivers.
 * Each couple (manufacturerName + productId) lives on exactly one driver.
 *
 * Sources (Koenkk/zigbee-herdsman-converters, src/devices/tuya.ts — rewritten in our own words):
 *  - AE-5503-S-H-ZIGBEE sauna thermostat, `_TZE204_eaasry7v`  — PR #13225 (Vadim Surpin, 2026-09-18)
 *  - Moes MG-BJQ002 plug-in siren + RGB night light, `_TZE20C_tjz9ad5g` — PR #13201 (Paap, 2026-09-16)
 *  - TS0601_6gang_switch_2 6-gang panel with metering, `_TZE284_hbxadcl0` — PR #13085 (hammondses, 2026-09-04)
 *  - Novato ZPV-01 battery valve, `_TZE284_zm8zpwas` — tuya.ts ZPV-01 definition
 *
 * WHY: the shared base drivers interpret the same DP ids differently (e.g. siren DP1 is a bool on
 * TS0216 firmwares but an enum on MG-BJQ002; 6-gang DP15 is backlight elsewhere but power-on here).
 * The pure helpers below are used for RX (dpMappings) and TX (encode*), and are unit tested.
 */

const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true' || v === 'on';

function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) {return lo;}
  return Math.max(lo, Math.min(hi, x));
}

// ── AE-5503 sauna thermostat ────────────────────────────────────────────────
const SAUNA_AE5503 = Object.freeze({
  mfr: ['_TZE204_eaasry7v'],
  pid: ['TS0601'],
  setpoint: { min: 0, max: 120, step: 1 },
  rx: {
    1: { capability: 'onoff', transform: truthy }, // system_mode heat=true / off=false
    16: { capability: 'target_temperature', divisor: 1 }, // °C raw
    24: { capability: 'measure_temperature', divisor: 1 }, // °C raw
    40: { capability: 'child_lock', transform: truthy },
  },
  encodeOnOff: (v) => ({ dp: 1, value: !!v, type: 'bool' }),
  encodeSetpoint: (v) => ({ dp: 16, value: Math.round(clamp(v, 0, 120)), type: 'value' }),
  encodeChildLock: (v) => ({ dp: 40, value: !!v, type: 'bool' }),
});

// ── Moes MG-BJQ002 siren ────────────────────────────────────────────────────
const ALARM = Object.freeze({ sound: 0, light: 1, sound_light: 2, off: 3 });
const VOLUME_TO_CAP = Object.freeze({ 0: 0.33, 1: 0.66, 2: 1, 3: 0 }); // low, medium, high, mute
const LIGHT_MODE = Object.freeze({ rainbow: 0, red_flash: 1, night_light: 2 });

const SIREN_MG_BJQ002 = Object.freeze({
  mfr: ['_TZE20C_tjz9ad5g'],
  pid: ['TS0601'],
  rx: {
    1: { capability: 'onoff', transform: (v) => Number(v) !== ALARM.off },
    5: { capability: 'volume_set', transform: (v) => VOLUME_TO_CAP[Number(v)] ?? 0.66 },
    7: { capability: null, internal: 'alarm_duration_s' },
    21: { capability: null, internal: 'ringtone_index' },
    22: { capability: 'onoff.night_light', transform: truthy },
    23: { capability: null, internal: 'light_mode' },
  },
  encodeAlarm: (on, mode) => ({
    dp: 1,
    value: on ? ALARM[mode] ?? ALARM.sound_light : ALARM.off,
    type: 'enum',
  }),
  encodeVolume: (capValue) => {
    const v = Number(capValue);
    let e = 2;
    if (!Number.isFinite(v) || v <= 0) {e = 3;}
    else if (v < 0.4) {e = 0;}
    else if (v < 0.75) {e = 1;}
    return { dp: 5, value: e, type: 'enum' };
  },
  encodeDuration: (s) => ({ dp: 7, value: Math.round(clamp(s, 1, 1800)), type: 'value' }),
  encodeRingtone: (n) => ({ dp: 21, value: Math.round(clamp(n, 1, 32)) - 1, type: 'enum' }),
  encodeNightLight: (v) => ({ dp: 22, value: !!v, type: 'bool' }),
  encodeLightMode: (m) => ({ dp: 23, value: LIGHT_MODE[m] ?? LIGHT_MODE.night_light, type: 'enum' }),
});

// ── TS0601 6-gang panel with metering ───────────────────────────────────────
const gang = (cap) => ({ capability: cap, transform: truthy });
const SWITCH6_HBXADCL0 = Object.freeze({
  mfr: ['_TZE284_hbxadcl0'],
  pid: ['TS0601'],
  rx: {
    1: gang('onoff'), 2: gang('onoff.gang2'), 3: gang('onoff.gang3'),
    4: gang('onoff.gang4'), 5: gang('onoff.gang5'), 6: gang('onoff.gang6'),
    15: { capability: null, internal: 'power_on_behavior' }, // NOT backlight on this firmware
    16: { capability: null, internal: 'backlight' },
    20: { capability: 'meter_power', divisor: 100 }, // kWh ×100
    21: { capability: 'measure_current', divisor: 1000 }, // A ×1000
    22: { capability: 'measure_power', divisor: 10 }, // W ×10
    23: { capability: 'measure_voltage', divisor: 10 }, // V ×10
    101: { capability: null, internal: 'child_lock' },
    109: { capability: null, internal: 'indicator' },
    136: { capability: null, internal: 'state_all' },
  },
  encodeGang: (g, v) => ({ dp: clamp(g, 1, 6), value: !!v, type: 'bool' }),
});

// ── Novato ZPV-01 valve ─────────────────────────────────────────────────────
const VALVE_STATE = Object.freeze({ 0: 'unknown', 1: 'open', 2: 'closed' });
const VALVE_NOVATO_ZPV01 = Object.freeze({
  mfr: ['_TZE284_zm8zpwas'],
  pid: ['TS0601'],
  rx: {
    1: { capability: 'onoff', transform: truthy },
    8: { capability: null, internal: 'valve_state', transform: (v) => VALVE_STATE[Number(v)] || 'unknown' },
    101: { capability: 'measure_battery', transform: (v) => Math.round(clamp(v, 0, 100)) },
  },
  encodeOnOff: (v) => ({ dp: 1, value: !!v, type: 'bool' }),
});

/** Clone a frozen rx table into a plain object the bases can read (and never mutate ours). */
function rxTable(profile) {
  const out = {};
  for (const [dp, m] of Object.entries(profile.rx)) {out[dp] = { ...m };}
  return out;
}

/** Parallel-safe TX: canonical max-fallback helper first, then the device's own sender. */
async function sendEncoded(device, enc) {
  if (!device || !enc) {return false;}
  try {
    const { sendEf00DpMaxFallback } = require('../../zigbee/Ef00OnlyInterview');
    const r = await sendEf00DpMaxFallback(device, enc.dp, enc.value, enc.type);
    if (r !== false) {return true;}
  } catch (_) { /* fall through */ }
  if (typeof device._sendTuyaDP === 'function') {
    await device._sendTuyaDP(enc.dp, enc.value, enc.type);
    return true;
  }
  return false;
}

module.exports = {
  SAUNA_AE5503,
  SIREN_MG_BJQ002,
  SWITCH6_HBXADCL0,
  VALVE_NOVATO_ZPV01,
  ALARM,
  rxTable,
  sendEncoded,
  truthy,
};
