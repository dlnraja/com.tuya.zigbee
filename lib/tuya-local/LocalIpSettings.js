'use strict';

/**
 * P3072 — one IP for a Wi-Fi Tuya device, whatever setting key holds it.
 *
 * Why: the manifest declares `ip` (or `device_ip` on the radiator), pairing and the repair
 * view historically wrote `ip_address`, the LAN client self-heal wrote `ip`. The runtime reads
 * `ip || device_ip || ip_address`, so an IP typed in Repair could be shadowed by an older
 * `ip` after the next restart. Every writer now goes through `mirrorIpPatch`, which writes the
 * same value into every IP key the device already has. Pure functions, no I/O.
 *
 * Idea (own wording): localtuya / tuya-local keep a single "host" field per device and update
 * it in place when discovery sees the device elsewhere; we keep our historical keys for
 * compatibility and simply keep them equal.
 */

const IP_KEYS = Object.freeze(['ip', 'device_ip', 'ip_address']);

function _has(obj, key) {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined && obj[key] !== null;
}

/** Same precedence as the runtime has always used. */
function effectiveIp(settings) {
  const s = settings || {};
  return s.ip || s.device_ip || s.ip_address || '';
}

/**
 * Extend a settings patch so every IP key present on the device gets the same value.
 * Non-IP fields are returned untouched. When the patch carries no IP key it is returned as is.
 */
function mirrorIpPatch(current, patch) {
  if (!patch || typeof patch !== 'object') {return patch;}
  const keyInPatch = IP_KEYS.find((k) => _has(patch, k));
  if (!keyInPatch) {return patch;}
  const value = typeof patch[keyInPatch] === 'string' ? patch[keyInPatch].trim() : String(patch[keyInPatch]);
  const out = { ...patch };
  for (const k of IP_KEYS) {
    if (k === keyInPatch || _has(current, k) || _has(patch, k)) {out[k] = value;}
  }
  return out;
}

/**
 * Boot-time alignment: returns a patch making all present IP keys equal to the IP the runtime
 * already uses (no change in effective IP), or null when they already agree.
 */
function healIpSettings(current) {
  const eff = effectiveIp(current);
  if (!eff) {return null;}
  const patch = {};
  for (const k of IP_KEYS) {
    if (_has(current, k) && current[k] !== eff) {patch[k] = eff;}
  }
  return Object.keys(patch).length ? patch : null;
}

module.exports = { IP_KEYS, effectiveIp, mirrorIpPatch, healIpSettings };
