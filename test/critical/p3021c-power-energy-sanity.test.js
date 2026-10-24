'use strict';

/**
 * P3021c — forum #2092 (Lucas360): 54 W shown alongside ~54 kWh/day.
 * Power-vs-energy physics cross-check + per-device sticky correction.
 */
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const S = require('../../lib/energy/PowerEnergySanity');
const { ProductValueValidator } = require('../../lib/ProductValueValidator');

function dev(caps = {}) {
  const store = {};
  return {
    logs: [], store,
    log(...a) { this.logs.push(a.join(' ')); },
    getStoreValue: k => store[k],
    setStoreValue: (k, v) => { store[k] = v; return Promise.resolve(); },
    unsetStoreValue: k => { delete store[k]; return Promise.resolve(); },
    hasCapability: c => c in caps,
    getCapabilityValue: c => caps[c],
  };
}

const MIN = 60 * 1000;
// Drive a device for `steps` 5-min intervals at `w` W, energy growing `kwhPerStep`.
function run(d, { w, kwhPerStep, steps, start = 0, e0 = 1 }) {
  let t = start; let e = e0; let last;
  S.observePower(d, w, { now: t });
  last = S.checkEnergy(d, e, { now: t });
  for (let k = 0; k < steps; k++) {
    for (let m = 1; m <= 5; m++) { S.observePower(d, w, { now: t + m * MIN }); }
    t += 5 * MIN; e += kwhPerStep;
    last = S.checkEnergy(d, e, { now: t });
  }
  return { t, e, last };
}

describe('P3021c PowerEnergySanity (forum #2092)', () => {
  it('classifyInterval: plausible, decade factor, implausible, no evidence', () => {
    // 1000 W for 1 h → 1 kWh
    assert.strictEqual(S.classifyInterval({ dE: 1, dt: 3600, maxPowerW: 1000, integratedKWh: 1, coverage: 1 }).verdict, 'ok');
    const f = S.classifyInterval({ dE: 1000, dt: 3600, maxPowerW: 1000, integratedKWh: 1, coverage: 1 });
    assert.deepStrictEqual([f.verdict, f.factor], ['factor', 1000]);
    // #2092 shape: 54 W, 54 kWh/day → ×41.7, no decade fits
    const x = S.classifyInterval({ dE: 54 / 24, dt: 3600, maxPowerW: 54, integratedKWh: 0.054, coverage: 1 });
    assert.strictEqual(x.verdict, 'implausible');
    assert.strictEqual(S.classifyInterval({ dE: 1000, dt: 3600, maxPowerW: 1000, integratedKWh: 1, coverage: 0.1 }).verdict, 'skip');
    assert.strictEqual(S.classifyInterval({ dE: 1, dt: 10, maxPowerW: 1, integratedKWh: 0, coverage: 1 }).verdict, 'skip');
  });

  it('isDailyMirror + ProductValueValidator.checkPowerEnergyConsistency', () => {
    assert.strictEqual(S.isDailyMirror(54, 54), true);
    assert.strictEqual(S.isDailyMirror(1.3, 54), false);
    const r = ProductValueValidator.checkPowerEnergyConsistency({
      dE: 54 / 24, dt: 3600, maxPowerW: 54, integratedKWh: 0.054, coverage: 1, dayDeltaKWh: 54, typicalPowerW: 54,
    });
    assert.strictEqual(r.verdict, 'implausible');
    assert.strictEqual(r.dailyMirror, true);
  });

  it('healthy plug: never corrected', () => {
    const d = dev();
    // 120 W for 5 min = 0.01 kWh
    const { last, e } = run(d, { w: 120, kwhPerStep: 0.01, steps: 20 });
    assert.strictEqual(S.getStatus(d).mode, 'none');
    assert.strictEqual(last, e);
  });

  it('Wh reported as kWh (×1000): sticky ÷1000 after 3 confirmations, persisted', () => {
    const d = dev();
    const a = run(d, { w: 120, kwhPerStep: 10, steps: 2 });
    assert.strictEqual(S.getStatus(d).mode, 'none', 'no reaction before confirmation');
    const b = run(d, { w: 120, kwhPerStep: 10, steps: 2, start: a.t, e0: a.e + 10 });
    assert.strictEqual(S.getStatus(d).mode, 'factor');
    assert.strictEqual(S.getStatus(d).factor, 1000);
    assert.ok(Math.abs(b.last - b.e / 1000) < 1e-9);
    assert.strictEqual(d.store[S.STORE_KEY].factor, 1000);
    assert.ok(d.logs.some(l => l.includes('🚩')));
    // reload from store (reboot)
    delete d._powerEnergySanity;
    assert.ok(Math.abs(S.checkEnergy(d, 5000, { now: b.t + MIN }) - 5) < 1e-9);
  });

  it('#2092 shape (no decade fits) → integrate from measure_power', () => {
    const d = dev();
    const r = run(d, { w: 54, kwhPerStep: 54 / 288, steps: 6, e0: 2 });
    assert.strictEqual(S.getStatus(d).mode, 'integrate');
    // integrated value stays close to base + 54 W × elapsed, never ~54 kWh/day
    assert.ok(r.last < 2.1, `got ${r.last}`);
  });

  it('meter_power mirroring measure_power (DP mix-up) → integrate', () => {
    const d = dev();
    const ws = [54, 50, 56, 40, 41];
    let t = 0;
    for (const w of ws) { S.observePower(d, w, { now: t }); S.checkEnergy(d, w, { now: t + 1000 }); t += MIN; }
    assert.strictEqual(S.getStatus(d).mode, 'integrate');
    assert.ok(/mirrors/.test(S.getStatus(d).reason));
  });

  it('power itself suspect (P ≠ V×I) → no judgement', () => {
    const d = dev({ measure_voltage: 230, measure_current: 5 }); // 1150 VA but power says 120 W
    run(d, { w: 120, kwhPerStep: 10, steps: 6 });
    assert.strictEqual(S.getStatus(d).mode, 'none');
  });

  it('reset clears memory and store; bad input passes through', () => {
    const d = dev();
    run(d, { w: 120, kwhPerStep: 10, steps: 4 });
    S.reset(d);
    assert.strictEqual(S.getStatus(d).mode, 'none');
    assert.strictEqual(d.store[S.STORE_KEY], undefined);
    assert.strictEqual(S.checkEnergy(d, -1), -1);
    assert.strictEqual(S.checkEnergy(null, 3), 3);
    assert.ok(Number.isNaN(S.observePower(d, NaN)));
  });
});
