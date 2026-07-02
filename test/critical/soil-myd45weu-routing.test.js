'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function maybeReadJson(relativePath) {
  const file = path.join(ROOT, relativePath);
  return fs.existsSync(file) ? readJson(relativePath) : null;
}

function maybeReadRuntimeCatalog(relativePath) {
  const file = path.join(ROOT, relativePath);
  if (!fs.existsSync(file)) return null;
  if (relativePath.endsWith('.js')) {
    delete require.cache[require.resolve(file)];
    return require(file);
  }
  return readJson(relativePath);
}

function findRuntimeFingerprintEntry(catalog, manufacturer) {
  if (!catalog) return null;
  if (Array.isArray(catalog)) {
    return catalog.find(entry => normalize(entry.manufacturerName) === normalize(manufacturer)) || null;
  }

  const key = Object.keys(catalog).find(item => normalize(item) === normalize(manufacturer));
  return key ? { manufacturerName: key, ...catalog[key] } : null;
}

function normalize(value) {
  return String(value).toLowerCase();
}

function includesCI(values = [], expected) {
  return values.map(normalize).includes(normalize(expected));
}

function driverCompose(driverId) {
  return readJson(path.join('drivers', driverId, 'driver.compose.json'));
}

function appDriver(driverId) {
  const app = readJson('app.json');
  const driver = app.drivers.find(item => item.id === driverId);
  assert(driver, `Missing app.json driver ${driverId}`);
  return driver;
}

function findPrimarySoilDriver() {
  const app = readJson('app.json');
  for (const candidate of ['soilsensor_2', 'soil_sensor']) {
    const driver = app.drivers.find(item => item.id === candidate);
    if (driver && includesCI(driver.zigbee?.manufacturerName, '_TZE284_myd45weu')) {
      return candidate;
    }
  }
  assert.fail('No app driver claims _TZE284_myd45weu');
}

function assertRuntimeFingerprint(file, driverId, humidityCapability) {
  const fingerprints = maybeReadJson(file);
  if (!fingerprints) return;

  for (const manufacturer of ['_TZE200_myd45weu', '_TZE284_myd45weu']) {
    const entry = fingerprints[manufacturer];
    assert(entry, `${file} missing ${manufacturer}`);
    assert.strictEqual(entry.driverId, driverId, `${file} must route ${manufacturer} to ${driverId}`);
    assert.strictEqual(entry.powerSource, 'battery', `${manufacturer} must stay battery-powered`);
    assert.strictEqual(entry.dps?.['3']?.capability, humidityCapability, `${manufacturer} DP3 must be soil moisture`);
    assert.strictEqual(entry.dps?.['5']?.capability, 'measure_temperature', `${manufacturer} DP5 must be temperature`);
    assert.strictEqual(entry.dps?.['15']?.capability, 'measure_battery', `${manufacturer} DP15 must be battery`);
  }
}

function assertRuntimeFingerprintEntry(file, manufacturer, driverId) {
  const fingerprints = maybeReadRuntimeCatalog(file);
  if (!fingerprints) return;

  const entry = findRuntimeFingerprintEntry(fingerprints, manufacturer);
  assert(entry, `${file} missing ${manufacturer}`);
  assert.strictEqual(entry.driverId, driverId, `${file} must route ${manufacturer} to ${driverId}`);
  assert.strictEqual(entry.type, 'soil_sensor', `${manufacturer} must stay typed as soil_sensor in ${file}`);
  assert.strictEqual(entry.powerSource, 'battery', `${manufacturer} must stay battery-powered`);
}

