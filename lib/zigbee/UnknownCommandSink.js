'use strict';

/**
 * P3011: UnknownCommandSink — nothing a device sends is lost.
 *
 * Incoming ZCL frames that no Cluster/BoundCluster implements (2.6 'unknown_command_received',
 * 'binding_unavailable', 'cluster_unavailable'; 3.9 ZCLError UNSUP_CLUSTER_COMMAND /
 * 'not_implemented') used to be answered with a Default Response error and dropped.
 * They are now:
 *  1. recorded per device in a bounded ring (memory) + a small persisted counter map
 *     (store 'zcl_unknown_incoming', max 30 keys, debounced) for diagnostics;
 *  2. exposed to Flows through the EXISTING generic trigger `tuya_cluster_received`
 *     (tokens cluster_id / command_id / data_hex), rate-limited per key, plus the device's
 *     TuyaUniversalBridge when it has one.
 * Never throws.
 */

const RING_MAX = 25;
const PERSIST_MAX = 30;
const FLOW_MIN_INTERVAL_MS = 1000; // same cluster+cmd at most once per second into Flows
const PERSIST_DEBOUNCE_MS = 5000;

function _hex(n, w = 1) { // same format as TuyaUniversalBridge clusterHex ('0xEF00', '0x6')
  return `0x${(Number(n) >>> 0).toString(16).toUpperCase().padStart(w, '0')}`;
}

function _toHex(data) {
  try {
    if (Buffer.isBuffer(data)) { return data.toString('hex'); }
    if (data && data.type === 'Buffer' && Array.isArray(data.data)) { return Buffer.from(data.data).toString('hex'); }
  } catch (_e) { /* no-op */ }
  return '';
}

function _state(device) {
  if (!device._unknownIncoming) {
    device._unknownIncoming = { ring: [], lastFlow: new Map(), timer: null, counts: null };
  }
  return device._unknownIncoming;
}

function _persist(device, st) {
  if (st.timer) { return; }
  const sched = device.homey && typeof device.homey.setTimeout === 'function'
    ? device.homey.setTimeout.bind(device.homey) : setTimeout;
  st.timer = sched(() => {
    st.timer = null;
    try {
      if (device._destroyed || typeof device.setStoreValue !== 'function') { return; }
      Promise.resolve(device.setStoreValue('zcl_unknown_incoming', st.counts)).catch(() => {});
    } catch (_e) { /* no-op */ }
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * @param {Object} device - Homey device (may be null → no-op)
 * @param {Object} evt - { clusterId, clusterName?, cmdId, data?, endpoint?, manufacturerId?, direction?, reason? }
 * @returns {Object|null} the recorded entry
 */
function record(device, evt = {}) {
  if (!device || device._destroyed) { return null; }
  try {
    const st = _state(device);
    const clusterId = Number(evt.clusterId);
    const cmdId = Number(evt.cmdId);
    const entry = {
      at: Date.now(),
      ep: evt.endpoint,
      cluster: Number.isFinite(clusterId) ? _hex(clusterId) : String(evt.clusterName || evt.clusterId),
      clusterName: evt.clusterName || null,
      cmd: Number.isFinite(cmdId) ? cmdId : null,
      mfr: evt.manufacturerId || null,
      dir: evt.direction || null,
      hex: _toHex(evt.data).slice(0, 128),
      reason: evt.reason || 'unknown_command',
    };
    st.ring.push(entry);
    if (st.ring.length > RING_MAX) { st.ring.shift(); }

    // persisted counters (bounded)
    if (!st.counts) {
      try { st.counts = (typeof device.getStoreValue === 'function' && device.getStoreValue('zcl_unknown_incoming')) || {}; } catch (_e) { st.counts = {}; }
      if (!st.counts || typeof st.counts !== 'object') { st.counts = {}; }
    }
    const key = `ep${entry.ep}.${entry.cluster}.cmd${entry.cmd}`;
    const first = !st.counts[key];
    if (first) {
      const keys = Object.keys(st.counts);
      if (keys.length >= PERSIST_MAX) {
        keys.sort((a, b) => (st.counts[a].lastAt || 0) - (st.counts[b].lastAt || 0));
        delete st.counts[keys[0]];
      }
      st.counts[key] = { n: 0, firstAt: entry.at, lastAt: entry.at, reason: entry.reason };
      try { device.log(`[ZCL-UNKNOWN] 📥 ${key} (${entry.clusterName || '?'}) ${entry.reason} → exposed to Flows (tuya_cluster_received)`); } catch (_e) { /* no-op */ }
    }
    st.counts[key].n++;
    st.counts[key].lastAt = entry.at;
    _persist(device, st);

    // P3016: interpret (exact ZCL/Z2M/ZHA decoders → learned → heuristic) + app-level Flow cards
    try { require('./UnknownCommandEngine').handleFrame(device, evt, entry.at); } catch (_e) { /* never blocks the sink */ }

    // Flows (rate-limited per key)
    const last = st.lastFlow.get(key) || 0;
    if (entry.at - last >= FLOW_MIN_INTERVAL_MS) {
      st.lastFlow.set(key, entry.at);
      if (st.lastFlow.size > 100) { st.lastFlow.delete(st.lastFlow.keys().next().value); }
      _toFlows(device, entry, clusterId, cmdId, evt.data);
    }
    return entry;
  } catch (_e) {
    return null;
  }
}

function _toFlows(device, entry, clusterId, cmdId, data) {
  // Bridge first: it already owns tuya_cluster_received + the tuya_cluster_event capability.
  try {
    const bridge = device._universalBridge || device.universalBridge || device._tuyaBridge;
    if (bridge && typeof bridge.onClusterEvent === 'function') {
      bridge.onClusterEvent(clusterId, cmdId, Buffer.isBuffer(data) ? data : Buffer.from(entry.hex, 'hex'));
      return;
    }
  } catch (_e) { /* fall through */ }
  try {
    const flow = device.homey && device.homey.flow;
    if (!flow || typeof flow.getDeviceTriggerCard !== 'function') { return; }
    const card = flow.getDeviceTriggerCard('tuya_cluster_received');
    if (!card || typeof card.trigger !== 'function') { return; }
    Promise.resolve(card.trigger(device, {
      cluster_id: entry.cluster,
      command_id: Number.isFinite(cmdId) ? cmdId : 0,
      data_hex: entry.hex,
    }, {})).catch(() => {});
  } catch (_e) { /* card missing on this branch / device type → diag only */ }
}

/** @returns {Object[]} last unknown incoming frames (diag) */
function recent(device) {
  return (device && device._unknownIncoming && device._unknownIncoming.ring.slice()) || [];
}

module.exports = { record, recent, RING_MAX, PERSIST_MAX, FLOW_MIN_INTERVAL_MS };
