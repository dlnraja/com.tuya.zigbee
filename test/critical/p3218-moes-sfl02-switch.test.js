'use strict';
// WHY(P3218): Moes SFL02 (zhc moes.ts) is a TS0601 DP1 1-gang switch; it sat on climate_sensor.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const ids = ['_TZE200_stvgmdjz', '_TZE284_stvgmdjz', '_TZE200_ydkqbmpt', '_TZE200_z3u99qxt'];
describe('P3218 Moes SFL02 on switch_1gang only', () => {
  const sw = require(path.join(ROOT, 'drivers/switch_1gang/driver.compose.json')).zigbee;
  const cs = require(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json')).zigbee.manufacturerName.map((m) => m.toLowerCase());
  it('switch_1gang lists canonical + lower forms with TS0601', () => {
    assert.ok(sw.productId.includes('TS0601'));
    for (const m of ids) {assert.ok(sw.manufacturerName.includes(m) && sw.manufacturerName.includes(m.toLowerCase()), m);}
  });
  it('climate_sensor no longer lists them', () => {
    for (const m of ids) {assert.ok(!cs.includes(m.toLowerCase()), m);}
  });
});
