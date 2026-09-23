'use strict';

/**
 * P2704 — Bastien fleet reactivity Contre quoi (BOTH tracks)
 *
 * Contre quoi:
 * - HOBEIAN+ZG-301Z / ltt60asa+TS0004 / fllyghyj+SNZB-02 not front-pinned → Homey Unknown
 * - HOBEIAN / ltt60asa missing snappyTx → Homey UI / Flow → relay lag
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2704 fleet snappy + house front-pin (BOTH)', () => {
  it('switch_1gang front-pins HOBEIAN + ZG-301Z', () => {
    const c = compose('switch_1gang');
    assert.match(String(c.zigbee.manufacturerName[0]), /HOBEIAN/i);
    assert.equal(c.zigbee.productId[0], 'ZG-301Z');
  });

  it('switch_4gang front-pins ltt60asa + TS0004', () => {
    const c = compose('switch_4gang');
    assert.match(String(c.zigbee.manufacturerName[0]), /ltt60asa/i);
    assert.equal(c.zigbee.productId[0], 'TS0004');
  });

  it('climate_sensor front-pins fllyghyj + SNZB-02', () => {
    const c = compose('climate_sensor');
    assert.match(String(c.zigbee.manufacturerName[0]), /fllyghyj/i);
    assert.equal(c.zigbee.productId[0], 'SNZB-02');
  });

  it('DEVICE_PROFILES + UnifiedSwitchBase snappyTx', () => {
    const mixin = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    const usb = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSwitchBase.js'), 'utf8');
    assert.match(mixin, /'HOBEIAN':\s*\{[\s\S]*?snappyTx:\s*true/);
    assert.match(mixin, /'_TZ3000_ltt60asa':\s*\{[\s\S]*?snappyTx:\s*true/);
    assert.match(usb, /retryDelayMs:\s*snappy\s*\?\s*120/);
  });
});
