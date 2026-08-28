'use strict';

/**
 * P2291 — Elliot #2204 _TZE204_ogkdpgy2+TS0601 NDIR CO2 must not land on climate_sensor.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2291 ogkdpgy2 CO2 sacred couple', () => {
  it('DeviceFingerprintDB routes ogkdpgy2+TS0601 → air_quality_co2', () => {
    delete require.cache[require.resolve('../../lib/DeviceFingerprintDB')];
    const DB = require('../../lib/DeviceFingerprintDB');
    assert.strictEqual(DB.lookup('_TZE204_ogkdpgy2', 'TS0601').driver, 'air_quality_co2');
    assert.strictEqual(DB.lookup('_TZE200_ogkdpgy2', 'TS0601').driver, 'air_quality_co2');
  });

  it('climate_sensor compose no longer lists ogkdpgy2', () => {
    const c = read('drivers/climate_sensor/driver.compose.json');
    assert(!/ogkdpgy2/i.test(c), 'ogkdpgy2 must be removed from climate_sensor');
  });

  it('air_quality_co2 compose lists ogkdpgy2 variants', () => {
    const c = read('drivers/air_quality_co2/driver.compose.json');
    assert(/_TZE204_OGKDPGY2/i.test(c));
    assert(/_TZE200_OGKDPGY2/i.test(c));
    assert(c.includes('TS0601'));
  });

  it('registry forbidMode couple blocks climate_sensor', () => {
    const { lookup, isForbiddenDriver, invalidate } = require('../../lib/pairing/UserMisattributionRegistry');
    invalidate();
    const hit = lookup('_TZE204_ogkdpgy2', 'TS0601');
    assert.strictEqual(hit?.canonicalDriver, 'air_quality_co2');
    assert.strictEqual(isForbiddenDriver('_TZE204_ogkdpgy2', 'TS0601', 'climate_sensor'), true);
    assert.strictEqual(isForbiddenDriver('_TZE204_ogkdpgy2', 'TS0601', 'air_quality_co2'), false);
  });

  it('air_quality_co2 device has ogkdpgy2 CO2-only DP2 profile', () => {
    const src = read('drivers/air_quality_co2/device.js');
    assert(src.includes('_isOgkdpgy2Co2Only'));
    assert(src.includes("includes('ogkdpgy2')"));
    assert(src.includes('measure_co2'));
  });
});
