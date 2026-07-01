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

function driverFlowCompose(driverId) {
  return readJson(path.join('drivers', driverId, 'driver.flow.compose.json'));
}

function appFlowTriggerIds() {
  const app = readJson('app.json');
  return new Set((app.flow?.triggers || []).map(trigger => trigger.id));
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

function assertIncludesAll(values, expectedValues) {
  for (const expected of expectedValues) {
    assert(values.includes(expected), `Expected exact fingerprint ${expected} in ${JSON.stringify(values)}`);
  }
}

describe('stable cross-source routing regressions', function() {
  it('keeps ZG-303Z and _TZE284_0ints6wl on the soil driver only', () => {
    for (const source of [driverCompose('soil_sensor'), appDriver('soil_sensor')]) {
      assertIncludesCI(source.zigbee.manufacturerName, '_TZE284_0ints6wl');
      assertIncludesCI(source.zigbee.manufacturerName, 'HOBEIAN');
      assertIncludesCI(source.zigbee.productId, 'ZG-303Z');
      assert(source.capabilities.includes('measure_battery'), 'soil_sensor must expose measure_battery');
      assert(!source.capabilities.includes('alarm_battery'), 'soil_sensor must not combine alarm_battery with measure_battery');
    }

    for (const source of [driverCompose('climate_sensor'), appDriver('climate_sensor')]) {
      assertNotIncludesCI(source.zigbee.manufacturerName, '_TZE284_0ints6wl');
      assertNotIncludesCI(source.zigbee.manufacturerName, 'HOBEIAN');
      assertNotIncludesCI(source.zigbee.productId, 'ZG-303Z');
    }
  });

  it('routes known TS0041 four-endpoint remotes away from the one-button driver', () => {
    for (const source of [driverCompose('button_wireless_4_ts0041'), appDriver('button_wireless_4_ts0041')]) {
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_b4awzgct');
      assertIncludesAll(source.zigbee.manufacturerName, ['_tz3000_b4awzgct', '_TZ3000_b4awzgct', '_TZ3000_B4AWZGCT']);
      assert.deepStrictEqual(source.capabilities.slice(0, 4), ['button.1', 'button.2', 'button.3', 'button.4']);
    }

    for (const source of [driverCompose('button_wireless_1'), appDriver('button_wireless_1')]) {
      assertNotIncludesCI(source.zigbee.manufacturerName, '_TZ3000_b4awzgct');
    }
  });

  it('publishes exact flow cards used by button devices', () => {
    const appIds = appFlowTriggerIds();
    for (const { driverId, buttonCount } of [
      { driverId: 'button_wireless_1', buttonCount: 1 },
      { driverId: 'button_wireless_4', buttonCount: 4 },
      { driverId: 'button_wireless_4_ts0041', buttonCount: 4 }
    ]) {
      const composeIds = new Set((driverFlowCompose(driverId).triggers || []).map(trigger => trigger.id));
      const requiredIds = [
        `${driverId}_button_${buttonCount}gang_button_pressed`,
        `${driverId}_button_${buttonCount}gang_button_double_press`,
        `${driverId}_button_${buttonCount}gang_button_long_press`,
        `${driverId}_button_${buttonCount}gang_button_multi_press`,
        `${driverId}_battery_low`
      ];

      for (let button = 1; button <= buttonCount; button++) {
        for (const suffix of ['pressed', 'double', 'long', 'triple', 'release']) {
          requiredIds.push(`${driverId}_button_${buttonCount}gang_button_${button}_${suffix}`);
        }
      }

      for (const id of requiredIds) {
        assert(composeIds.has(id), `${driverId} driver.flow.compose.json missing ${id}`);
        assert(appIds.has(id), `app.json missing ${id}`);
      }

      const dupIds = [...appIds].filter(id => id.startsWith(`${driverId}_`) && /_dup_[a-z0-9]+$/.test(id));
      assert.deepStrictEqual(dupIds, [], `${driverId} must not publish duplicate-suffixed flow ids`);
    }
  });

  it('routes the Moes TS004F rotary knob away from generic 4-button remotes', () => {
    for (const source of [driverCompose('smart_knob_rotary'), appDriver('smart_knob_rotary')]) {
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_qja6nq5z');
      assertIncludesAll(source.zigbee.manufacturerName, ['_tz3000_qja6nq5z', '_TZ3000_qja6nq5z', '_TZ3000_QJA6NQ5Z']);
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_gwkzibhs');
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_ugi8ky6u');
    }

    for (const source of [driverCompose('button_wireless_4'), appDriver('button_wireless_4')]) {
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_kfu8zapd');
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_xabckq1v');
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_czuyt8lz');
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_b3mgfu0d');
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_rco1yzb1');
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_abrsvsou');
      assertIncludesCI(source.zigbee.manufacturerName, '_TZ3000_4fjiwweb');
      assertNotIncludesCI(source.zigbee.manufacturerName, '_TZ3000_qja6nq5z');
    }
    for (const source of [driverCompose('button_wireless_2'), appDriver('button_wireless_2')]) {
      assertNotIncludesCI(source.zigbee.manufacturerName, '_TZ3000_b3mgfu0d');
    }

    for (const source of [driverCompose('smart_remote_1_button'), appDriver('smart_remote_1_button')]) {
      assertNotIncludesCI(source.zigbee.manufacturerName, '_TZ3000_rco1yzb1');
    }

    const DeviceFingerprintDB = require('../../lib/DeviceFingerprintDB');
    for (const manufacturer of ['_TZ3000_kfu8zapd', '_TZ3000_xabckq1v', '_TZ3000_czuyt8lz', '_TZ3000_b3mgfu0d', '_TZ3000_rco1yzb1']) {
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS004F');
      assert.strictEqual(profile.driver, 'button_wireless_4', `${manufacturer} must use button_wireless_4 for TS004F`);
    }
    for (const manufacturer of ['_TZ3000_qja6nq5z', '_TZ3000_gwkzibhs', '_TZ3000_ugi8ky6u']) {
      const profile = DeviceFingerprintDB.lookup(manufacturer, 'TS004F');
      assert.strictEqual(profile.driver, 'smart_knob_rotary', `${manufacturer} must use smart_knob_rotary for TS004F`);
    }
  });

  it('keeps TS004F LevelControl physical actions wired for 4-button remotes', () => {
    for (const [endpointId, endpoint] of Object.entries(driverCompose('button_wireless_4').zigbee.endpoints)) {
      assert(endpoint.clusters.includes(8), `endpoint ${endpointId} must include LevelControl cluster 0x0008`);
    }

    const source = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_4/device.js'), 'utf8');
    assert.match(source, /_setupLevelControlDetection/);
    assert.match(source, /commandStep/);
    assert.match(source, /commandMove/);
    assert.match(source, /commandStop/);
    assert.match(source, /button_release/);
  });

  it('keeps TS004x ZCL battery value 200 as 100 percent for known remotes', () => {
    for (const manufacturer of [
      '_TZ3000_b4awzgct',
      '_TZ3000_yj6k7vfo',
      '_TZ3000_kfu8zapd',
      '_TZ3000_xabckq1v',
      '_TZ3000_czuyt8lz',
      '_TZ3000_b3mgfu0d',
      '_TZ3000_rco1yzb1',
      '_TZ3000_qja6nq5z',
      '_TZ3000_gwkzibhs',
    ]) {
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

    const ts0041Profile = UnifiedBatteryHandler.lookupBatteryProfile('', 'TS0041');
    assert.strictEqual(ts0041Profile.zcl200IsPercent, true, 'TS0041 product fallback should treat ZCL 200 as 100%');
    const ts0041Options = {
      batteryType: ts0041Profile.chemistry,
      treat200AsSentinel: !ts0041Profile.zcl200IsPercent,
    };
    assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(200, ts0041Options), 100);
    assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(150, ts0041Options), 75);
    assert.strictEqual(UnifiedBatteryHandler.normalizeZigbeeValue(255, ts0041Options), null);
  });
});
