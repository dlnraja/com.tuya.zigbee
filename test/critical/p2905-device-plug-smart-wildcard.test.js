'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
// P2905: device_plug_smart keeps only plug-type wildcards; sensor wildcards live on class-correct pid-only fallbacks.
const assert = require('assert');
const path = require('path');
const R = (id) => require(path.join(__dirname, '..', '..', 'drivers', id, 'driver.compose.json')).zigbee;
const SENSOR = ['RH3052','SM0201','TH01','THS317-ET','WSDCGQ01LM','WSDCGQ11LM','WSDCGQ12LM','lumi.sensor_ht','lumi.sensor_ht.agl02','lumi.weather','TS0201','TY0201'];
describe('P2905 device_plug_smart wildcard policy', () => {
  const plug = R('device_plug_smart');
  it('plug keeps plug-type wildcard fallbacks', () => {
    for (const p of ['TS011F','TS0101','TS0049']) assert.ok(plug.productId.includes(p), p);
  });
  it('P3038: TS0601 wildcard dropped (owner yes 25/10, #576)', () => {
    assert.ok(!plug.productId.includes('TS0601'));
  });
  it('no sensor pid wildcard on the socket driver', () => {
    for (const p of [...SENSOR,'TS0202']) assert.ok(!plug.productId.includes(p), p);
  });
  it('sensor wildcards re-homed (coverage kept)', () => {
    const lcd = R('sensor_lcdtemphumidsensor_temphumidsensor');
    assert.deepStrictEqual(lcd.manufacturerName, []);
    for (const p of SENSOR) assert.ok(lcd.productId.includes(p), p);
    const pir = R('pirsensor');
    assert.deepStrictEqual(pir.manufacturerName, []);
    assert.ok(pir.productId.includes('TS0202'));
  });
  it('native clusters exposed', () => {
    for (const c of [0,6,1794,2820]) assert.ok(plug.endpoints['1'].clusters.includes(c), c);
    const lcd = R('sensor_lcdtemphumidsensor_temphumidsensor');
    for (const c of [1,1026,1029]) assert.ok(lcd.endpoints['1'].clusters.includes(c), c);
  });
});
