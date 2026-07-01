'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function includesCI(values = [], expected) {
  const target = String(expected).toLowerCase();
  return values.map(value => String(value).toLowerCase()).includes(target);
}

function appDriver(driverId) {
  const driver = readJson('app.json').drivers.find(item => item.id === driverId);
  assert(driver, `Missing app.json driver ${driverId}`);
  return driver;
}

function composeDriver(driverId) {
  return readJson(path.join('drivers', driverId, 'driver.compose.json'));
}

function assertDriverClaims(driverId, manufacturerName) {
  for (const source of [appDriver(driverId), composeDriver(driverId)]) {
    assert(includesCI(source.zigbee?.manufacturerName, manufacturerName), `${driverId} must claim ${manufacturerName}`);
  }
}

function assertDriverDoesNotClaim(driverId, manufacturerName) {
  for (const source of [appDriver(driverId), composeDriver(driverId)]) {
    assert(!includesCI(source.zigbee?.manufacturerName, manufacturerName), `${driverId} must not claim ${manufacturerName}`);
  }
}

function assertDriverHasNoProductId(driverId, productId) {
  for (const source of [appDriver(driverId), composeDriver(driverId)]) {
    assert(!includesCI(source.zigbee?.productId, productId), `${driverId} must not claim ${productId} without an exact manufacturer`);
  }
}

function assertFingerprint(file, manufacturerName, driverId) {
  const fingerprints = readJson(file);
  const entry = fingerprints[manufacturerName] ||
    Object.entries(fingerprints).find(([key]) => key.toLowerCase() === manufacturerName.toLowerCase())?.[1];
  assert(entry, `${file} missing ${manufacturerName}`);
  assert.strictEqual(entry.driverId, driverId, `${file} must route ${manufacturerName} to ${driverId}`);
}

describe('forum routing regressions', () => {
  it('routes TS0044 _TZ3000_u3nv1jwk to the E000-capable 4-button driver only', () => {
    assertDriverClaims('button_wireless_4', '_TZ3000_u3nv1jwk');
    assertDriverDoesNotClaim('switch_1gang', '_TZ3000_u3nv1jwk');
    assertDriverDoesNotClaim('remote_button_wireless_handheld', '_TZ3000_u3nv1jwk');
    assertDriverHasNoProductId('remote_button_wireless_handheld', 'TS0044');

    assertFingerprint('data/fingerprints.json', '_TZ3000_u3nv1jwk', 'button_wireless_4');
    assertFingerprint('lib/tuya/fingerprints.json', '_TZ3000_u3nv1jwk', 'button_wireless_4');

    const source = read('drivers/button_wireless_4/device.js');
    assert.match(source, /_setupE000Detection/);
    assert.match(source, /_setupTuyaDPButtonDetection/);
  });

  it('routes Moes/Lidl TS004F physical button variants to transport-aware drivers', () => {
    const fourButtonManufacturers = [
      '_TZ3000_kfu8zapd',
      '_TZ3000_xabckq1v',
      '_TZ3000_czuyt8lz',
      '_TZ3000_b3mgfu0d',
      '_TZ3000_rco1yzb1',
      '_TZ3000_abrsvsou',
      '_TZ3000_4fjiwweb',
    ];
    const rotaryManufacturers = [
      '_TZ3000_qja6nq5z',
      '_TZ3000_gwkzibhs',
      '_TZ3000_ugi8ky6u',
    ];

    for (const manufacturer of fourButtonManufacturers) {
      assertDriverClaims('button_wireless_4', manufacturer);
      const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS004F');
      assert.strictEqual(profile.driver, 'button_wireless_4', `${manufacturer} must use button_wireless_4 for TS004F`);
    }
    assertDriverDoesNotClaim('button_wireless_2', '_TZ3000_b3mgfu0d');
    assertDriverDoesNotClaim('smart_remote_1_button', '_TZ3000_rco1yzb1');

    for (const manufacturer of rotaryManufacturers) {
      assertDriverClaims('smart_knob_rotary', manufacturer);
      assertDriverDoesNotClaim('button_wireless_4', manufacturer);
      assertDriverDoesNotClaim('button_wireless', manufacturer);
      const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS004F');
      assert.strictEqual(profile.driver, 'smart_knob_rotary', `${manufacturer} must use smart_knob_rotary for TS004F`);
    }

    const compose = composeDriver('button_wireless_4');
    for (const [endpointId, endpoint] of Object.entries(compose.zigbee.endpoints)) {
      assert(endpoint.clusters.includes(8), `endpoint ${endpointId} must include LevelControl cluster 0x0008`);
    }

    const source = read('drivers/button_wireless_4/device.js');
    assert.match(source, /_setupLevelControlDetection/);
    assert.match(source, /commandStep/);
    assert.match(source, /commandMove/);
    assert.match(source, /commandStop/);

    const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');
    for (const manufacturer of [...fourButtonManufacturers, ...rotaryManufacturers]) {
      const profile = UnifiedBatteryHandler.lookupBatteryProfile(manufacturer, 'TS004F');
      assert.strictEqual(profile.zcl200IsPercent, true, `${manufacturer} should treat ZCL 200 as 100%`);
      assert.strictEqual(
        UnifiedBatteryHandler.normalizeZigbeeValue(200, {
          manufacturer,
          batteryType: profile.chemistry,
          treat200AsSentinel: !profile.zcl200IsPercent,
        }),
        100
      );
    }
  });

  it('routes Nedis ne4pikwm radiator valves to TRV handling, not climate fallback', () => {
    for (const manufacturer of ['_TZE284_ne4pikwm', '_TZE200_ne4pikwm']) {
      assertDriverClaims('radiator_valve', manufacturer);
      assertDriverDoesNotClaim('climate_sensor', manufacturer);
      assertFingerprint('data/fingerprints.json', manufacturer, 'radiator_valve');
      assertFingerprint('lib/tuya/fingerprints.json', manufacturer, 'radiator_valve');

      const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS0601');
      assert(profile, `${manufacturer} must have a compound fingerprint`);
      assert.strictEqual(profile.driver, 'radiator_valve');
      assert.strictEqual(DeviceFingerprintDB.getDPMeaning(manufacturer, 'TS0601', 16).capability, 'target_temperature');
    }

    const source = read('drivers/radiator_valve/device.js');
    assert(source.indexOf('const nedisIds') < source.indexOf('const me167Ids'), 'Nedis must be matched before ME167');
    assert.doesNotMatch(source, /includesCI\(me167Ids, id\)/);
  });

  it('uses exact manufacturerName+deviceId routes before mfr-only fingerprint catalogs', () => {
    const runtimeDb = require('../../lib/tuya/DeviceFingerprintDB');

    assert.strictEqual(runtimeDb.getDriverId('_TZ3000_kfu8zapd', 'TS004F'), 'button_wireless_4');
    assert.strictEqual(runtimeDb.getDriverId('_TZ3002_pzao9ls1', 'TS0726'), 'wall_switch_4gang_1way');
    assert.strictEqual(runtimeDb.getDriverId('_TZE200_8ygsuhe1', 'TS0601'), 'air_quality_comprehensive');

    const profile = runtimeDb.getFingerprint('_TZE200_8ygsuhe1', 'TS0601');
    assert.strictEqual(profile.driverId, 'air_quality_comprehensive');
    assert.deepStrictEqual(profile.modelIds, ['TS0601']);
  });
});
