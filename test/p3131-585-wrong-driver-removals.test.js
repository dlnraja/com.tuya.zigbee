'use strict';
/* eslint-env mocha */
// P3131 (#585, approved t709u): each mfr leaves only its wrong driver and stays on its right one (Z2M tuya.ts).
const assert = require('assert');
const path = require('path');
const zig = (d) => require(path.join(__dirname, '..', 'drivers', d, 'driver.compose.json')).zigbee;
const has = (d, m) => zig(d).manufacturerName.some((x) => x.toLowerCase() === m);
const cases = [
  ['_tz3000_46vasa5h', 'double_power_point_2', 'switch_1gang'],
  ['_tz3000_cehuw1lw', 'smartplug', 'button_wireless_plug'],
  ['_tze284_xpq2rzhq', 'presence_sensor_radar', 'climate_sensor'],
  ['_tz3000_dfgbtub0', 'button_wireless_2', 'button_wireless_3'],
];
describe('P3131 #585 wrong-driver couples removed, right driver kept', function () {
  for (const [m, right, wrong] of cases) {
    it(`${m}: on ${right}, not on ${wrong}`, function () {
      assert.ok(has(right, m));
      assert.ok(!has(wrong, m));
    });
  }
  it('app.json follows compose', function () {
    const app = require(path.join(__dirname, '..', 'app.json'));
    const d = app.drivers.find((x) => x.id === 'climate_sensor');
    assert.ok(!d.zigbee.manufacturerName.some((x) => x.toLowerCase() === '_tze284_xpq2rzhq'));
  });
});
