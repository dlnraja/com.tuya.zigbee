'use strict';

/**
 * P2830 — Bastien house app OOM / relay fan-out (diags 17/10 + 18/10, v1.0.161).
 * Heap hit the ~64 MB limit (SIGABRT); "one wall button turns on ALL relays".
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function loadWithHomeyMocks(request, parent, isMain) {
  if (request === 'homey') { return { Device: class {}, Driver: class {}, App: class {} }; }
  if (request === 'homey-zigbeedriver') {
    return { ZigBeeDevice: class { constructor() { this.log = () => {}; this.error = () => {}; } }, ZigBeeDriver: class {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const __cacheBefore = new Set(Object.keys(require.cache));
const RawFrameDeduplicator = require('../../lib/zigbee/RawFrameDeduplicator');
const { isCardDeclared, FanoutLimiter, runOnce } = require('../../lib/flow/FlowCardPresence');
const FeatureFlowCards = require('../../lib/flow/FeatureFlowCards');
const { LogBuffer, LOG_LIMITS } = require('../../lib/utils/LogBuffer');
const DiagnosticLogger = require('../../lib/diagnostics/DiagnosticLogger');
const PhysicalButtonMixin = require('../../lib/mixins/PhysicalButtonMixin');
Module._load = originalLoad;
for (const k of Object.keys(require.cache)) { if (!__cacheBefore.has(k)) { delete require.cache[k]; } }

describe('P2830 raw frame dedupe key is bounded', () => {
  it('keeps exact-payload semantics', () => {
    const d = new RawFrameDeduplicator({ defaultWindowMs: 1000, tuyaWindowMs: 1000 });
    const a = { Payload: Buffer.from('00000102000400000001', 'hex'), CommandID: 2 };
    const b = { Payload: Buffer.from('00000102000400000002', 'hex'), CommandID: 2 };
    assert.equal(d.shouldSuppress(1, 0xEF00, a).suppress, false);
    assert.equal(d.shouldSuppress(1, 0xEF00, a).suppress, true);
    assert.equal(d.shouldSuppress(1, 0xEF00, b).suppress, false);
  });

  it('large payloads differing only in the tail still differ, key stays short', () => {
    const d = new RawFrameDeduplicator();
    const p1 = Buffer.alloc(5000, 7); const p2 = Buffer.from(p1); p2[4999] = 1;
    const k1 = d.makeKey(1, 6, { data: p1 }); const k2 = d.makeKey(1, 6, { data: p2 });
    assert.notEqual(k1, k2);
    assert.ok(k1.length < 220, `key length ${k1.length}`);
  });

  it('frames without a binary payload are fingerprinted shallowly (no whole-object JSON)', () => {
    const d = new RawFrameDeduplicator();
    let touched = 0;
    const frame = { cmdId: 7, nested: { get boom() { touched += 1; return 'x'.repeat(1e6); } }, text: 'y'.repeat(50000) };
    const key = d.makeKey(1, 0, frame);
    assert.equal(touched, 0, 'nested objects must not be walked');
    assert.ok(key.length < 400);
  });
});

describe('P2830 flow card presence + fan-out cap', () => {
  it('isCardDeclared is false only when a readable manifest lacks the card', () => {
    const homey = { manifest: { flow: { triggers: [{ id: 'a' }], conditions: [], actions: [] } } };
    assert.equal(isCardDeclared(homey, 'trigger', 'a'), true);
    assert.equal(isCardDeclared(homey, 'trigger', 'capability_value_changed_generic'), false);
    assert.equal(isCardDeclared({}, 'trigger', 'x'), true);
    assert.equal(isCardDeclared(null, 'trigger', 'x'), true);
  });

  it('FanoutLimiter admits max per window then drops, and re-opens next window', () => {
    let t = 0;
    const l = new FanoutLimiter({ max: 3, windowMs: 1000, now: () => t });
    assert.deepEqual([l.allow(), l.allow(), l.allow(), l.allow()], [true, true, true, false]);
    t = 1500;
    assert.equal(l.allow(), true);
    assert.equal(l.dropped, 1);
  });

  it('runOnce is a re-entrancy guard', () => {
    const active = new Set(); const seen = [];
    runOnce(active, 'k', () => { seen.push(1); runOnce(active, 'k', () => seen.push(2)); });
    assert.deepEqual(seen, [1]);
    assert.equal(active.size, 0);
  });

  it('triggerCapabilityChanged never asks Homey for undeclared generic cards and caps the burst', () => {
    const asked = [];
    const homey = {
      manifest: { flow: { triggers: [], conditions: [], actions: [] } },
      flow: { getTriggerCard: (id) => { asked.push(id); throw new Error(`Invalid Flow Card ID: ${id}`); } },
      drivers: { getDrivers: () => ({}) },
    };
    const ffc = new FeatureFlowCards(homey);
    for (let i = 0; i < 500; i += 1) { ffc.triggerCapabilityChanged('dev1', 'onoff', i % 2 === 0, i % 2 !== 0); }
    assert.deepEqual(asked, [], 'undeclared cards must not be requested');
    assert.ok(ffc._fanoutLimiter.dropped >= 400, 'burst must be capped');
  });

  it('no-op changes do not fan out', () => {
    const homey = { manifest: { flow: { triggers: [{ id: 'capability_value_changed_generic' }] } }, flow: { getTriggerCard: () => { throw new Error('should not be called'); } }, drivers: { getDrivers: () => ({}) } };
    const ffc = new FeatureFlowCards(homey);
    ffc.triggerCapabilityChanged('d', 'onoff', true, true);
    assert.equal(ffc._fanoutLimiter, undefined);
  });
});

describe('P2830 bounded log retention', () => {
  it('LogBuffer truncates, caps entries, debounces persistence and bounds bytes', async () => {
    const writes = []; const timers = [];
    const homey = {
      settings: { get: () => undefined, set: (k, v) => { writes.push(JSON.stringify(v).length); }, unset: () => {} },
      setTimeout: (f) => { timers.push(f); return { unref() {} }; },
    };
    const lb = new LogBuffer(homey);
    await lb.init();
    for (let i = 0; i < 1000; i += 1) { await lb.push('INFO', 'APP', 'm'.repeat(5000), 'dev', { big: 'z'.repeat(50000) }); }
    assert.ok(lb.buffer.length <= LOG_LIMITS.MAX_ENTRIES);
    assert.ok(lb.buffer.every((e) => e.message.length <= LOG_LIMITS.MAX_MESSAGE_CHARS));
    assert.equal(timers.length, 1, 'one scheduled persist for 1000 pushes');
    assert.equal(writes.length, 0);
    await lb.persist();
    assert.ok(writes[0] <= LOG_LIMITS.MAX_TOTAL_BYTES + 4096, `persisted ${writes[0]} bytes`);
  });

  it('LogBuffer drops a fat leftover buffer at boot', async () => {
    let unset = null;
    const fat = Array.from({ length: 900 }, (_, i) => ({ timestamp: new Date().toISOString(), level: 'INFO', category: 'A', message: `m${i}` }));
    const homey = { settings: { get: () => fat, set: () => {}, unset: (k) => { unset = k; } }, setTimeout: () => ({ unref() {} }) };
    const lb = new LogBuffer(homey);
    await lb.init();
    assert.equal(lb.buffer.length, 0);
    assert.equal(unset, 'debug_log_buffer');
  });

  it('DiagnosticLogger ring keeps compact primitives only', () => {
    const logs = [];
    const dev = { getData: () => ({ id: 'x' }), log: (m) => logs.push(m), getSetting: () => false };
    const lg = DiagnosticLogger.create(dev, 'T');
    const heavy = { frame: Buffer.alloc(4000), tokens: { a: { b: 1 } } };
    for (let i = 0; i < 1000; i += 1) { lg.info('x', { heavy, n: i }); }
    assert.ok(lg._buffer.length <= 100);
    for (const e of lg._buffer) {
      assert.equal(typeof e.heavy, 'string');
      assert.ok(e.heavy.length <= 220);
    }
    assert.ok(logs[0].length < 600);
  });
});

describe('P2830 relays never share Zigbee group 0', () => {
  it('classifies mains on/off devices as relays, remotes as not', () => {
    const mk = (id, caps) => ({ driver: { id }, hasCapability: (c) => caps.includes(c), getEnergy: () => ({}) });
    assert.equal(PhysicalButtonMixin.isMainsRelayDevice(mk('switch_1gang', ['onoff'])), true);
    assert.equal(PhysicalButtonMixin.isMainsRelayDevice(mk('plug_energy_monitor', ['onoff', 'measure_power'])), true);
    assert.equal(PhysicalButtonMixin.isMainsRelayDevice(mk('button_wireless_2', ['measure_battery'])), false);
    assert.equal(PhysicalButtonMixin.isMainsRelayDevice(mk('scene_switch_4', ['onoff'])), false);
    assert.equal(PhysicalButtonMixin.isMainsRelayDevice(mk('switch_1gang', ['onoff', 'measure_battery'])), false);
  });

  it('leaveGroupZeroOnce removes group 0 once per endpoint and remembers it', async () => {
    const calls = []; const store = {};
    const dev = { log() {}, getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; } };
    const groups = { removeGroup: async (a) => { calls.push(a); } };
    assert.equal(await PhysicalButtonMixin.leaveGroupZeroOnce(dev, groups, 1), true);
    assert.equal(await PhysicalButtonMixin.leaveGroupZeroOnce(dev, groups, 1), false);
    assert.deepEqual(calls, [{ groupId: 0 }]);
    const failing = { removeGroup: async () => { throw new Error('not member'); } };
    assert.equal(await PhysicalButtonMixin.leaveGroupZeroOnce(dev, failing, 2), true);
    assert.equal(store.p2830_group0_left_ep2, true);
  });

  it('source: single-gang relays are excluded from the group-0 join', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('|| isMainsRelayDevice(this)'));
    assert.ok(src.includes('leaveGroupZeroOnce(this, groupsCluster, gang)'));
  });
});

describe('P2830 bounded command queue', () => {
  it('ZigbeeCommandManager sheds the oldest command when the queue is full', async () => {
    const ZigbeeCommandManager = require('../../lib/zigbee/ZigbeeCommandManager');
    const timers = new Set();
    const homey = { setTimeout: (f, ms) => { const t = setTimeout(f, ms); timers.add(t); t.unref(); return t; }, clearTimeout: (t) => clearTimeout(t) };
    const m = new ZigbeeCommandManager(homey, { maxQueue: 3 });
    m.processQueue = async () => {}; // keep everything queued
    const results = [];
    const mk = (i) => m.executeCommand(async () => i).then(() => results.push(`ok${i}`), (e) => results.push(`rej${i}:${e.message}`));
    for (let i = 0; i < 6; i += 1) { mk(i); }
    await new Promise((r) => setImmediate(r));
    assert.equal(m.queue.length, 3);
    assert.deepEqual(results.map((r) => r.split(':')[0]), ['rej0', 'rej1', 'rej2']);
    for (const t of timers) { clearTimeout(t); }
  });
});
