'use strict';

/**
 * L-P3040-03 — on a restart, a battery device's start-up requests wait for its first frame
 * (capped), first init after pairing and mains devices are unchanged, user commands never wait.
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const Pacer = require('../lib/zigbee/InitTxPacer');

function virtualClock() {
  const c = { t: 5000000, timers: [] };
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

function device(clock, { battery = true, firstInit = false, mains = false, settings = {} } = {}) {
  return {
    _destroyed: false,
    mainsPowered: mains,
    homey: { setTimeout: clock.setTimeout, settings: { get: () => undefined } },
    hasCapability: (c) => battery && c === 'measure_battery',
    getStoreValue: () => undefined,
    getSetting: (k) => settings[k],
    isFirstInit: () => firstInit,
  };
}

function setup(dev, opts = {}) {
  const log = [];
  const zigbeeNode = { handleFrame: () => { log.push('root'); } };
  const cl = (name) => ({
    readAttributes: async (a) => { log.push(`read:${name}`); return Object.fromEntries(a.map((x) => [x, 1])); },
    bind: async () => { log.push(`bind:${name}`); },
    setOn: async () => { log.push(`setOn:${name}`); },
    datapoint: async () => { log.push(`dp:${name}`); },
  });
  const zcl = { endpoints: { 1: { clusters: { powerConfiguration: cl('power'), onOff: cl('onOff'), tuya: cl('tuya') } } } };
  const pacer = Pacer.attach(dev, zcl, { node: zigbeeNode, ...opts });
  return { log, zigbeeNode, zcl, pacer };
}

describe('L-P3040-03 — sleepy restart waits for the first RX', () => {
  it('holds wrapped requests until the first frame, then sends them; the frame still reaches the root', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock();
    const { log, zigbeeNode, zcl, pacer } = setup(device(clock), { now: clock.now });
    assert.strictEqual(pacer.deferToRx, true);
    const r = zcl.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
    const b = zcl.endpoints[1].clusters.onOff.bind();
    await clock.run(clock.t + 30000);
    assert.deepStrictEqual(log, [], 'nothing sent to the sleeping device');
    // user command and datapoint writes are never held
    await zcl.endpoints[1].clusters.onOff.setOn();
    await zcl.endpoints[1].clusters.tuya.datapoint({ dp: 1 });
    assert.deepStrictEqual(log, ['setOn:onOff', 'dp:tuya']);
    zigbeeNode.handleFrame(1, 1, Buffer.from([0]), {});
    assert.ok(log.includes('root'), 'frame passed on unchanged');
    await clock.run(clock.t + 2000);
    await r; await b;
    assert.ok(log.includes('read:power') && log.includes('bind:onOff'));
    const m = pacer.metrics();
    assert.strictEqual(m.deferred, 2);
    assert.strictEqual(m.deferTimeout, 0);
    assert.strictEqual(m.firstRxMs, 30000);
  });

  it('gives up waiting after deferMaxMs and sends as before', async () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock();
    const { log, zcl, pacer } = setup(device(clock), { now: clock.now, deferMaxMs: 10000 });
    const r = zcl.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryVoltage']);
    await clock.run(clock.t + 9000);
    assert.deepStrictEqual(log, []);
    await clock.run(clock.t + 2000);
    await r;
    assert.deepStrictEqual(log, ['read:power']);
    assert.strictEqual(pacer.metrics().deferTimeout, 1);
    // later requests are not held any more
    await zcl.endpoints[1].clusters.onOff.bind();
    assert.strictEqual(log.length, 2);
  });

  it('never defers on first init after pairing, on mains devices, without a node, or when switched off', () => {
    for (const [dev, node] of [
      [{ firstInit: true }, true],
      [{ mains: true }, true],
      [{ battery: false }, true],
      [{ settings: { init_tx_defer_rx: false } }, true],
      [{}, false],
    ]) {
      Pacer._resetGlobalForTests();
      const clock = virtualClock();
      const d = device(clock, dev);
      const zcl = { endpoints: { 1: { clusters: { basic: { readAttributes: async () => ({}) } } } } };
      const p = Pacer.attach(d, zcl, node ? { now: clock.now, node: { handleFrame() {} } } : { now: clock.now });
      assert.strictEqual(p.deferToRx, false, JSON.stringify(dev));
    }
  });

  it('stays first in a handleFrame chain that already exists', () => {
    Pacer._resetGlobalForTests();
    const clock = virtualClock();
    const seen = [];
    const zigbeeNode = { handleFrame: () => { seen.push('root'); } };
    const { wrapHandleFrame } = require('../lib/utils/BidirectionalButtonState');
    wrapHandleFrame(zigbeeNode, 'swallow', () => { seen.push('swallow'); });
    const zcl = { endpoints: { 1: { clusters: { basic: { readAttributes: async () => ({}) } } } } };
    const p = Pacer.attach(device(clock), zcl, { now: clock.now, node: zigbeeNode });
    zigbeeNode.handleFrame(1, 0, Buffer.alloc(0), {});
    assert.strictEqual(p.rxSeen, true);
    assert.deepStrictEqual(seen, ['swallow']);
  });
});
