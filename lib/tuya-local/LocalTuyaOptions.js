'use strict';

/**
 * P3080 — opt-in LAN options, ideas from localtuya (rospogrigio/localtuya, xZetsubou/hass-localtuya).
 * Own implementation, no code copied. Every option is OFF unless the device carries the key
 * (device setting, else device store), so default behaviour is unchanged. All lists are bounded.
 */

const MAX_DPS = 32;
const RESET_COOLDOWN_MS = 60000;
const RESET_TIMEOUT_MS = 3000;
const RESTORE_MAX_DPS = 16;
const RESTORE_DELAY_MS = 2000;
const RESTORE_COOLDOWN_MS = 60000;
const MANUAL_DPS_DELAY_MS = 5000;

/** Opt-in value: device setting first, then device store; undefined when absent. */
function readOpt(device, key) {
  try {
    const s = typeof device?.getSetting === 'function' ? device.getSetting(key) : undefined;
    if (s !== undefined && s !== null && s !== '') {return s;}
  } catch (_e) { /* soft */ }
  try {
    const v = typeof device?.getStoreValue === 'function' ? device.getStoreValue(key) : undefined;
    if (v !== undefined && v !== null && v !== '') {return v;}
  } catch (_e) { /* soft */ }
  return undefined;
}

/** "1, 2,20" or [1,'2'] → ['1','2','20']: integers 1..255, unique, at most MAX_DPS. */
function parseDpList(value) {
  if (value === undefined || value === null || value === false) {return [];}
  const parts = Array.isArray(value) ? value : String(value).split(/[\s,;]+/);
  const out = [];
  for (const p of parts) {
    const n = Number(String(p).trim());
    if (!Number.isInteger(n) || n < 1 || n > 255) {continue;}
    const id = String(n);
    if (!out.includes(id)) {out.push(id);}
    if (out.length >= MAX_DPS) {break;}
  }
  return out;
}

/** Opt-in flag: true / 1 / "on" / "yes" / "true". Anything else (or absent) = off. */
function isOptOn(value) {
  if (value === true || value === 1) {return true;}
  return typeof value === 'string' && ['1', 'true', 'on', 'yes'].includes(value.trim().toLowerCase());
}

/**
 * restore_on_reconnect: from the DP snapshot taken when the link dropped, keep only DPs that a
 * capability maps (so the app knows how to write them), with plain values, at most RESTORE_MAX_DPS.
 */
function pickRestoreDps(snapshot, capabilityMap, max = RESTORE_MAX_DPS) {
  const out = {};
  if (!snapshot || typeof snapshot !== 'object' || !Array.isArray(capabilityMap)) {return out;}
  let n = 0;
  for (const entry of capabilityMap) {
    if (n >= max) {break;}
    if (!entry || entry.dp === undefined || entry.readOnly === true || entry.writable === false) {continue;}
    const id = String(entry.dp);
    if (id in out || !Object.prototype.hasOwnProperty.call(snapshot, id)) {continue;}
    const v = snapshot[id];
    if (v === null || !['boolean', 'number', 'string'].includes(typeof v)) {continue;}
    out[id] = v;
    n++;
  }
  return out;
}

/**
 * reset_dpids: after a failed status request, ask again for these DP ids only.
 * At most one re-query per cooldown window, so a dead socket cannot loop.
 */
class ResetDpidsGuard {
  constructor({ cooldownMs = RESET_COOLDOWN_MS, now = Date.now } = {}) {
    this._cooldownMs = cooldownMs;
    this._now = now;
    this._last = 0;
  }

  allow() {
    const t = this._now();
    if (this._last && t - this._last < this._cooldownMs) {return false;}
    this._last = t;
    return true;
  }
}

module.exports = {
  MAX_DPS, RESET_COOLDOWN_MS, RESET_TIMEOUT_MS, RESTORE_MAX_DPS, RESTORE_DELAY_MS, RESTORE_COOLDOWN_MS,
  MANUAL_DPS_DELAY_MS, readOpt, parseDpList, isOptOn, pickRestoreDps, ResetDpidsGuard,
};
