'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('../_support/dual-runner');

const ROOT = path.resolve(__dirname, '../..');

describe('P3417 cross-source harvested fingerprints gate', () => {
  it('led_strip_rgbw includes _TZB210_tmi0rihb (JohanBendz #1585 TS0505B) with case variants', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/led_strip_rgbw/driver.compose.json'), 'utf8'));
    assert.ok(c.zigbee.productId.includes('TS0505B'));
    assert.ok(c.zigbee.manufacturerName.includes('_TZB210_tmi0rihb'));
    assert.ok(c.zigbee.manufacturerName.includes('_tzb210_tmi0rihb'));
  });

  it('ir_blaster_zs06 includes _TZ3290_uc8lwbi2 (Z2M ZS06 TS1201) with case variants', () => {
    // P3422: moved from ir_blaster to the exact-pair ZS06 driver (TS1201 only, same runtime).
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/ir_blaster_zs06/driver.compose.json'), 'utf8'));
    const ir = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/ir_blaster/driver.compose.json'), 'utf8'));
    assert.ok(c.zigbee.productId.includes('TS1201'));
    assert.ok(c.zigbee.manufacturerName.includes('_TZ3290_uc8lwbi2'));
    assert.ok(c.zigbee.manufacturerName.includes('_tz3290_uc8lwbi2'));
    assert.ok(!ir.zigbee.manufacturerName.includes('_TZ3290_uc8lwbi2'), 'one couple, one driver');
  });
});
