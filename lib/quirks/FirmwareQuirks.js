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
    .filter((q) => q && q.status === 'runtime' && q.type);
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

module.exports = {
  getQuirks,
  forDevice,
  transformDp,
  startKeepAlive,
  stop,
  invertBoolish,
  _all: () => QUIRKS.slice(),
};