describe('TS0601 _TZE284/_TZE200_myd45weu soil sensor routing', () => {
  it('pairs the myd45weu soil sensors only with the soil driver', () => {
    const soilDriverId = findPrimarySoilDriver();
    const compose = driverCompose(soilDriverId);
    const app = appDriver(soilDriverId);

    for (const source of [compose, app]) {
      assert(includesCI(source.zigbee.manufacturerName, '_TZE284_myd45weu'));
      assert(includesCI(source.zigbee.manufacturerName, '_TZE200_myd45weu'));
      assert(includesCI(source.zigbee.productId, 'TS0601'));
      assert(source.capabilities.includes('measure_battery'), `${soilDriverId} must expose measure_battery`);
    }

    for (const wrongDriverId of ['plug_smart', 'plug_1socket', 'climate_sensor', 'sensor_climate_contact', 'motion_sensor']) {
      const composePath = path.join(ROOT, 'drivers', wrongDriverId, 'driver.compose.json');
      const appDriverData = readJson('app.json').drivers.find(item => item.id === wrongDriverId);
      for (const source of [fs.existsSync(composePath) ? driverCompose(wrongDriverId) : null, appDriverData].filter(Boolean)) {
        assert(!includesCI(source.zigbee?.manufacturerName, '_TZE284_myd45weu'), `${wrongDriverId} must not claim _TZE284_myd45weu`);
        assert(!includesCI(source.zigbee?.manufacturerName, '_TZE200_myd45weu'), `${wrongDriverId} must not claim _TZE200_myd45weu`);
      }
    }
  });

  it('routes issue #428 _TZE284_0ints6wl to soil_sensor, not climate_sensor', () => {
    const reportedVariants = ['_tze284_0ints6wl', '_TZE284_0ints6wl', '_TZE284_0INTS6WL'];

    for (const source of [driverCompose('soil_sensor'), appDriver('soil_sensor')]) {
      for (const manufacturer of reportedVariants) {
        assert(includesCI(source.zigbee.manufacturerName, manufacturer), `soil_sensor must claim ${manufacturer}`);
      }
      assert(includesCI(source.zigbee.productId, 'TS0601'));
      assert(source.capabilities.includes('measure_humidity.soil'), 'soil_sensor must expose soil moisture');
      assert(source.capabilities.includes('measure_battery'), 'soil_sensor must expose battery for sleepy TS0601 soil sensors');
      assert(source.capabilities.includes('measure_ec'), 'soil_sensor must expose EC');
      for (const cluster of [0, 4, 5, 60672, 61184]) {
        const clusters = source.zigbee?.endpoints?.['1']?.clusters || [];
        assert(clusters.includes(cluster), `soil_sensor endpoint 1 must match issue #428 cluster ${cluster}`);
      }
    }

    for (const source of [driverCompose('climate_sensor'), appDriver('climate_sensor')]) {
      for (const manufacturer of reportedVariants) {
        assert(!includesCI(source.zigbee?.manufacturerName, manufacturer), `climate_sensor must not claim ${manufacturer}`);
      }
    }

    assertRuntimeFingerprintEntry('lib/tuya/fingerprints.json', '_TZE284_0ints6wl', 'soil_sensor');
    assertRuntimeFingerprintEntry('data/fingerprints.json', '_TZE284_0ints6wl', 'soil_sensor');
    assertRuntimeFingerprintEntry('lib/data/new_fingerprints.json', '_TZE284_0ints6wl', 'soil_sensor');
    assertRuntimeFingerprintEntry('lib/data/new_fingerprints.js', '_TZE284_0ints6wl', 'soil_sensor');
    assertRuntimeFingerprintEntry('lib/data/smart_fingerprints.js', '_TZE284_0ints6wl', 'soil_sensor');

    const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
    const profile = DeviceFingerprintDB.lookup('_TZE284_0ints6wl', 'TS0601');
    assert(profile, '_TZE284_0ints6wl must have a runtime fingerprint');
    assert.strictEqual(profile.driver, 'soil_sensor');
  });

  it('keeps runtime fingerprints and DP meanings aligned with the soil profile', () => {
    const soilDriverId = findPrimarySoilDriver();
    const humidityCapability = soilDriverId === 'soilsensor_2' ? 'measure_humidity' : 'measure_humidity.soil';

    assertRuntimeFingerprint('lib/tuya/fingerprints.json', soilDriverId, humidityCapability);
    assertRuntimeFingerprint('data/fingerprints.json', soilDriverId, humidityCapability);

    const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
    for (const manufacturer of ['_TZE200_myd45weu', '_TZE284_myd45weu']) {
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS0601');
      assert(profile, `${manufacturer} must have a compound fingerprint`);
      assert.strictEqual(profile.driver, soilDriverId);
      assert.strictEqual(DeviceFingerprintDB.getDPMeaning(manufacturer, 'TS0601', 3).capability, humidityCapability);
      assert.strictEqual(DeviceFingerprintDB.getDPMeaning(manufacturer, 'TS0601', 5).divisor, 10);
      assert.strictEqual(DeviceFingerprintDB.getDPMeaning(manufacturer, 'TS0601', 15).capability, 'measure_battery');
    }
  });

  it('exports Tuya numeric helpers used by soil and climate DP handlers', () => {
    const utils = require('../../lib/utils/tuyaUtils');
    assert.strictEqual(typeof utils.safeMultiply, 'function');
    assert.strictEqual(typeof utils.safeDivide, 'function');
    assert.strictEqual(typeof utils.safeParse, 'function');
    assert.strictEqual(utils.safeDivide(235, 10), 23.5);
  });
});
