'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const rd = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

describe('P3190 iwn0gpzz SPM01V2.5 moved climate_sensor -> power_meter', () => {
  it('no climate_sensor entry, power_meter has the 3 exact makers', () => {
    const c = rd('drivers/climate_sensor/driver.compose.json').zigbee.manufacturerName;
    const p = rd('drivers/power_meter/driver.compose.json').zigbee.manufacturerName;
    assert.ok(!c.some((m) => /iwn0gpzz/i.test(m)));
    for (const m of ['_TZE200_iwn0gpzz', '_TZE204_iwn0gpzz', '_TZE284_iwn0gpzz']) {assert.ok(p.includes(m), m);}
  });
  it('evidence recorded', () => {
    const e = rd('data/couple-removal-evidence.json').entries;
    assert.ok(e.some((x) => x.couple === '_TZE284_iwn0gpzz|TS0601' && x.driver === 'climate_sensor'));
  });
  it('device maps SPM01 DPs only for exact makers', () => {
    const src = fs.readFileSync(path.join(root, 'drivers/power_meter/device.js'), 'utf8');
    assert.ok(/_tze\(200\|204\|284\)_iwn0gpzz\$/.test(src));
    for (const dp of ['102:', '103:', '104:']) {assert.ok(src.includes(dp));}
    assert.ok(src.includes('clearInterval'));
  });
});
