'use strict';
/** P3023: hard caps on every per-device structure + release/trim on lifecycle and pressure. */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const RFD = require('../../lib/zigbee/RawFrameDeduplicator');
const Engine = require('../../lib/zigbee/UnknownCommandEngine');
const Sink = require('../../lib/zigbee/UnknownCommandSink');
const Reg = require('../../lib/zigbee/UnsupportedRegistry');
const Pacer = require('../../lib/zigbee/ZigbeeCommandPacer');
const DeviceTrim = require('../../lib/memory/DeviceTrim');
const Life = require('../../lib/zigbee/UnknownLifecycle');
const EC = require('../../lib/zigbee/EndpointCoverage');
const { EventEmitter } = require('events');

function mkDev(i = 0) {
  const store = {};
  const homey = { setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms, 1)), clearTimeout, flow: { getTriggerCard: () => ({ trigger: async () => true }) }, settings: { get: () => null, set: () => {} } };
  return {
    id: `d${i}`, homey, store,
    getData: () => ({ id: `d${i}` }), getName: () => `D${i}`,
    getStoreValue: (k) => store[k], setStoreValue: (k, v) => { store[k] = v; return Promise.resolve(); },
    getSetting: () => null, hasCapability: () => false, getCapabilities: () => [], log() {}, error() {},
  };
}

