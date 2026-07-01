'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

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
});
