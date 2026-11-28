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

  it('ir_blaster includes _TZ3290_uc8lwbi2 (Z2M ZS06 TS1201) with case variants', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/ir_blaster/driver.compose.json'), 'utf8'));
    assert.ok(c.zigbee.productId.includes('TS1201'));
    assert.ok(c.zigbee.manufacturerName.includes('_TZ3290_uc8lwbi2'));
    assert.ok(c.zigbee.manufacturerName.includes('_tz3290_uc8lwbi2'));
  });
});
