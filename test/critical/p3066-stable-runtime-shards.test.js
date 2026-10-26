'use strict';
// P3066 (stable-v5): the runtime reads lib/tuya/fp-shards (DeviceFingerprintDB). The EcoDim bulb hint
// must be in its shard too, and _TZE204_z7a2jmyy keeps its stable owner climate_sensor (the only
// driver listing it here) after the P52 sync 6897a290f5 had set it to water_valve_smart.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

describe('P3066 stable runtime fingerprint shards', () => {
  it('_TZ3210_09hzmirw shard hint is the CCT light driver', () => {
    const shard = require(path.join(ROOT, 'lib/tuya/fp-shards/TZ3210_0.json'));
    assert.strictEqual(shard._TZ3210_09hzmirw.driverId, 'light_cct_ts0502b');
  });
  it('_TZE204_z7a2jmyy stays on climate_sensor in the monolith and its shard', () => {
    const fp = require(path.join(ROOT, 'lib/tuya/fingerprints.json'));
    const shard = require(path.join(ROOT, 'lib/tuya/fp-shards/TZE204_z.json'));
    assert.strictEqual(fp._TZE204_z7a2jmyy.driverId, 'climate_sensor');
    assert.strictEqual(shard._TZE204_z7a2jmyy.driverId, 'climate_sensor');
    const climate = require(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'));
    assert.ok(climate.zigbee.manufacturerName.includes('_TZE204_z7a2jmyy'));
  });
});
