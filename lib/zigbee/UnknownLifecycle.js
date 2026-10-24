'use strict';

/**
 * P3020 — lifecycle release for the P3011 / P3016 / P3017 per-device state.
 *
 * WHY: those layers keep bounded per-device state (UnsupportedRegistry persist timer,
 * UnknownCommandSink debounce timer, UnknownLearning dirty map, UnknownCommandEngine
 * module-level `_last` entry keyed by device id, ZclUnsupportedGuard WeakMap entries)
 * but nothing released it when Homey uninitialised (app restart/update) or deleted the
 * device. Bounded caps limited the damage; this makes the release explicit:
 *   - onUninit  → flush what is dirty once (so learning survives a restart), clear timers;
 *   - onDeleted → clear timers, drop state, never write to a deleted device's store.
 * Idempotent and never throws (safe to call from several lifecycle layers).
 */

function _clear(device, t) {
  if (!t) { return; }
  try {
    if (device && device.homey && typeof device.homey.clearTimeout === 'function') { device.homey.clearTimeout(t); }
  } catch (_e) { /* soft */ }
  try { clearTimeout(t); } catch (_e) { /* soft */ }
}

function _write(device, key, value) {
  try {
    if (device && typeof device.setStoreValue === 'function' && value != null) {
      Promise.resolve(device.setStoreValue(key, value)).catch(() => {});
    }
  } catch (_e) { /* soft */ }
}

/**
 * @param {Object} device - Homey device
 * @param {{deleted?: boolean}} [opts]
 * @returns {{released: string[]}} what was released (for tests/diag)
 */
function releaseDevice(device, opts = {}) {
  const released = [];
  if (!device || typeof device !== 'object') { return { released }; }
  const deleted = !!opts.deleted;

  // P3011 UnsupportedRegistry: pending 2 s persist timer.
  try {
    const reg = device._unsupportedRegistry;
    if (reg) {
      if (reg._persistTimer) { _clear(device, reg._persistTimer); reg._persistTimer = null; released.push('registry.timer'); }
      if (!deleted && reg._dirty) { reg._dirty = false; _write(device, 'zcl_unsupported_matrix', reg._map); released.push('registry.flush'); }
      if (deleted) { device._unsupportedRegistry = null; }
    }
  } catch (_e) { /* soft */ }

  // P3011 UnknownCommandSink: debounce timer + ring.
  try {
    const st = device._unknownIncoming;
    if (st) {
      if (st.timer) {
        _clear(device, st.timer); st.timer = null; released.push('sink.timer');
        if (!deleted) { _write(device, 'zcl_unknown_incoming', st.counts); released.push('sink.flush'); }
      }
      if (deleted) { delete device._unknownIncoming; }
    }
  } catch (_e) { /* soft */ }

  // P3016/P3017 UnknownCommandEngine (+ UnknownLearning flush): module-level entry for this device.
  try {
    if (deleted) {
      // never flush into a deleted device's store
      try { if (device._unknownLearn) { device._unknownLearn.dirty = false; } } catch (_e) { /* soft */ }
    }
    if (device._unknownEngine || device._unknownLearn || deleted) {
      require('./UnknownCommandEngine').dispose(device);
      released.push('engine');
    }
    if (deleted) { delete device._unknownLearn; }
  } catch (_e) { /* soft */ }

  // P3011 ZclUnsupportedGuard: per-node caches (WeakMap — drop eagerly on delete).
  if (deleted) {
    try { if (device.zclNode) { require('./ZclUnsupportedGuard').forget(device.zclNode); released.push('guard'); } } catch (_e) { /* soft */ }
  }
  // P3023: listeners / queues / caches added by the memory + smart layers. Every closure that
  // retains the device is dropped here so an uninitialised / deleted device can be collected.
  try { const n = require('./EndpointCoverage').detach(device); if (n) { released.push('endpointCoverage'); } } catch (_e) { /* soft */ }
  try { const n = require('./ZigbeeCommandPacer').releaseQueue(device); if (n) { released.push('pacer'); } } catch (_e) { /* soft */ }
  try { if (device._rawFrameDeduplicator && typeof device._rawFrameDeduplicator.clear === 'function') { device._rawFrameDeduplicator.clear(); released.push('rfd'); } } catch (_e) { /* soft */ }
  try { if (require('./MethodChain').trim(device)) { released.push('methodChain'); } } catch (_e) { /* soft */ }
  try { if (device._p3023anomaly) { require('../smart/ValueAnomaly').release(device); released.push('anomaly'); } } catch (_e) { /* soft */ }
  return { released };
}

module.exports = { releaseDevice };
