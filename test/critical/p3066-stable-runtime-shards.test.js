'use strict';
// P3066 (stable-v5): the runtime reads lib/tuya/fp-shards (DeviceFingerprintDB). The EcoDim bulb hint
// must be in its shard too. _TZE204_z7a2jmyy + TS0601 is the NEO valve, so the monolith, the shard
// and the compose agree on water_valve_smart.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

describe('P3066 stable runtime fingerprint shards', () => {
  it('_TZ3210_09hzmirw shard hint is the CCT light driver', () => {
    const shard = require(path.join(ROOT, 'lib/tuya/fp-shards/TZ3210_0.json'));
    assert.strictEqual(shard._TZ3210_09hzmirw.driverId, 'light_cct_ts0502b');
  });
  it('_TZE204_z7a2jmyy is the NEO valve in the monolith and its shard', () => {
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    const shard = require(path.join(ROOT, 'lib/tuya/fp-shards/TZE204_z.json'));
    assert.strictEqual(fp._TZE204_z7a2jmyy.driverId, 'water_valve_smart');
    assert.strictEqual(shard._TZE204_z7a2jmyy.driverId, 'water_valve_smart');
    assert.strictEqual(fp._TZE204_Z7A2JMYY.driverId, 'water_valve_smart');
    assert.strictEqual(shard._TZE204_Z7A2JMYY.driverId, 'water_valve_smart');
    const climate = require(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'));
    assert.ok(!climate.zigbee.manufacturerName.includes('_TZE204_z7a2jmyy'));
    const valve = require(path.join(ROOT, 'drivers/water_valve_smart/driver.compose.json'));
    assert.ok(valve.zigbee.manufacturerName.includes('_TZE204_z7a2jmyy'));
  });
});
