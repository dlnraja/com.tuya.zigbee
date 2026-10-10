'use strict';
const assert = require('assert');
const { ZigbeeResilience, retryOnceWithJitter, isReachabilityError, attach, detach, _registry } = require('../lib/reliability/ZigbeeResilience');
const MemwarnGuard = require('../lib/utils/MemwarnGuard');
const { registerAppCleaners } = require('../lib/utils/memwarn-cleaners');

function dev(extra = {}) { return Object.assign({ log() {}, hasCapability: () => false }, extra); }

describe('ZigbeeResilience', () => {
  it('retries exactly once on reachability errors, with jitter', async () => {
    let n = 0; const waits = [];
    const r = await retryOnceWithJitter(async () => { n++; if (n === 1) throw new Error('Timeout'); return 'ok'; },
      { sleep: async (ms) => waits.push(ms), rnd: () => 0.5 });
    assert.strictEqual(r, 'ok'); assert.strictEqual(n, 2); assert.deepStrictEqual(waits, [1000]);
    n = 0;
    await assert.rejects(retryOnceWithJitter(async () => { n++; throw new Error('timeout'); }, { sleep: async () => {} }));
    assert.strictEqual(n, 2);
    n = 0;
    await assert.rejects(retryOnceWithJitter(async () => { n++; throw new Error('invalid value'); }, { sleep: async () => {} }));
    assert.strictEqual(n, 1);
    assert.ok(isReachabilityError(new Error('MAC_NO_ACK')));
  });

  it('learns the interval, marks unavailable only after 3 missed intervals', () => {
    let t = 1e9; const z = new ZigbeeResilience(dev({ powerType: 'AC' }), { now: () => t });
    for (let i = 0; i < 5; i++) { z.noteRx(t); t += 300000; }
    t -= 300000;
    assert.ok(Math.abs(z.reportIntervalMs() - 300000) < 1000);
    t += 2.5 * 300000; assert.strictEqual(z.shouldMarkUnavailable(), false);
    t += 0.6 * 300000; assert.strictEqual(z.shouldMarkUnavailable(), true);
    assert.strictEqual(new ZigbeeResilience(dev(), { missedIntervals: 9 }).missedIntervals, 3);
  });

  it('re-binds once per silence period', async () => {
    let t = 1e9; let calls = 0;
    const z = new ZigbeeResilience(dev({ powerType: 'AC', _reconfigureAttributeReporting: async () => { calls++; } }), { now: () => t });
    z.noteRx(t); t += 5 * 600000;
    assert.ok(z.needsRebind());
    assert.deepStrictEqual(await z.rebind(), ['reporting']);
    assert.strictEqual(z.needsRebind(), false);
    z.noteRx(t); t += 5 * 600000;
    assert.ok(z.needsRebind());
    assert.strictEqual(calls, 1);
  });

  it('queues failed writes on battery devices and flushes on wake', async () => {
    const z = new ZigbeeResilience(dev({ powerType: 'BATTERY' }));
    z._retryOpts = { sleep: async () => {} };
    let sent = 0; let fail = true;
    const res = await z.send(async () => { if (fail) throw new Error('timeout'); sent++; }, 'dp2');
    assert.deepStrictEqual(res, { queued: true }); assert.strictEqual(z.queueLength(), 1);
    fail = false; z.noteRx();
    await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
    assert.strictEqual(sent, 1); assert.strictEqual(z.queueLength(), 0);
    const mains = new ZigbeeResilience(dev({ powerType: 'AC' })); mains._retryOpts = { sleep: async () => {} };
    await assert.rejects(mains.send(async () => { throw new Error('timeout'); }));
  });

  it('tick detects RX from device fields; attach/detach manage registry', async () => {
    const d = dev({ powerType: 'AC', _lastRxTimestamp: Date.now() });
    const z = attach(d); await z.tick();
    assert.ok(z.snapshot().lastRx); detach(z); assert.strictEqual(_registry.has(z), false);
  });
});

describe('memwarn cleaners', () => {
  it('registers real caches and clears device capability maps', () => {
    let inv = 0;
    const homey = { drivers: { getDrivers: () => ({ a: { getDevices: () => [{ _invalidateCapabilityMap: () => { inv++; }, _logBuffer: new Array(80).fill(1) }] } }) } };
    const g = new MemwarnGuard();
    const names = registerAppCleaners(g, homey);
    assert.ok(names.includes('device-caches'));
    assert.ok(names.length >= 4);
    g.handle({ count: 1, limit: 3 });
    assert.strictEqual(inv, 1);
  });
});
