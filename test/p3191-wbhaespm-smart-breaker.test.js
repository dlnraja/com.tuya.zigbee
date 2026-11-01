'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

describe('P3191 wbhaespm SUTON STB3L-125-ZJ moved climate_sensor -> smart_breaker', () => {
  it('moved per exact maker with evidence', () => {
    const c = rd('drivers/climate_sensor/driver.compose.json').zigbee.manufacturerName;
    const b = rd('drivers/smart_breaker/driver.compose.json').zigbee.manufacturerName;
    assert.ok(!c.some((m) => /wbhaespm/i.test(m)));
    for (const m of ['_TZE200_wbhaespm', '_TZE204_wbhaespm', '_TZE284_wbhaespm']) {assert.ok(b.includes(m), m);}
    assert.ok(rd('data/couple-removal-evidence.json').entries.some((x) => x.couple === '_TZE204_wbhaespm|TS0601'));
  });
  it('maps DP1 energy, DP9 faults, DP16 switch and phase structs for exact makers', () => {
    const src = fs.readFileSync(path.join(root, 'drivers/smart_breaker/device.js'), 'utf8');
    const re = /_isSutonStb3l\(\) \{\s*return (\/.*\/)\.test/.exec(src);
    assert.ok(re);
    const rx = new RegExp(re[1].slice(1, -1));
    assert.ok(rx.test('_tze204_wbhaespm') && !rx.test('_tze204_wbhaespmx'));
    assert.ok(src.includes('this._isZbnDj63() || this._isSutonStb3l()'));
    const blk = src.slice(src.indexOf('if (this._isSutonStb3l())'), src.indexOf('TOWSMR1-40 RCBO uses'));
    for (const t of ["1: { capability: 'meter_power', divisor: 100 }", '9:', "16: { capability: 'onoff'"]) {assert.ok(blk.includes(t), t);}
  });
});
