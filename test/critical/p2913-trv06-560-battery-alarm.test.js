'use strict';
// P2913 — #560 artisare 19/10: TRV06 _TZE200_rxq4iti9 has no battery % DP (Z2M TS0601_thermostat_3,
// DP35 errorOrBatteryLow only). The device must show alarm_battery and drop an empty measure_battery,
// re-adding it only if a real battery % DP arrives.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', '..', 'drivers', 'device_radiator_valve', 'device.js'), 'utf8');

test('TRV06 battery: alarm_battery at init, empty measure_battery dropped, lazy re-add on % DP', () => {
  assert.match(src, /async _alignTrv06Battery\(\)/);
  assert.match(src, /await this\._alignTrv06Battery\(\);/);
  assert.match(src, /addCapability\('alarm_battery'\)/);
  assert.match(src, /cur === null \|\| cur === undefined\) \{\s*await this\.removeCapability\('measure_battery'\)/);
  assert.match(src, /\[6, 13, 15\]\.includes\(Number\(dpId\)\) && this\._isNoHumidityTrv\(\) && !this\.hasCapability\('measure_battery'\)/);
});
