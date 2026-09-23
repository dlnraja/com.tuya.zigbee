'use strict';

/**
 * P2704 — Bastien fleet reactivity Contre quoi
 *
 * Contre quoi:
 * - HOBEIAN+ZG-301Z / ltt60asa+TS0004 / fllyghyj+SNZB-02 not front-pinned → Homey Unknown
 * - HOBEIAN / ltt60asa missing snappyTx → Homey UI / Flow → relay lag (pace 15–50ms + 350ms retry)
 * Dual-app: BOTH (compose front-pin + snappy switch TX)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function compose(id) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', id, 'driver.compose.json'), 'utf8'));
}

describe('P2704 Bastien fleet snappy + house front-pin', () => {
  it('switch_1gang front-pins HOBEIAN + ZG-301Z', () => {
    const c = compose('switch_1gang');
    assert.match(String(c.zigbee.manufacturerName[0]), /HOBEIAN/i);
    assert.equal(c.zigbee.productId[0], 'ZG-301Z');
    assert.ok((c.zigbee.manufacturerName || []).length > 50, 'P2520: mfr must not shrink');
  });

  it('switch_4gang front-pins ltt60asa + TS0004', () => {
    const c = compose('switch_4gang');
    assert.match(String(c.zigbee.manufacturerName[0]), /ltt60asa/i);
    assert.equal(c.zigbee.productId[0], 'TS0004');
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /mmkbptmx/i.test(String(m))));
  });

  it('climate_sensor front-pins fllyghyj + SNZB-02 (+ eWeLink CK)', () => {
    const c = compose('climate_sensor');
    assert.match(String(c.zigbee.manufacturerName[0]), /fllyghyj/i);
    assert.equal(c.zigbee.productId[0], 'SNZB-02');
    assert.ok((c.zigbee.manufacturerName || []).some((m) => /^eWeLink$/i.test(String(m))));
    assert.ok((c.zigbee.productId || []).some((p) => /CK-TLSR8656-SS5-01\(7014\)/i.test(String(p))));
  });

  it('DEVICE_PROFILES: HOBEIAN + ltt60asa snappyTx', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /'HOBEIAN':\s*\{[\s\S]*?snappyTx:\s*true/);
    assert.match(src, /'_TZ3000_ltt60asa':\s*\{[\s\S]*?snappyTx:\s*true/);
    assert.match(src, /P2704_bastien_hobeian_fleet_snappy|P2704_bastien_ltt60asa_snappy/);
  });

  it('UnifiedSwitchBase paces with snappyTx (skip jitter / short retry)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSwitchBase.js'), 'utf8');
    assert.match(src, /snappyTx/);
    assert.match(src, /retryDelayMs:\s*snappy\s*\?\s*120/);
    assert.match(src, /enabled:\s*this\.gangCount\s*>\s*1\s*&&\s*!snappy/);
  });

  it('switch drivers wire snappy getDeviceProfile', () => {
    const s1 = fs.readFileSync(path.join(ROOT, 'drivers/switch_1gang/device.js'), 'utf8');
    const s4 = fs.readFileSync(path.join(ROOT, 'drivers/switch_4gang/device.js'), 'utf8');
    assert.match(s1, /snappyTx:\s*true/);
    assert.match(s4, /ltt60asa\|mmkbptmx\|liygxtcq/);
    assert.match(s4, /snappyTx:\s*true/);
  });
});
