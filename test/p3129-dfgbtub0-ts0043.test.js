'use strict';
/* eslint-env mocha */
// P3129 (#585): _TZ3000_dfgbtub0 is a TS0043 3-button remote (Z2M Marmitek Push_LO) -> button_wireless_3.
const assert = require('assert');
const path = require('path');
const compose = require(path.join(__dirname, '..', 'drivers', 'button_wireless_3', 'driver.compose.json'));
const app = require(path.join(__dirname, '..', 'app.json'));
describe('P3129 _TZ3000_dfgbtub0|TS0043 in button_wireless_3', function () {
  it('compose lists the exact couple (canonical + lowercase)', function () {
    assert.ok(compose.zigbee.productId.includes('TS0043'));
    assert.ok(compose.zigbee.manufacturerName.includes('_TZ3000_dfgbtub0'));
    assert.ok(compose.zigbee.manufacturerName.includes('_tz3000_dfgbtub0'));
  });
  it('app.json is in sync', function () {
    const d = app.drivers.find((x) => x.id === 'button_wireless_3');
    assert.ok(d.zigbee.manufacturerName.includes('_TZ3000_dfgbtub0'));
  });
});
