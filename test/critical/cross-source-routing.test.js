'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const UnifiedBatteryHandler = require('../../lib/battery/UnifiedBatteryHandler');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
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

function lowerValues(values = []) {
  return values.map(value => String(value).toLowerCase());
}

function assertIncludesCI(values, expected, message) {
  assert(
    lowerValues(values).includes(String(expected).toLowerCase()),
    message || `Expected ${expected} in ${JSON.stringify(values)}`
  );
}

function assertNotIncludesCI(values, expected, message) {
  assert(
    !lowerValues(values).includes(String(expected).toLowerCase()),
    message || `Did not expect ${expected} in ${JSON.stringify(values)}`
  );
}

describe('Cross-source battery/button routing regressions', function() {
  it('routes ZG-303Z and _TZE284_0ints6wl soil sensors away from climate fallbacks', () => {
    for (const source of [driverCompose('soil_sensor'), appDriver('soil_sensor')]) {
      assertIncludesCI(source.zigbee.manufacturerName, '_TZE284_0ints6wl');
      assertIncludesCI(source.zigbee.manufacturerName, 'HOBEIAN');
      assertIncludesCI(source.zigbee.productId, 'ZG-303Z');
      assert(source.capabilities.includes('measure_battery'), 'soil_sensor must expose measure_battery');
      assert(!source.capabilities.includes('alarm_battery'), 'soil_sensor must not combine alarm_battery with measure_battery');
      assert(Array.isArray(source.energy?.batteries), 'soil_sensor with battery capability needs energy.batteries');
    }

    for (const driverId of ['sensor_climate_temphumidsensor', 'climate_sensor_energy']) {
      assertNotIncludesCI(driverCompose(driverId).zigbee.productId, 'ZG-303Z', `${driverId} must not claim soil ZG-303Z`);
      assertNotIncludesCI(appDriver(driverId).zigbee.productId, 'ZG-303Z', `${driverId} app.json must not claim soil ZG-303Z`);
    }
  });

  it('routes TS0041 four-endpoint buttons to the 4-gang driver', () => {
    for (const source of [driverCompose('button_wireless_4_ts0041'), appDriver('button_wireless_4_ts0041')]) {
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_b4awzgct');
      assert.deepStrictEqual(source.capabilities.slice(0, 4), ['button.1', 'button.2', 'button.3', 'button.4']);
      assert(source.capabilities.includes('measure_battery'));
    }

    for (const source of [driverCompose('button_wireless_1'), appDriver('button_wireless_1')]) {
      assertNotIncludesCI(source.zigbee.manufacturerName, '_TZ3000_b4awzgct');
    }
  });

  it('routes TS0044 and TS004F reports to button/knob drivers, not metered switches', () => {
    for (const source of [driverCompose('button_wireless_4'), appDriver('button_wireless_4')]) {
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_kfu8zapd');
    }

    for (const source of [driverCompose('smart_knob_rotary'), appDriver('smart_knob_rotary')]) {
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_qja6nq5z');
    }

    for (const source of [driverCompose('switch_4_gang_metering'), appDriver('switch_4_gang_metering')]) {
      assertNotIncludesCI(source.zigbee.manufacturerName, '_TZ3000_qja6nq5z');
      assertNotIncludesCI(source.zigbee.productId, 'TS004F');
    }
  });

  it('keeps TS004x ZCL battery value 200 as 100 percent for known remotes', () => {
    for (const manufacturer of ['_TZ3000_b4awzgct', '_TZ3000_yj6k7vfo', '_TZ3000_kfu8zapd', '_TZ3000_qja6nq5z']) {
      const profile = UnifiedBatteryHandler.lookupBatteryProfile(manufacturer, 'TS004F');
      assert.strictEqual(profile.zcl200IsPercent, true, `${manufacturer} should treat ZCL 200 as 100%`);
      assert.strictEqual(
        UnifiedBatteryHandler.normalizeZigbeeValue(200, {
          manufacturer,
          batteryType: profile.chemistry,
          treat200AsSentinel: !profile.zcl200IsPercent
        }),
        100
      );
    }
  });
});
