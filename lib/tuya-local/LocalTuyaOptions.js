'use strict';

/**
 * P3080 — opt-in LAN options, ideas from localtuya (rospogrigio/localtuya, xZetsubou/hass-localtuya).
 * Own implementation, no code copied. Every option is OFF unless the device carries the key
 * (device setting, else device store), so default behaviour is unchanged. All lists are bounded.
 */

const MAX_DPS = 32;
const RESET_COOLDOWN_MS = 60000;
const RESET_TIMEOUT_MS = 3000;

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
  MAX_DPS, RESET_COOLDOWN_MS, RESET_TIMEOUT_MS, readOpt, parseDpList, ResetDpidsGuard,
};
