'use strict';

/**
 * Private + public reports: Mumubiz/MHCOZY `_TZ3218_7fiyo3kv` + TS000F
 * must pair as switch_temp_sensor (onoff + temperature), never switch_1gang.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { isForbiddenPlacement, lookup } = require('../../lib/pairing/UserMisattributionRegistry');
const CompoundFingerprintDB = require('../../lib/DeviceFingerprintDB');

function compose(driver) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', driver, 'driver.compose.json'), 'utf8'));
}

function mfrs(driver) {
  return new Set((compose(driver).zigbee.manufacturerName || []).map((x) => String(x).toLowerCase()));
}

describe('PM Rolp TZ3218_7fiyo3kv TS000F switch+temp', () => {
  it('locks the couple onto switch_temp_sensor and off switch_1gang', () => {
    for (const mfr of ['_TZ3218_7fiyo3kv', '_TZ3218_ya5d6wth']) {
      assert.ok(mfrs('switch_temp_sensor').has(mfr.toLowerCase()), `${mfr} missing on switch_temp_sensor`);
      assert.ok(!mfrs('switch_1gang').has(mfr.toLowerCase()), `${mfr} still on switch_1gang`);
      assert.strictEqual(lookup(mfr, 'TS000F').canonicalDriver, 'switch_temp_sensor');
      assert.strictEqual(isForbiddenPlacement(mfr, 'switch_1gang'), true);
      assert.strictEqual(CompoundFingerprintDB.lookup(mfr, 'TS000F')?.driver, 'switch_temp_sensor');
    }
    const pids = compose('switch_temp_sensor').zigbee.productId || [];
    assert.ok(pids.includes('TS000F'));
    assert.ok(!pids.includes('TS0601_tempswitch'));
    assert.ok(compose('switch_temp_sensor').capabilities.includes('measure_temperature'));
    assert.ok(compose('switch_temp_sensor').capabilities.includes('onoff'));
    assert.ok(!compose('switch_temp_sensor').capabilities.includes('measure_battery'));
  });
});
