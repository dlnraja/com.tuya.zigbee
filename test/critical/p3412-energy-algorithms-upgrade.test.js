'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const PowerEstimator = require(path.join(ROOT, 'lib/energy/PowerEstimator'));
const PowerSelfCalibration = require(path.join(ROOT, 'lib/energy/PowerSelfCalibration'));
const PowerEnergySanity = require(path.join(ROOT, 'lib/energy/PowerEnergySanity'));
const ZclScaleAuthority = require(path.join(ROOT, 'lib/energy/ZclScaleAuthority'));

test('P3412: PowerEstimator supports gamma dimming, RGB colorMode scaling, trapezoidal kWh & V*I*PF fallback', () => {
  // Linear default preserved
  assert.equal(PowerEstimator.estimateWatts({ on: true, dim: 0.5, ratedW: 10, standbyW: 0.4 }), 5.2);
  // Gamma 2.0 LED curve
  assert.equal(PowerEstimator.estimateWatts({ on: true, dim: 0.5, ratedW: 10, standbyW: 0, gamma: 2 }), 2.5);
  // Saturated color mode draws ~0.8x dual-white
  assert.equal(PowerEstimator.estimateWatts({ on: true, dim: 1, ratedW: 10, standbyW: 0, colorMode: 'color' }), 8);
  // Trapezoidal integration: ramp 0 W -> 1000 W over 15 min = avg 500 W * 0.25 h = 0.125 kWh
  assert.equal(PowerEstimator.integrateKwhTrapezoidal(1.0, 0, 1000, 15 * 60 * 1000), 1.125);
  // V * I * PF fallback
  assert.equal(PowerEstimator.estimatePowerFromVI(230, 2, 0.95), 437);
  assert.equal(PowerEstimator.estimatePowerFromVI(12, 2), null);
});

test('P3412: PowerSelfCalibration anchors to standby when only OFF + 100% are trusted and dampens spike glitches', () => {
  const cal = new PowerSelfCalibration();
  for (let i = 0; i < 3; i++) {
    cal.learn({ on: false, watts: 0.5 });
    cal.learn({ on: true, dim: 1, watts: 10.5 });
  }
  // Bucket 4 (dim 0.45) interpolates between standby 0.5 W and bucket 9 (10.5 W) -> 5.5 W
  const mid = cal.estimate({ on: true, dim: 0.45 });
  assert.equal(mid, 5.5);

  // Single 1000 W meter glitch on 10.5 W bucket is dampened (ALPHA/4 = 0.05 instead of 0.2)
  cal.learn({ on: true, dim: 1, watts: 1000 });
  assert.ok(cal.estimate({ on: true, dim: 1 }) < 65, 'Spike should be dampened by outlier guard');
});

test('P3412: ZclScaleAuthority.repairVoltage fixes both /10 (23.4 V) and x10 (2340 V) scaling bugs', () => {
  assert.equal(ZclScaleAuthority.repairVoltage(23.4), 234);
  assert.equal(ZclScaleAuthority.repairVoltage(2340), 234);
  assert.equal(ZclScaleAuthority.repairVoltage(231.5), 231.5);
});

test('P3412: PowerEnergySanity uses trapezoidal power integration on ramping loads', () => {
  const dev = { log: () => {} };
  PowerEnergySanity.observePower(dev, 0, { now: 0 });
  PowerEnergySanity.observePower(dev, 1000, { now: 600000 }); // 10 min ramp -> avg 500 W -> 0.08333 kWh
  const st = dev._powerEnergySanity;
  assert.ok(st.win.intKWh > 0.08 && st.win.intKWh < 0.086, `Expected ~0.0833 kWh, got ${st.win.intKWh}`);
});
