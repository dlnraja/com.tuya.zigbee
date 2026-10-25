'use strict';
// P3043 (25/10/2026 Paris): smoke_sensor_ts0601_dp exposed measure_battery + alarm_battery, which the
// Homey guidelines audit rejects (BATTERY_CAPABILITY_CONFLICT, Unified CI red on 077a941edd and a
// blocker for the publish workflow). Keep measure_battery (DP15); DP14 battery_state is a fallback.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

require('../_support/homey-stub').install();

const ROOT = path.join(__dirname, '..', '..');
const DRV = path.join(ROOT, 'drivers', 'smoke_sensor_ts0601_dp');
const compose = require(path.join(DRV, 'driver.compose.json'));
const app = require(path.join(ROOT, 'app.json'));
const Device = require(path.join(DRV, 'device.js'));

function fake() {
  const d = Object.create(Device.prototype);
  d.values = {};
  d._dpProfileCache = d.profileFor();
  d.hasCapability = (c) => d._dpProfileCache.capabilities.includes(c);
  d.safeSetCapabilityValue = (c, v) => { d.values[c] = v; };
  d.getCapabilityValue = (c) => d.values[c];
  return d;
}

describe('P3043 smoke_sensor_ts0601_dp battery capabilities', () => {
  it('compose, app.json and profile never expose both battery capabilities', () => {
    const appDrv = app.drivers.find((x) => x.id === 'smoke_sensor_ts0601_dp');
    for (const caps of [compose.capabilities, appDrv.capabilities, fake().profileFor().capabilities]) {
      assert.ok(caps.includes('measure_battery'));
      assert.ok(!caps.includes('alarm_battery'));
    }
    assert.ok(compose.capabilities.includes('alarm_smoke') && compose.capabilities.includes('alarm_tamper'));
  });
  it('P3043d: the hot-swap profile in driver-mapping-database mirrors the driver (no alarm_battery)', () => {
    const prof = require(path.join(ROOT, 'data', 'driver-mapping-database.json')).drivers.smoke_sensor_ts0601_dp;
    assert.ok(prof.capabilities.includes('measure_battery'));
    assert.ok(!prof.capabilities.includes('alarm_battery'));
    for (const cap of prof.capabilities) {assert.ok(compose.capabilities.includes(cap), cap);}
  });
  it('DP14 battery_state is a fallback until DP15 is seen', () => {
    const d = fake();
    d._onProfileDP(14, 0);
    assert.equal(d.values.measure_battery, 10);
    d._onProfileDP(15, 87);
    assert.equal(d.values.measure_battery, 87);
    d._onProfileDP(14, 0);
    assert.equal(d.values.measure_battery, 87);
  });
});
