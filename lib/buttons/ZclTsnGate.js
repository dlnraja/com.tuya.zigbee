'use strict';

/**
 * P3387 - drop a retransmitted ZCL frame before it reaches any listener.
 *
 * TS0043 (and other TS004x) scene remotes send the Tuya 0xFD press command on
 * the onOff cluster. It is a manufacturer command, so the stack often sends no
 * ZCL default response and the remote repeats the very same frame (same ZCL
 * transaction sequence number, same payload) a few hundred ms to ~1 s later.
 * Every receive path (onOff command listener, 0xFD bound cluster, E000, scenes,
 * attribute report, raw decoders) then sees one more press, and a single finger
 * press runs the Flow twice.
 *
 * Idea credited to Zigbee2MQTT (zigbee-herdsman-converters, MIT):
 * tuya on_off_action -> utils.hasAlreadyProcessedMessage, keyed per device +
 * endpoint on the ZCL transaction sequence number, 10 s expiry, last 5 kept.
 * ZHA quirks use the same TSN drop. Written in our own words.
 *
 * Here the key is endpoint + cluster + the exact frame bytes (which contain the
 * TSN). A real second press always carries a new TSN, so real double clicks and
 * typed 'double' / 'long' reports are never swallowed; only a byte-identical
 * copy inside the window is dropped.
 *
 * WHY the raw ZigBeeNode: zigbee-clusters binds node.handleFrame to the ZCLNode
 * prototype method in its constructor, so wrapping zclNode.handleFrame later
 * never sees live frames. The raw node entry is the one place every frame
 * passes, upstream of all cluster listeners.
 */

const WINDOW_MS = 5000;
const MAX_KEYS = 24;
const GATE_FLAG = '_p3387TsnGate';

function frameBytes(frame) {
  if (Buffer.isBuffer(frame)) {return frame;}
  if (frame && Buffer.isBuffer(frame.data)) {return frame.data;}
  if (frame && Array.isArray(frame.data)) {return Buffer.from(frame.data);}
  return null;
}

/** ZCL header TSN: byte 1, or byte 3 when the manufacturer-specific bit is set. */
function tsnOf(frame) {
  const b = frameBytes(frame);
  if (!b || b.length < 3) {return null;}
  const manuf = (b[0] & 0x04) !== 0;
  const idx = manuf ? 3 : 1;
  return b.length > idx ? b[idx] : null;
}

function frameKey(endpointId, clusterId, frame) {
  const b = frameBytes(frame);
  if (!b || b.length < 3) {return null;}
  return `${Number(endpointId) || 0}|${Number(clusterId) || 0}|${b.toString('hex')}`;
}

/**
 * @param {object} state  per-device store (mutated)
 * @param {{now?:number, windowMs?:number}} [opts]
 * @returns {{ drop: boolean, key: string|null, tsn: number|null }}
 */
function isDuplicate(state, endpointId, clusterId, frame, opts) {
  const now = opts && opts.now;
  const windowMs = opts && opts.windowMs;
  const key = frameKey(endpointId, clusterId, frame);
  const tsn = tsnOf(frame);
  if (!state || !key) {return { drop: false, key, tsn };}
  const ts = now == null ? Date.now() : Number(now);
  const win = windowMs == null ? WINDOW_MS : Number(windowMs);
  if (!state.seen) {state.seen = new Map();}
  const prev = state.seen.get(key);
  if (prev != null && ts - prev >= 0 && ts - prev < win) {
    return { drop: true, key, tsn };
  }
  state.seen.delete(key);
  state.seen.set(key, ts);
  // Bounded memory: expire old keys, then cap the map size.
  for (const [k, t] of state.seen) {
    if (ts - t >= win) {state.seen.delete(k);}
    else {break;}
  }
  while (state.seen.size > MAX_KEYS) {
    state.seen.delete(state.seen.keys().next().value);
  }
  return { drop: false, key, tsn };
}

/**
 * Wrap device.node.handleFrame once. Idempotent; safe when node is missing.
 * @returns {boolean} true when the gate is (already) installed
 */
function installZclTsnGate(device, node) {
  const raw = node || (device && device.node);
  if (!device || !raw || typeof raw.handleFrame !== 'function') {return false;}
  if (raw.handleFrame[GATE_FLAG]) {return true;}
  const inner = raw.handleFrame;
  if (!device._p3387TsnState) {device._p3387TsnState = { seen: new Map(), dropped: 0 };}
  const gate = function p3387TsnGate(endpointId, clusterId, frame, meta) {
    try {
      const v = isDuplicate(device._p3387TsnState, endpointId, clusterId, frame);
      if (v.drop) {
        device._p3387TsnState.dropped = (device._p3387TsnState.dropped || 0) + 1;
        try {
          device.log?.(`[P3387] drop repeated ZCL frame ep${endpointId} cluster 0x${Number(clusterId).toString(16)} tsn ${v.tsn}`);
        } catch (_l) { /* soft */ }
        return Promise.resolve();
      }
    } catch (_e) { /* soft - never block a frame on gate error */ }
    return inner.call(this, endpointId, clusterId, frame, meta);
  };
  gate[GATE_FLAG] = true;
  raw.handleFrame = gate;
  return true;
}

module.exports = {
  WINDOW_MS,
  MAX_KEYS,
  tsnOf,
  frameKey,
  isDuplicate,
  installZclTsnGate,
};
