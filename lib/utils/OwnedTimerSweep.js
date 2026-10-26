'use strict';

/**
 * P3065: owned-timer sweep, run when a device is deleted or uninitialised.
 *
 * Many managers start Homey intervals (watchdog ping, battery poll, battery health analysis,
 * periodic enricher, learners...) and keep the handle on themselves. When their own cleanup is
 * missing or skipped, the interval stays armed after the device is gone and its closure keeps
 * the whole device (and its managers) alive: a load harness showed ~150 dead devices and ~500
 * live intervals per delete/re-pair cycle of all drivers.
 *
 * This sweep is a safety net, never a replacement for a manager's own cleanup:
 *  - it clears Node Timeout handles stored on the device itself;
 *  - it descends only into objects the device OWNS (they point back to the device through
 *    device/_device/ctx/owner/parent), so app-level or driver-level timers are never touched;
 *  - it never descends into homey, driver, zclNode or node;
 *  - it never throws.
 */

const SKIP_KEYS = new Set(['homey', 'driver', 'zclNode', 'node', '_zclNode', 'app', '_app']);
const DEFERRED_MS = 30000;
const OWNER_KEYS = ['device', '_device', 'ctx', 'owner', 'parent', '_owner'];

function isTimer(v) {
  return !!v && typeof v === 'object'
    && typeof v.hasRef === 'function' && typeof v.refresh === 'function'
    && Object.prototype.hasOwnProperty.call(v, '_onTimeout');
}

function clearOne(device, t) {
  try { if (device && device.homey && typeof device.homey.clearInterval === 'function') {device.homey.clearInterval(t);} } catch (_e) { /* soft */ }
  try { if (device && device.homey && typeof device.homey.clearTimeout === 'function') {device.homey.clearTimeout(t);} } catch (_e) { /* soft */ }
  try { clearInterval(t); } catch (_e) { /* soft */ }
}

function ownedBy(obj, device) {
  if (!obj || typeof obj !== 'object') {return false;}
  for (const k of OWNER_KEYS) {
    try { if (obj[k] === device) {return true;} } catch (_e) { /* getter */ }
  }
  return false;
}

function sweepContainer(device, value, stats) {
  try {
    if (Array.isArray(value)) {
      for (const it of value) {if (isTimer(it)) { clearOne(device, it); stats.cleared++; }}
    } else if (value instanceof Set) {
      for (const it of value) {if (isTimer(it)) { clearOne(device, it); stats.cleared++; }}
    } else if (value instanceof Map) {
      for (const it of value.values()) {if (isTimer(it)) { clearOne(device, it); stats.cleared++; }}
    }
  } catch (_e) { /* soft */ }
}

function walk(device, obj, depth, seen, stats, maxDepth) {
  if (!obj || typeof obj !== 'object' || seen.has(obj)) {return;}
  seen.add(obj);
  let keys;
  try { keys = Object.keys(obj); } catch (_e) { return; }
  for (const k of keys) {
    if (SKIP_KEYS.has(k)) {continue;}
    let v;
    try { v = obj[k]; } catch (_e) { continue; }
    if (!v || typeof v !== 'object') {continue;}
    if (isTimer(v)) {
      clearOne(device, v);
      stats.cleared++;
      try { obj[k] = null; } catch (_e) { /* getter-only */ }
      continue;
    }
    if (v === device.homey || v === device.driver) {continue;}
    if (Array.isArray(v) || v instanceof Set || v instanceof Map) { sweepContainer(device, v, stats); continue; }
    if (depth < maxDepth && ownedBy(v, device)) {walk(device, v, depth + 1, seen, stats, maxDepth);}
  }
}

/**
 * @param {object} device Homey device instance
 * @param {{maxDepth?: number, deferred?: boolean}} [opts] deferred: sweep again once after 30 s
 * @returns {{cleared: number}}
 */
function sweepOwnedTimers(device, opts = {}) {
  const stats = { cleared: 0 };
  if (!device || typeof device !== 'object') {return stats;}
  try { walk(device, device, 0, new WeakSet(), stats, Number.isInteger(opts.maxDepth) ? opts.maxDepth : 3); } catch (_e) { /* never throws */ }
  // A late async init step may still arm a timer after delete/uninit: sweep once more, later.
  if (opts.deferred && !device.__p3065SweepArmed) {
    try {
      device.__p3065SweepArmed = true;
      const h = device.homey && typeof device.homey.setTimeout === 'function' ? device.homey : globalThis;
      const t = h.setTimeout(() => { try { walk(device, device, 0, new WeakSet(), { cleared: 0 }, 3); } catch (_e) { /* soft */ } }, DEFERRED_MS);
      if (t && typeof t.unref === 'function') {t.unref();}
    } catch (_e) { /* soft */ }
  }
  return stats;
}

module.exports = { sweepOwnedTimers, isTimer };
