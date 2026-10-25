'use strict';

/**
 * Tests — P3040 first-start TX pacer (lib/zigbee/InitTxPacer.js).
 * Dedupe of identical requests, basic-attribute cache + rejoin reset, failures not replayed,
 * user commands untouched, GCRA spacing, bounded state, kill switch, window expiry.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const Pacer = require('../lib/zigbee/InitTxPacer');

function virtualClock() {
  const c = { t: 1000000, timers: [] };
  c.now = () => c.t;
  c.setTimeout = (fn, ms) => { c.timers.push({ at: c.t + Math.max(0, ms), fn }); };
  c.run = async (until) => {
    for (;;) {
      await new Promise((r) => setImmediate(r));
      c.timers.sort((a, b) => a.at - b.at);
      const next = c.timers[0];
      if (!next || next.at > until) { c.t = Math.max(c.t, until); return; }
      c.timers.shift();
      c.t = next.at;
      next.fn();
    }
  };
  return c;
}

function makeDevice(clock, { battery = false, settings = {}, appSettings = {} } = {}) {
  return {
    _destroyed: false,
    homey: { setTimeout: clock.setTimeout, settings: { get: (k) => appSettings[k] } },
    hasCapability: (c) => battery && c === 'measure_battery',
    getStoreValue: () => undefined,
    getSetting: (k) => settings[k],
  };
}

function makeNode(log) {
  const cluster = (name) => ({
    readAttributes: async (attrs) => { log.push(['read', name, attrs.join(',')]); return Object.fromEntries(attrs.map((a) => [a, `${a}-v`])); },
    bind: async () => { log.push(['bind', name]); },
    configureReporting: async (cfg) => { log.push(['report', name, Object.keys(cfg).join(',')]); },
    writeAttributes: async (a) => { log.push(['write', name, Object.keys(a).join(',')]); },
    setOn: async () => { log.push(['setOn', name]); },
    dataQuery: async () => { log.push(['dataQuery', name]); },
    datapoint: async (p) => { log.push(['datapoint', name, JSON.stringify(p)]); },
  });
  return { endpoints: { 1: { clusters: { basic: cluster('basic'), onOff: cluster('onOff'), tuya: cluster('tuya') } } } };
}

describe('P3040 — InitTxPacer', () => {
  it('shares one radio request between identical concurrent requests', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock(); const log = [];
    const node = makeNode(log); const dev = makeDevice(clock);
    const p = Pacer.attach(dev, node, { now: clock.now });
    const a = node.endpoints[1].clusters.tuya.dataQuery({});
    const b = node.endpoints[1].clusters.tuya.dataQuery({});
    await clock.run(clock.t + 2000);
    await Promise.all([a, b]);
    assert.strictEqual(log.filter((l) => l[0] === 'dataQuery').length, 1);
    assert.strictEqual(p.metrics().deduped, 1);
  });

  it('serves basic attributes already read from the cache, and forgets them on rejoin', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock(); const log = [];
    const node = makeNode(log); const dev = makeDevice(clock);
    const p = Pacer.attach(dev, node, { now: clock.now });
    const basic = node.endpoints[1].clusters.basic;
    const first = basic.readAttributes(['manufacturerName', 'zclVersion', 'appVersion']);
    await clock.run(clock.t + 500);
    await first;
    clock.t += 20000; // beyond the dedupe window: only the cache can answer
    const sub = basic.readAttributes(['zclVersion', 'appVersion']);
    await clock.run(clock.t + 500);
    assert.deepStrictEqual(await sub, { zclVersion: 'zclVersion-v', appVersion: 'appVersion-v' });
    assert.strictEqual(log.filter((l) => l[0] === 'read').length, 1);
    p.resetForRejoin();
    const again = basic.readAttributes(['zclVersion', 'appVersion']);
    await clock.run(clock.t + 500);
    await again;
    assert.strictEqual(log.filter((l) => l[0] === 'read').length, 2, 'rejoin must send the magic read again');
  });

  it('does not replay a failure to later callers', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock(); let calls = 0;
    const node = { endpoints: { 1: { clusters: { iasZone: { readAttributes: async () => { calls++; if (calls === 1) {throw new Error('TIMEOUT');} return { zoneState: 1 }; } } } } } };
    Pacer.attach(makeDevice(clock), node, { now: clock.now });
    const ias = node.endpoints[1].clusters.iasZone;
    const r1 = ias.readAttributes(['zoneState']).catch((e) => e.message);
    await clock.run(clock.t + 200);
    assert.strictEqual(await r1, 'TIMEOUT');
    const r2 = ias.readAttributes(['zoneState']);
    await clock.run(clock.t + 200);
    assert.deepStrictEqual(await r2, { zoneState: 1 });
    assert.strictEqual(calls, 2);
  });

  it('never wraps user commands or non-basic writes (no dedupe, no delay)', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock(); const log = [];
    const node = makeNode(log);
    Pacer.attach(makeDevice(clock), node, { now: clock.now });
    const { onOff, tuya } = node.endpoints[1].clusters;
    await onOff.setOn(); await onOff.setOn();
    await onOff.writeAttributes({ a: 1 }); await onOff.writeAttributes({ a: 1 });
    await tuya.datapoint({ dp: 1, value: true }); await tuya.datapoint({ dp: 1, value: true });
    assert.strictEqual(log.length, 6);
  });

  it('spaces starts: burst of 3 then one per gap (battery 150 ms)', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock(); const log = [];
    const node = makeNode(log);
    const p = Pacer.attach(makeDevice(clock, { battery: true }), node, { now: clock.now, globalGapMs: 0 });
    const tuya = node.endpoints[1].clusters.tuya;
    const ps = [];
    for (let i = 0; i < 20; i++) {ps.push(tuya.getData ? tuya.getData(i) : node.endpoints[1].clusters.basic.bind(i));}
    await clock.run(clock.t + 10000);
    await Promise.all(ps);
    const m = p.metrics();
    assert.strictEqual(m.tx, 20);
    assert.ok(m.peak1s <= 3 + Math.ceil(1000 / 150), `peak ${m.peak1s}`);
    assert.ok(m.maxDelayMs <= 5000);
  });

  it('runs straight through after the init window and when disabled', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock(); const log = [];
    const node = makeNode(log);
    Pacer.attach(makeDevice(clock), node, { now: clock.now, windowMs: 1000 });
    clock.t += 5000;
    const q = node.endpoints[1].clusters.tuya;
    await q.dataQuery({}); await q.dataQuery({});
    assert.strictEqual(log.length, 2);

    const node2 = makeNode([]);
    assert.strictEqual(Pacer.attach(makeDevice(clock, { appSettings: { init_tx_pacer_disabled: true } }), node2), null);
    assert.strictEqual(Pacer.attach(makeDevice(clock, { settings: { init_tx_pacer: false } }), node2), null);
  });

  it('keeps its state bounded', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock();
    const node = makeNode([]);
    const p = Pacer.attach(makeDevice(clock), node, { now: clock.now, globalGapMs: 0 });
    const basic = node.endpoints[1].clusters.basic;
    const ps = [];
    for (let i = 0; i < 200; i++) {ps.push(basic.readAttributes([`attr${i}`]));}
    await clock.run(clock.t + 60000);
    await Promise.all(ps);
    assert.ok(p.inflight.size <= Pacer.DEFAULTS.maxDedupe);
    assert.ok(p.basicCache.size <= Pacer.DEFAULTS.maxCacheAttrs);
    assert.ok(p.metrics().overflow > 0, 'over maxPending waiting starts run directly');
  });

  it('is attached by TuyaZigbeeDevice before the native init and reset on rejoin', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(/InitTxPacer'\)\.attach\(this/.test(src));
    assert.ok(/_initTxPacer\?\.resetForRejoin\(\)/.test(src));
    assert.ok(/\[PAIR-METRICS\]/.test(src));
  });
});
