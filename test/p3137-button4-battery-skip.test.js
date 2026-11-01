'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
describe('P3137 button_wireless_4 TS0044 skipBatteryReporting (ZHA #1746 / PR #2288)', () => {
  const src = fs.readFileSync(path.join(__dirname, '../drivers/button_wireless_4/device.js'), 'utf8');
  it('declares additive TS0044-only skipBatteryReporting', () => {
    assert.ok(/getDeviceProfile\(\)/.test(src));
    assert.ok(/'TS0044'/.test(src));
    assert.ok(/base\.skipBatteryReporting != null\) \{return base;\}/.test(src));
  });
});
