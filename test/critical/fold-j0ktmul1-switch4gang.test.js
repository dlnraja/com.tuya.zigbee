'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
// 2026-10-11 fold: AutomatOn AUT000069 (_TZ3000_j0ktmul1 + TS011F) ships via switch_4gang with 5 gangs
// (GangCountAdapter). Dedicated valve_controller_5zone stays master-only / held from Athom payload.
const assert = require('assert');
const sw = require('../../drivers/switch_4gang/driver.compose.json');
const pat = require('../../lib/data/gang-patterns.json');
describe('fold j0ktmul1 -> switch_4gang', () => {
  it('couple is on switch_4gang with TS011F and 5-gang pattern', () => {
    assert.ok(sw.zigbee.manufacturerName.includes('_TZ3000_j0ktmul1'));
    assert.ok(sw.zigbee.productId.includes('TS011F'));
    assert.strictEqual(pat.couples['_tz3000_j0ktmul1|TS011F'], 5);
  });
});
