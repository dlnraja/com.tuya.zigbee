'use strict';

/**
 * P3023: DeviceTrim — shrink one device's OPTIONAL in-memory caches under memory pressure.
 *
 * Only caches / diagnostics are touched (dedup windows, unknown-frame rings, soft registry
 * entries, method-chain working copy, anomaly history, queued background TX). Capabilities,
 * listeners, persisted learning and core control paths are never touched; every step is
 * independent and try/catch-isolated so one failing module cannot block the others.
 */

function _try(fn) { try { return fn() ? 1 : 0; } catch (_e) { return 0; } }

function trimDevice(device) {
  if (!device || typeof device !== 'object') { return 0; }
  let n = 0;
  n += _try(() => require('../zigbee/UnknownCommandEngine').trim(device));
  n += _try(() => {
    const s = device._unknownIncoming;
    if (s && Array.isArray(s.ring) && s.ring.length > 4) { s.ring.splice(0, s.ring.length - 4); }
    if (s && s.lastFlow && typeof s.lastFlow.clear === 'function') { s.lastFlow.clear(); }
    return !!s;
  });
  n += _try(() => {
    const r = device._unsupportedRegistry;
    return r && typeof r.trimSoft === 'function' ? (r.trimSoft(), true) : false;
  });
  n += _try(() => {
    const d = device._rawFrameDeduplicator;
    return d && typeof d.clear === 'function' ? (d.clear(), true) : false;
  });
  n += _try(() => require('../zigbee/MethodChain').trim(device));
  n += _try(() => require('../smart/ValueAnomaly').trim(device));
  n += _try(() => require('../zigbee/ZigbeeCommandPacer').releaseQueue(device, { backgroundOnly: true }));
  return n;
}

/** Trim every device the app knows (homey.drivers). Returns the number of trimmed devices. */
function trimAll(homey, allDevices) {
  let count = 0;
  let list = [];
  try { list = typeof allDevices === 'function' ? allDevices(homey) : []; } catch (_e) { list = []; }
  for (const d of list) { if (trimDevice(d) > 0) { count++; } }
  return count;
}

module.exports = { trimDevice, trimAll };
