'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const { bridgeLayers, chainLayer, nativeThenFallback } = require('../../lib/layers/LegacyLayerAdapters');
const { LowLevelBridge } = require('../../lib/LowLevelBridge');

describe('Spec 004 T2: LowLevelBridge / ProtocolRxTxChain on the layer contract', () => {
  it('native passthrough first; Tuya raw fallback only when native fails', async () => {
    const calls = [];
    const bridge = {
      sendClusterCommand: async () => { calls.push('native'); return false; },
      sendRawTuyaFrame: async () => { calls.push('raw'); return { cmd: 2 }; },
    };
    const { native, tuyaRaw } = bridgeLayers(bridge);
    assert.strictEqual(native.native, true);
    const r = await nativeThenFallback(native, ['onOff', 'on', {}], [tuyaRaw], [0, Buffer.from([1])]);
    assert.ok(r.ok); assert.strictEqual(r.layer, 'tuya-raw'); assert.deepStrictEqual(calls, ['native', 'raw']);
  });
  it('native success short-circuits fallbacks', async () => {
    let raw = 0;
    const { native, tuyaRaw } = bridgeLayers({ sendClusterCommand: async () => true, sendRawTuyaFrame: async () => { raw++; return {}; } });
    const r = await nativeThenFallback(native, ['onOff', 'on'], [tuyaRaw], []);
    assert.strictEqual(r.layer, 'zcl-native'); assert.strictEqual(raw, 0);
  });
  it('failing non-native layer self-disables and never throws', async () => {
    const { tuyaRaw } = bridgeLayers({ sendRawTuyaFrame: async () => null });
    for (let i = 0; i < 3; i++) { assert.strictEqual((await tuyaRaw.command(0, [])).ok, false); }
    assert.strictEqual((await tuyaRaw.command(0, [])).skipped, 'disabled');
  });
  it('chain transmit wrapped; not-ok result counted as failure', async () => {
    const l = chainLayer({ transmit: async () => ({ ok: false, reason: 'all-paths-failed' }), receive: async () => ({ ok: true }) });
    const r = await l.command({ dp: 1, value: true });
    assert.strictEqual(r.ok, false); assert.match(r.error, /all-paths-failed/);
    assert.ok((await l.read({})).ok);
  });
  it('real LowLevelBridge without zclNode: asLayers() builds synchronously, calls fail soft', async () => {
    const b = new LowLevelBridge({ log() {} });
    const { native, tuyaRaw } = b.asLayers();
    assert.strictEqual((await native.read(0, 0, 1)).ok, false);
    assert.strictEqual((await tuyaRaw.command(0, [])).ok, false);
    assert.strictEqual(b.asLayers().native, native);
  });
});
