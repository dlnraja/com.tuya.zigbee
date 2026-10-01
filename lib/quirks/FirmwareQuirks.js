'use strict';

/**
 * FirmwareQuirks — pair-scoped (mfr + pid) workarounds for known firmware bugs.
 *
 * Data: lib/data/firmware-quirks.json (pair | bug | workaround | source).
 * Only entries with status "runtime" are applied here; everything is soft:
 * a failure in this module must never block pairing, init or a DP frame.
 *
 * Contre quoi: firmware bugs documented by several communities for one exact
 * pair (e.g. inverted DP1 on _TZE284_iadro9bf, keep-alive on _TZ3210_cnicaghm).
 */

const { safeSetInterval, safeClearInterval } = require('../utils/safe-timers');

let QUIRKS = [];
try {
  QUIRKS = (require('../data/firmware-quirks.json').quirks || [])
    // P2790: `enabled: false` = workaround implemented but parked until a second source / user confirmation.
    .filter((q) => q && q.status === 'runtime' && q.type && q.enabled !== false);
} catch (_e) {
  QUIRKS = [];
}

const lc = (v) => String(v || '').trim().toLowerCase();

function readPair(device) {
  let mfr = '';
  let pid = '';
  try {
    const s = device.getSettings?.() || {};
    mfr = s.zb_manufacturer_name || s.zb_manufacturerName || '';
    pid = s.zb_model_id || s.zb_modelId || '';
  } catch (_e) { /* soft */ }
  try {
    if (!mfr) {mfr = device.getStoreValue?.('manufacturerName') || '';}
    if (!pid) {pid = device.getStoreValue?.('modelId') || '';}
  } catch (_e) { /* soft */ }
  return { mfr: lc(mfr), pid: lc(pid) };
}

/**
 * Exact pair match. mfr must match; pid must match when the device pid is known
 * (empty pid = interview incomplete → mfr alone, mfr ids here are unique).
 */
function getQuirks(mfr, pid, list = QUIRKS) {
  const m = lc(mfr);
  const p = lc(pid);
  if (!m) {return [];}
  return list.filter((q) => {
    if (!(q.mfr || []).some((x) => lc(x) === m)) {return false;}
    if (!p || !Array.isArray(q.pid) || q.pid.length === 0) {return true;}
    return q.pid.some((x) => lc(x) === p);
  });
}

function forDevice(device) {
  try {
    const { mfr, pid } = readPair(device);
    const key = `${mfr}|${pid}`;
    if (device._fwQuirksKey !== key) {
      device._fwQuirksKey = key;
      device._fwQuirks = getQuirks(mfr, pid);
    }
    return device._fwQuirks || [];
  } catch (_e) {
    return [];
  }
}

function logOnce(device, id, msg) {
  try {
    if (!device._fwQuirkLogCount) {device._fwQuirkLogCount = Object.create(null);}
    const n = (device._fwQuirkLogCount[id] || 0) + 1;
    device._fwQuirkLogCount[id] = n;
    if (n <= 3 || n % 100 === 0) {device.log?.(`[FW-QUIRK] ${id}: ${msg} (#${n})`);}
  } catch (_e) { /* soft */ }
}

/** Inverts a boolean-ish DP value; keeps the original type (bool / number). */
function invertBoolish(value) {
  if (typeof value === 'boolean') {return !value;}
  if (value === 0 || value === '0') {return 1;}
  if (value === 1 || value === '1') {return 0;}
  return value;
}

/**
 * Apply DP-level runtime quirks. Returns the (possibly) transformed value.
 */
function transformDp(device, dp, value) {
  try {
    const d = Number(dp);
    for (const q of forDevice(device)) {
      if (q.type === 'enum_remap' && Number(q.params?.dp) === d && q.params?.map && Object.prototype.hasOwnProperty.call(q.params.map, String(value))) {
        const out = q.params.map[String(value)];
        logOnce(device, q.id, `DP${d} enum ${JSON.stringify(value)} → ${JSON.stringify(out)}`);
        value = out;
        continue;
      }
      if (q.type === 'invert_bool_dp' && Number(q.params?.dp) === d) {
        const out = invertBoolish(value);
        if (out !== value) {logOnce(device, q.id, `DP${d} ${JSON.stringify(value)} → ${JSON.stringify(out)}`);}
        value = out;
      }
    }
  } catch (_e) { /* soft */ }
  return value;
}

/**
 * Start keep-alive polls (keepalive_basic_read). Idempotent; call stop() on uninit/delete.
 */
function startKeepAlive(device, zclNode) {
  try {
    const q = forDevice(device).find((x) => x.type === 'keepalive_basic_read');
    if (!q || device._fwQuirkKeepAlive) {return false;}
    const intervalMs = Math.max(30000, Number(q.params?.intervalMs) || 120000);
    const epId = Number(q.params?.endpoint) || 1;
    const attr = q.params?.attribute || 'appVersion';
    const tick = async () => {
      if (device._destroyed) {return stop(device);}
      try {
        const node = zclNode || device.zclNode;
        const basic = node?.endpoints?.[epId]?.clusters?.basic;
        if (basic?.readAttributes) {
          await basic.readAttributes([attr]);
          logOnce(device, q.id, `keep-alive read basic.${attr}`);
        }
      } catch (e) {
        logOnce(device, `${q.id}_err`, `keep-alive read failed: ${e?.message || e}`);
      }
      return undefined;
    };
    const h = safeSetInterval(device, tick, intervalMs);
    device._fwQuirkKeepAlive = h;
    device.log?.(`[FW-QUIRK] ${q.id}: keep-alive every ${intervalMs / 1000}s armed`);
    return true;
  } catch (_e) {
    return false;
  }
}

