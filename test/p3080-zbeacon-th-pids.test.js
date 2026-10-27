'use strict';
// P3080 (task:next-03 / item 16): Zbeacon TS0201/TS0202/TS0203 are ZCL temperature + humidity sensors
// (Z2M tuya.ts iHseno ZC-W1 fingerprint EP1 [0,3,1,32,1026,1029]; ZY-ZTH02 white label "Zbeacon"),
// so they belong to temphumidsensor_zcl_th01, not to the contact driver doorwindowsensor_4 (DS01 stays).
const assert = require('assert');
const dw4 = require('../drivers/doorwindowsensor_4/driver.compose.json').zigbee;
const th = require('../drivers/temphumidsensor_zcl_th01/driver.compose.json').zigbee;
describe('P3080 zbeacon temperature/humidity pids', () => {
  it('TS0201/TS0202/TS0203 live on temphumidsensor_zcl_th01 only', () => {
    for (const p of ['TS0201', 'TS0202', 'TS0203']) {
      assert.ok(th.productId.includes(p), p);
      assert.ok(!dw4.productId.includes(p), p);
    }
  });
  it('contact DS01 and TH01 keep their drivers', () => {
    assert.ok(dw4.productId.includes('DS01'));
    assert.ok(dw4.manufacturerName.includes('zbeacon'));
    assert.ok(th.productId.includes('TH01'));
  });
});
