'use strict';
// P3263: master probe swap — placeholder-only device_radiator_valve_thermostat out, water_leak_aoyan_ay222z unheld.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const hold = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'publish-hold-drivers.json'), 'utf8'));
const compose = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));

describe('P3263 AOYAN probe swap', () => {
  it('device_radiator_valve_thermostat is gone from source and recorded as folded', () => {
    assert.ok(!fs.existsSync(path.join(ROOT, 'drivers', 'device_radiator_valve_thermostat')));
    assert.ok(hold._folded.device_radiator_valve_thermostat);
  });
  it('its only real payload couple stays on thermostatic_radiator_valve', () => {
    const z = compose('thermostatic_radiator_valve').zigbee;
    assert.ok(z.manufacturerName.includes('_tze200_9xfjixap'));
    assert.ok(z.productId.includes('TS0601'));
  });
  it('water_leak_aoyan_ay222z is held again after build #3698 and keeps its own AOYAN couples', () => {
    const entry = hold.drivers.find((e) => e.id === 'water_leak_aoyan_ay222z');
    assert.ok(entry, 'held after the #3698 AggregateError probe');
    assert.match(entry.reason, /3698/);
    const z = compose('water_leak_aoyan_ay222z').zigbee;
    assert.ok(z.manufacturerName.includes('AOYAN'));
    assert.ok(z.manufacturerName.includes('AOYAN  '));
    assert.deepStrictEqual(z.productId, ['AY222Z']);
    assert.ok(fs.existsSync(path.join(ROOT, 'drivers', 'water_leak_aoyan_ay222z', 'device.js')));
  });
});
