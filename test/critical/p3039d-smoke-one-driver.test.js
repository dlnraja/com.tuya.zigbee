'use strict';
// P3039d: one couple, one driver. _TZE200_yh7aoahi|TS0205 was on smoke_sensor and smoke_sensor3; it now stays
// on smoke_sensor only, which also carries its TS0601 couple (Z2M TS0601_smoke_4). Move, not a removal.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');
const read = (id) => JSON.parse(fs.readFileSync(path.join(__dirname, '../../drivers', id, 'driver.compose.json'), 'utf8'));
const has = (c, m) => c.zigbee.manufacturerName.some((x) => x.toLowerCase() === m);

describe('P3039d yh7aoahi smoke one driver', () => {
  it('smoke_sensor keeps _TZE200_yh7aoahi with TS0205 and TS0601', () => {
    const c = read('smoke_sensor');
    assert.ok(has(c, '_tze200_yh7aoahi'));
    assert.ok(c.zigbee.productId.includes('TS0205') && c.zigbee.productId.includes('TS0601'));
  });
  it('smoke_sensor3 no longer duplicates it', () => {
    assert.ok(!has(read('smoke_sensor3'), '_tze200_yh7aoahi'));
  });
});
