'use strict';
// P3389 (t1023u): boot stampede guard. Fail-before: no gate, 11 devices configure reporting all at
// once (peak 11) and ZigBeeDevice.configureAttributeReporting is the raw library method.
require('./_support/homey-stub');
const assert = require('assert');
const path = require('path');

const GATE = path.join(__dirname, '..', 'lib', 'performance', 'BootTxGate.js');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

describe('P3389 BootTxGate', function () {
  this.timeout(20000);

  it('11 devices at boot: at most 2 in flight, all done, arrival order kept', async () => {
    const { BootTxGate } = require(GATE);
    const gate = new BootTxGate({ concurrency: 2, windowMs: 1e9, maxWaitMs: 5000, slotHoldMs: 5000, uptimeMs: () => 0 });
    let active = 0; let peak = 0; const order = [];
    const jobs = Array.from({ length: 11 }, (_, i) => gate.run(async () => {
      active++; peak = Math.max(peak, active); order.push(i);
      await sleep(15);
      active--;
      return i * 10;
    }));
    const out = await Promise.all(jobs);
    assert.deepStrictEqual(out, Array.from({ length: 11 }, (_, i) => i * 10));
    assert.strictEqual(peak, 2);
    assert.deepStrictEqual(order, [...order].sort((a, b) => a - b));
    assert.strictEqual(gate.stats.gated, 11);
    assert.strictEqual(gate.stats.peak, 2);
  });

  it('a slow call gives its slot away after slotHoldMs; a queued call never waits past maxWaitMs', async () => {
    const { BootTxGate } = require(GATE);
    const g1 = new BootTxGate({ concurrency: 1, windowMs: 1e9, maxWaitMs: 10000, slotHoldMs: 40, uptimeMs: () => 0 });
    let slowDone = false;
    const slow = g1.run(() => sleep(400).then(() => { slowDone = true; }));
    const t0 = Date.now();
    await g1.run(async () => 'next');
    assert.ok(!slowDone && Date.now() - t0 < 300, 'next call started while the slow one still runs');
    assert.strictEqual(g1.stats.releasedSlow, 1);
    await slow;

    const g2 = new BootTxGate({ concurrency: 1, windowMs: 1e9, maxWaitMs: 40, slotHoldMs: 0, uptimeMs: () => 0 });
    const hang = g2.run(() => sleep(400));
    const t1 = Date.now();
    await g2.run(async () => 'forced');
    assert.ok(Date.now() - t1 < 300);
    assert.strictEqual(g2.stats.forcedByWait, 1);
    await hang;
  });

  it('errors propagate and free the slot; after the boot window calls run directly', async () => {
    const { BootTxGate } = require(GATE);
    let up = 0;
    const gate = new BootTxGate({ concurrency: 1, windowMs: 1000, maxWaitMs: 5000, slotHoldMs: 5000, uptimeMs: () => up });
    await assert.rejects(gate.run(async () => { throw new Error('boom'); }), /boom/);
    assert.strictEqual(await gate.run(async () => 'ok'), 'ok');
    up = 5000;
    assert.strictEqual(await gate.run(() => 'direct'), 'direct');
    assert.strictEqual(gate.stats.direct, 1);
  });

  it('TuyaZigbeeDevice installs the gate on homey-zigbeedriver ZigBeeDevice once, same this/args/result', async () => {
    require(path.join(__dirname, '..', 'lib', 'tuya', 'TuyaZigbeeDevice.js'));
    const { MARK, installOn, BootTxGate } = require(GATE);
    const { ZigBeeDevice } = require('homey-zigbeedriver');
    assert.ok(ZigBeeDevice.prototype.configureAttributeReporting[MARK], 'configureAttributeReporting is gated');
    assert.strictEqual(installOn(ZigBeeDevice), true);
    assert.ok(!ZigBeeDevice.prototype.configureAttributeReporting[MARK].original[MARK], 'wrapped only once');

    class Fake { async configureAttributeReporting(cfg) { return { self: this, cfg }; } }
    const g = new BootTxGate({ uptimeMs: () => 0 });
    installOn(Fake, g);
    const f = new Fake();
    const r = await f.configureAttributeReporting([{ attributeName: 'onOff' }]);
    assert.strictEqual(r.self, f);
    assert.deepStrictEqual(r.cfg, [{ attributeName: 'onOff' }]);
    assert.strictEqual(g.stats.gated, 1);
  });
});
