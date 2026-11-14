'use strict';
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { tuyaDpBool } = require('../../lib/tuya/tuyaDpBool');

const ROOT = path.join(__dirname, '..', '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function driversWith(needle) {
  const hits = [];
  for (const id of fs.readdirSync(path.join(ROOT, 'drivers'))) {
    const file = path.join(ROOT, 'drivers', id, 'driver.compose.json');
    if (!fs.existsSync(file)) {
      continue;
    }
    if (fs.readFileSync(file, 'utf8').toLowerCase().includes(needle.toLowerCase())) {
      hits.push(id);
    }
  }
  return hits;
}

describe('P3286 intake couples', () => {
  it('a one-byte open report is true, and an unknown report is not false', () => {
    assert.strictEqual(tuyaDpBool(Buffer.from([1])), true);
    assert.strictEqual(tuyaDpBool('true'), true);
    assert.strictEqual(tuyaDpBool(true), true);
    assert.strictEqual(tuyaDpBool(Buffer.from([0])), false);
    assert.strictEqual(tuyaDpBool('false'), false);
    assert.strictEqual(tuyaDpBool('nope'), null);
    const mixin = read('lib/mixins/PhysicalButtonMixin.js');
    assert.match(mixin, /tuyaDpBool\(value\)/);
    assert.doesNotMatch(mixin, /value === 1 \|\| value === true/);
  });

  it('FrankEver FK_V02 exposes DP102 and keeps DP9 and DP101 internal', () => {
    const src = read('drivers/water_valve_smart/device.js');
    assert.match(src, /102:\s*\{[^}]*capability:\s*'valve_position'/);
    assert.match(src, /requestAllDPs\(\{\s*readOnly:\s*true\s*\}\)/);
    assert.match(src, /9:\s*\{[^}]*capability:\s*null/);
    assert.match(src, /101:\s*\{[^}]*capability:\s*null/);
    const position = tuyaPosition(100);
    assert.strictEqual(position, 100);
    assert.strictEqual(tuyaPosition(0), 0);
    const cat = JSON.parse(read('lib/zigbee/data/unknown-dp-catalog.json'));
    const row = cat.caps['_tze200_1n2zev06|TS0601'];
    assert.deepStrictEqual(row, { onoff: 1, valve_position: 102 });
    const know = JSON.parse(read('data/dp_couple_knowledge.json'));
    const dps = know.couples['_TZE200_1n2zev06|TS0601'].dps;
    assert.strictEqual(dps['5'], undefined);
    assert.strictEqual(dps['7'], undefined);
    assert.strictEqual(dps['102'].capability, 'valve_position');
    assert.strictEqual(dps['9'].capability, null);
    assert.strictEqual(dps['101'].capability, null);
    const mgr = read('lib/tuya/TuyaEF00Manager.js');
    assert.match(mgr, /options\.readOnly/);
    assert.match(mgr, /DP1 not requested/);
  });

  it('the 6-gang couple stays only on button_wireless_6 and is sacred', () => {
    assert.deepStrictEqual(driversWith('_TZ3000_nrfkrgf4'), ['button_wireless_6']);
    const keep = JSON.parse(read('config/architecture/publish-sacred-keep-couples.json'));
    const pin = keep.couples.find((c) => c.mfr === '_TZ3000_nrfkrgf4' && c.pid === 'TS0046');
    assert.strictEqual(pin.driverId, 'button_wireless_6');
  });

  it('the TS011F plug is only on the energy monitor and that driver binds metering', () => {
    assert.deepStrictEqual(driversWith('_TZ3210_w0qqde0g'), ['plug_energy_monitor']);
    const compose = JSON.parse(read('drivers/plug_energy_monitor/driver.compose.json'));
    const clusters = compose.zigbee.endpoints['1'].clusters;
    assert.ok(clusters.includes(1794));
    assert.ok(clusters.includes(2820));
    const device = read('drivers/plug_energy_monitor/device.js');
    assert.match(device, /_TZ3210_w0qqde0g/);
    assert.match(device, /electrical: 0x0B04/);
    assert.match(device, /metering: 0x0702/);
  });

  it('the verified couples stay on their current drivers', () => {
    assert.deepStrictEqual(driversWith('_TZE200_fl8cuafl'), ['device_radiator_valve']);
    assert.deepStrictEqual(driversWith('_TZE284_gnpflcoq'), ['motion_sensor_radar_mmwave']);
    assert.deepStrictEqual(driversWith('_TZE284_9ern5sfh'), ['lcdtemphumidsensor_3']);
    assert.deepStrictEqual(driversWith('_TZE284_9em5sfh'), []);
    assert.ok(driversWith('_TZE2841000000_8se38w3c').includes('climate_sensor'));
    assert.deepStrictEqual(driversWith('_TZE284_vuwtqx0t'), ['water_valve_smart']);
    assert.deepStrictEqual(driversWith('_TZE284_z7a2jmyy'), ['water_valve_smart']);
    const climate = read('drivers/climate_sensor/device.js');
    assert.match(climate, /8se38w3c/);
    assert.match(climate, /38:\s*\{[^}]*measure_temperature\.probe/);
    const radar = read('drivers/motion_sensor_radar_mmwave/device.js');
    assert.match(radar, /DP102 = temp_compensate/);
    assert.doesNotMatch(radar, /gnpflcoq DP102 = fading_time/);
    const valve = read('drivers/water_valve_smart/device.js');
    assert.match(valve, /valve is DP13/);
    const lcd = read('drivers/lcdtemphumidsensor_3/device.js');
    assert.match(lcd, /currentTemperature: 1/);
    assert.match(lcd, /currentHumidity: 2/);
    assert.match(lcd, /batteryLevel: 4/);
  });
});

function tuyaPosition(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(n)));
}
