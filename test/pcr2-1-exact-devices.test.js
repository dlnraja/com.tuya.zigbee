'use strict';
/* eslint-env mocha */
// PCr2-1: non-Tuya devices from zigbee-herdsman-converters placed in drivers that already speak their clusters.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const zb = (d) => JSON.parse(fs.readFileSync(path.join(root, 'drivers', d, 'driver.compose.json'), 'utf8')).zigbee;

describe('PCr2-1 exact devices', () => {
  it('SONOFF MINI-ZBRBS roller shutter -> curtain_module (standard Window Covering 0x0102)', () => {
    const z = zb('curtain_module');
    assert.ok(z.manufacturerName.includes('SONOFF') && z.productId.includes('MINI-ZBRBS'));
    assert.ok(z.endpoints['1'].clusters.includes(258));
  });
  it('HEIMAN RC-EF-3.0 remote -> button_emergency_sos (IAS ACE emergency)', () => {
    const z = zb('button_emergency_sos');
    assert.ok(z.manufacturerName.includes('HEIMAN') && z.productId.includes('RC-EF-3.0'));
    assert.ok(z.endpoints['1'].clusters.includes(1281));
  });
  it('the HEIMAN cartesian overlap with universal_zigbee is a reviewed exception (nothing removed)', () => {
    const rev = JSON.parse(fs.readFileSync(path.join(root, 'data/native-matrix-reviewed-duals.json'), 'utf8')).entries;
    assert.ok(rev.some((e) => e.couple === 'HEIMAN|RC-EF-3.0'));
    assert.ok(zb('universal_zigbee').manufacturerName.includes('HEIMAN'));
  });
});