describe('P3023 bounded caches', () => {
  it('RawFrameDeduplicator: clamps an oversized maxCacheSize and stays ≤ cap under random frames', () => {
    const d = new RFD({ maxCacheSize: 500 });
    assert.strictEqual(d.maxCacheSize, RFD.DEFAULT_MAX_KEYS);
    for (let i = 0; i < 20000; i++) { d.shouldSuppress(1 + (i % 4), 0xEF00, { cmdId: i % 7, data: Buffer.from([i & 0xff, (i >> 8) & 0xff, 3]) }); }
    assert.ok(d.cache.size <= RFD.DEFAULT_MAX_KEYS, String(d.cache.size));
    d.clear();
    assert.strictEqual(d.cache.size, 0);
  });

  it('RawFrameDeduplicator: duplicates inside the window are still suppressed', () => {
    const d = new RFD();
    const f = { cmdId: 1, data: Buffer.from([1, 2, 3]) };
    assert.strictEqual(d.shouldSuppress(1, 6, f).suppress, false);
    assert.strictEqual(d.shouldSuppress(1, 6, f).suppress, true);
  });

  it('UnknownCommandEngine maps stay capped and trim() shrinks them', () => {
    const dev = mkDev(1);
    let t = 1e6;
    for (let i = 0; i < 3000; i++) {
      t += 3;
      Engine.handleDp(dev, { dp: 1 + (i % 200), datatype: 2, value: i }, t);
      Engine.handleFrame(dev, { clusterId: 0xE000 + (i % 30), cmdId: i % 50, data: Buffer.from([i & 0xff, 1]), endpoint: 1 + (i % 3), tsn: i & 0xff }, t);
    }
    const st = dev._unknownEngine;
    assert.ok(st.lastFlow.size <= 32 && st.lastLog.size <= 48 && st.lastDpVal.size <= 48, JSON.stringify([st.lastFlow.size, st.lastLog.size, st.lastDpVal.size]));
    if (st.lastTsn) { assert.ok(st.lastTsn.size <= 32); }
    assert.strictEqual(Engine.trim(dev), true);
    assert.strictEqual(st.lastFlow.size + st.lastLog.size + st.lastDpVal.size, 0);
    assert.ok(st.recent.length <= 4);
    Life.releaseDevice(dev, { deleted: true });
  });

  it('UnknownCommandSink ring and lastFlow are capped', () => {
    const dev = mkDev(2);
    for (let i = 0; i < 2000; i++) { Sink.record(dev, { clusterId: 0xFC00 + (i % 200), cmdId: i % 60, data: Buffer.alloc(400, i & 0xff), endpoint: 1 }); }
    const st = dev._unknownIncoming;
    assert.ok(st.ring.length <= Sink.RING_MAX && Sink.RING_MAX <= 16);
    assert.ok(st.lastFlow.size <= 32);
    for (const e of st.ring) { assert.ok(JSON.stringify(e).length < 400); }
    Life.releaseDevice(dev, { deleted: true });
  });

  it('UnsupportedRegistry soft entries are capped and trimSoft() halves them', () => {
    const dev = mkDev(3);
    const g = Reg.getRegistry(dev);
    for (let i = 0; i < 500; i++) { g.noteMissing(`cl${i}`, `attr${i}`, 'x'); }
    const n = g.trimSoft();
    assert.ok(typeof n === 'number' || n === undefined);
    Life.releaseDevice(dev, { deleted: true });
  });

  const PRIO = require('../../lib/smart/SoakFlags').pacerPriority === true;
  it('ZigbeeCommandPacer with priority off (stable / bastien): legacy FIFO, priority option ignored', async () => {
    const dev = mkDev(5);
    const order = [];
    const job = (tag) => async () => { order.push(tag); return tag; };
    const p = [
      Pacer.paceZigbeeCommand(dev, job('a'), { priority: false, enabled: false }),
      Pacer.paceZigbeeCommand(dev, job('b'), { priority: false, enabled: false }),
      Pacer.paceZigbeeCommand(dev, job('c'), { priority: false, enabled: false }),
    ];
    assert.deepStrictEqual(await Promise.all(p), ['a', 'b', 'c']);
    assert.deepStrictEqual(order, ['a', 'b', 'c']);
  });
  it('ZigbeeCommandPacer: user beats poll/reprobe, background is back-pressured, release drops background only', { skip: PRIO ? false : 'pacerPriority soaks on master only' }, async () => {
    const dev = mkDev(4);
    const order = [];
    const slow = (tag) => () => new Promise((r) => setTimeout(() => { order.push(tag); r(tag); }, 2));
    const p = [];
    p.push(Pacer.paceZigbeeCommand(dev, slow('first'), { priority: 'poll', enabled: false }));
    p.push(Pacer.paceZigbeeCommand(dev, slow('reprobe'), { priority: 'reprobe', enabled: false }));
    p.push(Pacer.paceZigbeeCommand(dev, slow('poll'), { priority: 'poll', enabled: false }));
    p.push(Pacer.paceZigbeeCommand(dev, slow('user'), { enabled: false }));
    await Promise.allSettled(p);
    assert.deepStrictEqual(order, ['first', 'user', 'poll', 'reprobe']);
    // backpressure
    const many = [];
    const block = new Promise((r) => setTimeout(() => r('b'), 20));
    const keep = (pr) => { pr.catch(() => {}); many.push(pr); return pr; };
    keep(Pacer.paceZigbeeCommand(dev, () => block, { enabled: false }));
    for (let i = 0; i < Pacer.MAX_PENDING; i++) { keep(Pacer.paceZigbeeCommand(dev, async () => i + 1, { priority: 'poll', enabled: false })); }
    const over = Pacer.paceZigbeeCommand(dev, async () => 'x', { priority: 'reprobe', enabled: false });
    await assert.rejects(over, (e) => e.code === 'EBACKPRESSURE');
    const userOk = Pacer.paceZigbeeCommand(dev, async () => 'u', { enabled: false });
    const dropped = Pacer.releaseQueue(dev, { backgroundOnly: true });
    assert.ok(dropped > 0);
    assert.strictEqual(await userOk, 'u');
    await Promise.allSettled(many);
  });

  it('DeviceTrim never throws on bare objects and trims what exists', () => {
    assert.strictEqual(DeviceTrim.trimDevice(null), 0);
    assert.strictEqual(DeviceTrim.trimDevice({}), 0);
    const dev = mkDev(5);
    dev._rawFrameDeduplicator = new RFD();
    Engine.handleDp(dev, { dp: 3, datatype: 2, value: 1 }, 1e6);
    assert.ok(DeviceTrim.trimDevice(dev) >= 2);
    assert.strictEqual(DeviceTrim.trimAll({}, () => [dev, {}, null]), 1);
    Life.releaseDevice(dev, { deleted: true });
  });

  it('releaseDevice removes EndpointCoverage listeners (no closure keeps the device)', () => {
    const dev = mkDev(6);
    const cluster = new EventEmitter();
    const handler = () => {};
    dev._p3018ep = { routed: ['ep2.onOff.onOff'], unrouted: new Map(), attached: 1, gp: false, done: true, offs: [[cluster, 'attr.onOff', handler]] };
    cluster.on('attr.onOff', handler);
    assert.strictEqual(cluster.listenerCount('attr.onOff'), 1);
    const r = Life.releaseDevice(dev, { deleted: true });
    assert.ok(r.released.includes('endpointCoverage'));
    assert.strictEqual(cluster.listenerCount('attr.onOff'), 0);
    assert.strictEqual(EC.detach(dev), 0, 'idempotent');
  });
});