function stop(device) {
  try {
    const h = device._fwQuirkKeepAlive;
    if (!h) {return;}
    device._fwQuirkKeepAlive = null;
    safeClearInterval(device, h);
  } catch (_e) { /* soft */ }
}

/**
 * P2771 — persistent periodic alarm-pulse guard (type alarm_pulse_guard, opt-in per pair).
 * Some firmwares emit a spurious alarm pulse roughly every `periodMs` (≈60 min).
 * A `true` arriving ≈ one period (± toleranceMs) after the previous `true` is treated as
 * the periodic pulse and suppressed. The last-pulse timestamp lives in the device store,
 * so the guard survives app/device restarts (an in-memory guard is reset at every restart).
 * Lead: docs/automation/leads-other-apps.md "Periodic alarm pulse".
 *
 * @returns {boolean} true = drop this value
 */
function shouldSuppressAlarmPulse(device, capability, value, now = Date.now(), quirks = null) {
  try {
    if (value !== true && value !== 1) {return false;}
    const list = quirks || forDevice(device);
    const q = list.find((x) => x.type === 'alarm_pulse_guard' && x.params?.capability === capability);
    if (!q) {return false;}
    const periodMs = Math.max(60000, Number(q.params?.periodMs) || 3600000);
    const tolMs = Math.max(1000, Number(q.params?.toleranceMs) || 300000);
    const key = `fwq_pulse_${capability}`;
    let last = 0;
    try { last = Number(device.getStoreValue?.(key)) || 0; } catch (_e) { last = 0; }
    try { const p = device.setStoreValue?.(key, now); if (p && p.catch) {p.catch(() => {});} } catch (_e) { /* soft */ }
    if (!last) {return false;}
    const gap = now - last;
    // multiples of the period (a missed pulse) also count, up to 3 periods
    for (let k = 1; k <= 3; k++) {
      if (Math.abs(gap - k * periodMs) <= tolMs) {
        logOnce(device, q.id, `${capability} periodic pulse suppressed (gap ${Math.round(gap / 60000)} min)`);
        return true;
      }
    }
    return false;
  } catch (_e) {
    return false;
  }
}

/** First runtime quirk of `type` for this device (pair-scoped), or null. */
function getRuntime(device, type) {
  try {
    return forDevice(device).find((x) => x.type === type) || null;
  } catch (_e) {
    return null;
  }
}

/**
 * P2790 — button_dedupe: some remotes send the same press frame 2x a few hundred ms apart
 * (OFF→ON double toggle). Returns the pair-scoped dedupe window (ms) for identical
 * button+pressType, or 0 when no quirk applies. Caller keeps its own smaller window otherwise.
 */
function buttonDedupeMs(device) {
  const q = getRuntime(device, 'button_dedupe');
  if (!q) {return 0;}
  const ms = Number(q.params?.windowMs) || 500;
  return Math.max(100, Math.min(1500, ms));
}

/**
 * P2790 — onoff_commands_single: remotes that alternate genOnOff On/Off on every press
 * (toggle firmware) must map BOTH commands to a single press, else every 2nd press is read
 * as "double" and single seems missing.
 */
function onOffCommandsAreSingle(device) {
  return !!getRuntime(device, 'onoff_commands_single');
}

/** P2790 — invert_cover_position: firmware reports/accepts position as 100 − x (DP1 open/close unchanged). */
function coverPositionInverted(device) {
  return !!getRuntime(device, 'invert_cover_position');
}

/** P2790 — invert_color_temperature: firmware has warm/cold white swapped. Value 0–1 → 1 − value. */
function colorTemperatureInverted(device) {
  return !!getRuntime(device, 'invert_color_temperature');
}

/** Apply invert_color_temperature to a Homey 0–1 light_temperature value (TX and RX are symmetric). */
function mapColorTemperature(device, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {return value;}
  return colorTemperatureInverted(device) ? Math.max(0, Math.min(1, 1 - value)) : value;
}

/**
 * P2790 — gang_echo_restore: firmware that applies an app command on one gang to ALL gangs.
 * Pure decision helper (unit-tested): given the snapshot of the other gangs before the command
 * and their values after the window, returns the gangs to restore — only when EVERY other gang
 * flipped to the commanded value (a real simultaneous physical press on all gangs is implausible).
 * @param {Object<number,boolean>} before  other gangs → value before the command
 * @param {Object<number,boolean>} after   other gangs → value after the window
 * @param {boolean} commanded               value sent to the target gang
 * @returns {number[]} gangs to restore to their `before` value
 */
function gangsToRestore(before, after, commanded) {
  try {
    const gangs = Object.keys(before || {}).map(Number).filter((g) => typeof before[g] === 'boolean');
    if (!gangs.length) {return [];}
    const allEchoed = gangs.every((g) => before[g] !== commanded && after?.[g] === commanded);
    return allEchoed ? gangs : [];
  } catch (_e) {
    return [];
  }
}

module.exports = {
  getRuntime,
  buttonDedupeMs,
  onOffCommandsAreSingle,
  coverPositionInverted,
  colorTemperatureInverted,
  mapColorTemperature,
  gangsToRestore,
  shouldSuppressAlarmPulse,
  getQuirks,
  forDevice,
  transformDp,
  startKeepAlive,
  stop,
  invertBoolish,
  _all: () => QUIRKS.slice(),
};
