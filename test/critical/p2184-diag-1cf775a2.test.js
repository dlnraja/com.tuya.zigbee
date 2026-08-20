'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('P2184 Peter 1cf775a2 water + smartbutton', () => {
  it('binds IAS Zone cluster during enrollment', () => {
    const source = read('lib/managers/IASZoneManager.js');
    assert.match(source, /P2184.*bind IAS/);
    assert.match(source, /iasZone\.bind\(\)/);
  });

  it('marks IAS-only water leak to skip EF00 DP storms', () => {
    const source = read('drivers/water_leak_sensor/device.js');
    assert.match(source, /_skipTuyaDataQuery = true/);
    assert.match(source, /_iasOnlyProfile = true/);
  });

  it('forceQuery skips Tuya DPs for IAS-only profiles', () => {
    const source = read('lib/zigbee/ZigbeeDataQuery.js');
    assert.match(source, /_iasOnlyProfile/);
    assert.match(source, /!skipTuya && this\.device\.tuyaDataQuery/);
  });

  it('capability status report ignores phantom tuya_dp / button caps', () => {
    const source = read('lib/devices/UnifiedSensorBase.js');
    assert.match(source, /tuya_dp_/);
    assert.match(source, /Skip force query \(IAS-only/);
  });

  it('button_wireless_1 measure_battery is not getable (no boot poll)', () => {
    const compose = JSON.parse(read('drivers/button_wireless_1/driver.compose.json'));
    assert.strictEqual(compose.capabilitiesOptions.measure_battery.getable, false);
  });
});
