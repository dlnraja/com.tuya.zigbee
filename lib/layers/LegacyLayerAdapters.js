'use strict';
// Spec 004 T2 — expose the existing low-level bridge (lib/LowLevelBridge.js) and the RX/TX
// chain (lib/layers/ProtocolRxTxChain.js) through the common layer contract
// (lib/layers/LayerInterface.js) without changing their behaviour.
//  - Native ZCL passthrough comes first and is NOT wrapped (no breaker, no timeout): it is the
//    primary path (D1). A falsy/null result is reported as { ok:false } so fallbacks can run.
//  - Non-native paths (Tuya 0xEF00 raw frames, RX/TX chain cascade) are wrapped: time-boxed,
//    never throw, self-disable via circuit breaker after repeated failures (D2).
//  - Pure adapters: nothing is awaited at construction, so pairing/onNodeInit are never blocked.
const { wrapLayer, runLayers } = require('./LayerInterface');

const failed = (v) => v === null || v === undefined || v === false;

/** Native passthrough layer: same shape as a wrapped layer, but calls go straight through. */
function nativeLayer(name, impl) {
  const call = async (fn, args) => {
    if (typeof fn !== 'function') { return { ok: false, skipped: 'unsupported' }; }
    try {
      const value = await fn(...args);
      return failed(value) ? { ok: false, value } : { ok: true, value };
    } catch (err) { return { ok: false, error: err && err.message }; }
  };
  return {
    name,
    native: true,
    breaker: null,
    read: (...a) => call(impl.read, a),
    write: (...a) => call(impl.write, a),
    command: (...a) => call(impl.command, a),
    onReport: () => () => {},
  };
}

// Wrapped impls must throw on failure so the breaker counts it.
const orThrow = (label) => (v) => { if (failed(v)) { throw new Error(`${label}: no result`); } return v; };

/**
 * @param {import('../LowLevelBridge').LowLevelBridge} bridge
 * @returns {{ native: object, tuyaRaw: object, list: object[] }}
 */
function bridgeLayers(bridge, { log = () => {}, homey, timeoutMs = 5000 } = {}) {
  const native = nativeLayer('zcl-native', {
    read: (cluster, attr, ep) => bridge.readZCLAttribute(cluster, attr, ep),
    write: (cluster, attr, value, ep) => bridge.writeZCLAttribute(cluster, attr, value, ep),
    command: (cluster, cmd, payload, ep, opts) => bridge.sendClusterCommand(cluster, cmd, payload, ep, opts),
  });
  const tuyaRaw = wrapLayer('tuya-raw', {
    read: (dp, opts) => bridge.queryTuyaDP(dp, opts).then(orThrow('queryTuyaDP')),
    command: (cmd, data, opts) => bridge.sendRawTuyaFrame(cmd, data, opts).then(orThrow('sendRawTuyaFrame')),
  }, { log, homey, timeoutMs });
  return { native, tuyaRaw, list: [native, tuyaRaw] };
}

/**
 * @param {import('./ProtocolRxTxChain')} chain instance
 */
function chainLayer(chain, { log = () => {}, homey, timeoutMs = 8000 } = {}) {
  return wrapLayer('rxtx-chain', {
    command: async (intent) => {
      const r = await chain.transmit(intent);
      if (!r || !r.ok) { throw new Error(`transmit: ${(r && (r.reason || r.error)) || 'failed'}`); }
      return r;
    },
    read: async (intent) => {
      const r = await chain.receive(intent);
      if (!r || !r.ok) { throw new Error(`receive: ${(r && (r.reason || r.error)) || 'failed'}`); }
      return r;
    },
  }, { log, homey, timeoutMs });
}

/**
 * Native first, then fallbacks (sequential by default; `parallel: true` per device profile).
 * `nativeArgs` / `fallbackArgs` let each layer take its own argument shape. Never throws.
 */
async function nativeThenFallback(native, nativeArgs, fallbacks, fallbackArgs, op = 'command', { parallel = false } = {}) {
  if (native) {
    const r = await native[op](...nativeArgs);
    if (r.ok) { return { ...r, layer: native.name }; }
  }
  return runLayers(fallbacks.filter(Boolean), op, fallbackArgs, { parallel });
}

module.exports = { nativeLayer, bridgeLayers, chainLayer, nativeThenFallback };
