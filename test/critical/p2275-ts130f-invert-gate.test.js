'use strict';

/**
 * P2275 — TS130F wall curtain invert + RX reporting (D011 / ZHA#5226)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const ROOT = path.join(__dirname, '..', '..');

describe('P2275 ol1uhvza TS130F invert + RX', () => {
  it('compose still locks ol1uhvza+TS130F on wall_curtain_switch', () => {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'wall_curtain_switch', 'driver.compose.json'), 'utf8'));
    assert.ok((j.zigbee.manufacturerName || []).some((m) => /ol1uhvza/i.test(m)));
    assert.ok((j.zigbee.productId || []).includes('TS130F'));
  });

  it('settings expose invert_position + backlight_mode', () => {
    const s = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'wall_curtain_switch', 'driver.settings.compose.json'), 'utf8'));
    const ids = [];
    for (const g of s) {
      for (const c of g.children || []) ids.push(c.id);
    }
    assert.ok(ids.includes('invert_position'));
    assert.ok(ids.includes('backlight_mode'));
  });

  it('device.js applies invert TX/RX and attr reporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers', 'wall_curtain_switch', 'device.js'), 'utf8');
    assert.ok(src.includes('_shouldInvertPosition'));
    assert.ok(src.includes('ol1uhvza'));
    assert.ok(src.includes('attr.currentPositionLiftPercentage'));
    assert.ok(src.includes('goToLiftPercentage'));
    assert.ok(src.includes('0x5000') || src.includes('backlightSwitch'));
  });

  it('fingerprint DB notes ZHA#5226 invert', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'DeviceFingerprintDB.js'), 'utf8');
    assert.ok(/ol1uhvza\|TS130F/.test(src));
    assert.ok(/5226|invert/i.test(src));
  });
});
