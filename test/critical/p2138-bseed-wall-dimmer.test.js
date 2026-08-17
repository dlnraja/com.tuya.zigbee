'use strict';

/**
 * Forum #2133 / #2138 — BSEED Click socket-insert dimmer
 * Sacred couple: _TZE284_m1cvyneb + TS0601 → wall_dimmer_tuya
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { getDriverId } = require('../../lib/tuya/DeviceFingerprintDB');
const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
const { lookup, isForbiddenPlacement } = require('../../lib/pairing/UserMisattributionRegistry');
const { toTuyaBrightness, fromTuyaBrightness } = require('../../lib/tuya/TuyaBrightnessScale');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

describe('P2138 BSEED wall dimmer m1cvyneb', () => {
  it('locks compose + registry away from climate/soil/universal', () => {
    const compose = readJson('drivers/wall_dimmer_tuya/driver.compose.json');
    assert(compose.zigbee.manufacturerName.map((x) => x.toLowerCase()).includes('_tze284_m1cvyneb'));
    assert(compose.zigbee.productId.includes('TS0601'));
    assert(!compose.capabilities.includes('measure_temperature'));
    assert(!compose.capabilities.includes('measure_battery'));

    const climate = read('drivers/climate_sensor/driver.compose.json');
    assert(!/m1cvyneb/i.test(climate));

    const soil = read('drivers/soil_sensor/driver.compose.json');
    assert(!/m1cvyneb/i.test(soil));

    const c = lookup('_TZE284_m1cvyneb', 'TS0601');
    assert.strictEqual(c.canonicalDriver, 'wall_dimmer_tuya');
    for (const bad of ['climate_sensor', 'soil_sensor', 'zigbee_universal', 'generic_tuya', 'ir_blaster']) {
      assert.strictEqual(isForbiddenPlacement('_TZE284_m1cvyneb', bad), true, bad);
    }
  });

  it('runtime fingerprint DBs resolve to wall_dimmer_tuya', () => {
    assert.strictEqual(getDriverId('_TZE284_m1cvyneb', 'TS0601'), 'wall_dimmer_tuya');
    assert.strictEqual(DeviceFingerprintDB.lookup('_TZE284_m1cvyneb', 'TS0601').driver, 'wall_dimmer_tuya');
    // Sacred couple: same mfr + wrong/unknown pid must NOT inherit the dimmer driver
    assert.strictEqual(getDriverId('_TZE284_m1cvyneb', 'TS0201'), null,
      'mfr-only catalog must not claim unverified productIds');

    const catalogs = [
      'lib/tuya/fingerprints.json',
      'lib/data/new_fingerprints.json',
    ];
    for (const rel of catalogs) {
      const data = readJson(rel);
      if (Array.isArray(data)) {
        const row = data.find((e) => String(e.manufacturerName).toLowerCase() === '_tze284_m1cvyneb');
        assert(row, `${rel} missing m1cvyneb`);
        assert.strictEqual(row.driverId, 'wall_dimmer_tuya');
        assert.strictEqual(row.powerSource, 'mains');
        assert.deepStrictEqual(row.modelIds, ['TS0601']);
      } else {
        const key = Object.keys(data).find((k) => k.toLowerCase() === '_tze284_m1cvyneb');
        assert(key, `${rel} missing m1cvyneb`);
        assert.strictEqual(data[key].driverId, 'wall_dimmer_tuya');
        assert.deepStrictEqual(data[key].modelIds, ['TS0601']);
      }
    }
  });

  it('clamps MCU brightness and calls super.onNodeInit', () => {
    const src = read('drivers/wall_dimmer_tuya/device.js');
    assert.match(src, /await super\.onNodeInit/);
    assert.match(src, /toTuyaBrightness/);
    assert.match(src, /fromTuyaBrightness/);
    assert.match(src, /markAppCommand/);
    assert.doesNotMatch(src, /Math\.floor\(value \* 1000\)/);

    assert.strictEqual(toTuyaBrightness(1), 1000);
    assert.strictEqual(toTuyaBrightness(1.2), 1000);
    assert.strictEqual(fromTuyaBrightness(500), 0.5);
  });
});
