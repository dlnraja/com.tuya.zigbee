'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

const RELAY_MANUFACTURERS = [
  '_TZE204_sbyx0lm6',
  '_TZE204_clrdrnya',
  '_TZE204_dtzziy1e',
  '_TZE204_iaeejhvf',
  '_TZE204_mtoaryre',
  '_TZE200_mp902om5',
  '_TZE204_pfayrzcw',
  '_TZE284_4qznlkbu',
  '_TZE200_clrdrnya',
  '_TZE200_sbyx0lm6',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
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

function runtimeEntry(catalog, manufacturer) {
  const key = Object.keys(catalog).find(item => normalize(item) === normalize(manufacturer));
  return key ? catalog[key] : null;
}

describe('MTG075/MTG035 relay presence radar routing', () => {
  it('maps issue #87 _TZE204_mtoaryre and sibling relay radars to a mains relay profile', () => {
    const { getSensorConfig } = require('../../drivers/presence_sensor_radar/configs');
    const altConfigs = require('../../drivers/sensor_illuminance_presence/configs');

    for (const manufacturer of RELAY_MANUFACTURERS) {
      for (const lookup of [getSensorConfig, altConfigs.getSensorConfig]) {
        const config = lookup(manufacturer, 'TS0601');
        assert.strictEqual(config.configName, 'MTG075_ZB_RL_RELAY', `${manufacturer} must use relay profile`);
        assert.strictEqual(config.mainsPowered, true, `${manufacturer} must be mains-powered`);
        assert.strictEqual(config.noBatteryCapability, true, `${manufacturer} must not expose battery`);
        assert.strictEqual(config.hasRelay, true, `${manufacturer} must expose relay`);
        assert.strictEqual(config.relayDp, 108, `${manufacturer} relay must use DP108`);
        assert.strictEqual(config.dpMap[1].cap, 'alarm_motion', `${manufacturer} DP1 must be presence`);
        assert.strictEqual(config.dpMap[104].cap, 'measure_luminance', `${manufacturer} DP104 must be lux`);
        assert.strictEqual(config.dpMap[108].cap, 'onoff', `${manufacturer} DP108 must be onoff`);
      }
    }
  });

  it('pairs the relay family with presence_sensor_radar and keeps onoff available for flows', () => {
    for (const source of [driverCompose('presence_sensor_radar'), appDriver('presence_sensor_radar')]) {
      assert(source.capabilities.includes('onoff'), 'presence_sensor_radar must expose onoff for relay flow cards');
      assert(source.capabilities.includes('alarm_human'), 'presence_sensor_radar must expose alarm_human');
      assert(source.capabilities.includes('measure_luminance'), 'presence_sensor_radar must expose lux');
      assert(source.capabilities.includes('measure_luminance.distance'), 'presence_sensor_radar must expose target distance');

      for (const manufacturer of RELAY_MANUFACTURERS) {
        assert(includesCI(source.zigbee.manufacturerName, manufacturer), `presence_sensor_radar must claim ${manufacturer}`);
      }
    }

    for (const source of [driverCompose('sensor_illuminance_presence'), appDriver('sensor_illuminance_presence')]) {
      assert(source.capabilities.includes('onoff'), 'legacy illuminance/presence driver must allow relay migration');
    }
  });

  it('does not let generic climate or mmWave fallback drivers steal relay radars', () => {
    for (const wrongDriverId of ['climate_sensor', 'motion_sensor_radar_mmwave']) {
      for (const source of [driverCompose(wrongDriverId), appDriver(wrongDriverId)]) {
        for (const manufacturer of RELAY_MANUFACTURERS) {
          assert(!includesCI(source.zigbee?.manufacturerName, manufacturer), `${wrongDriverId} must not claim ${manufacturer}`);
        }
      }
    }
  });

  it('keeps generated fingerprint catalogs aligned with the relay profile', () => {
    const runtimeFingerprints = readJson('lib/tuya/fingerprints.json');
    const newFingerprints = readJson('lib/data/new_fingerprints.json');

    for (const manufacturer of RELAY_MANUFACTURERS) {
      const runtime = runtimeEntry(runtimeFingerprints, manufacturer);
      assert(runtime, `lib/tuya/fingerprints.json missing ${manufacturer}`);
      assert.strictEqual(runtime.driverId, 'presence_sensor_radar', `${manufacturer} runtime driver`);
      assert.strictEqual(runtime.type, 'presence', `${manufacturer} runtime type`);
      assert.strictEqual(runtime.powerSource, 'mains', `${manufacturer} runtime power source`);

      const generated = newFingerprints.find(entry => normalize(entry.manufacturerName) === normalize(manufacturer));
      assert(generated, `lib/data/new_fingerprints.json missing ${manufacturer}`);
      assert.strictEqual(generated.driverId, 'presence_sensor_radar', `${manufacturer} generated driver`);
      assert.strictEqual(generated.type, 'presence', `${manufacturer} generated type`);
      assert.strictEqual(generated.powerSource, 'mains', `${manufacturer} generated power source`);
    }
  });
});
