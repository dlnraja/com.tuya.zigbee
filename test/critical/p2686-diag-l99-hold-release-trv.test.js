'use strict';

/**
 * P2686 — L99 new diags 2026-09-22
 * Contre quoi:
 *  - Bastien 885a9901: TS0042 single press invents button_N_release ghost + battery TX lag
 *  - Universal 9a2f232b: _TZE200_p3dbf6qs+TS0601 Unknown (Athom compact drop)
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2686 L99 diag hold-release + TRV sacred-keep', () => {
  it('dzwgk7e2 / vsxvaj9i skip software HOLD-RELEASE + skipBatteryReporting', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.match(src, /'_TZ3000_dzwgk7e2'\s*:\s*\{[\s\S]*?skipSoftwareHoldRelease:\s*true/);
    assert.match(src, /'_TZ3000_dzwgk7e2'\s*:\s*\{[\s\S]*?skipBatteryReporting:\s*true/);
    assert.match(src, /'_TZ3000_vsxvaj9i'\s*:\s*\{[\s\S]*?skipSoftwareHoldRelease:\s*true/);
    assert.match(src, /'_TZ3000_vsxvaj9i'\s*:\s*\{[\s\S]*?skipBatteryReporting:\s*true/);
  });

  it('ButtonDevice cancels stale hold timers and skips invent release on scene remotes', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.match(src, /P2686 skip software release/);
    assert.match(src, /cancel stale invent timers on ANY new press/);
    assert.match(src, /skipSoftwareHoldRelease/);
  });

  it('sacred-keep pins p3dbf6qs+TS0601 TRV couples', () => {
    const keep = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    const pins = (keep.couples || []).filter((c) => /p3dbf6qs/i.test(c.mfr) && c.pid === 'TS0601');
    assert.ok(pins.some((c) => c.mfr === '_TZE200_p3dbf6qs' && c.driverId === 'radiator_valve'));
    assert.ok(pins.some((c) => c.mfr === '_TZE284_p3dbf6qs'));
  });

  it('radiator_valve compose keeps TZE200_p3dbf6qs + TS0601', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/radiator_valve/driver.compose.json'), 'utf8'));
    assert.ok((c.zigbee.manufacturerName || []).includes('_TZE200_p3dbf6qs'));
    assert.ok((c.zigbee.productId || []).includes('TS0601'));
  });

  // WHY(P2697): enrich reorder buried p3 at idx~99 — compact could drop before sacred-keep
  it('radiator_valve front-pins p3dbf6qs case forms', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/radiator_valve/driver.compose.json'), 'utf8'));
    const head = (c.zigbee.manufacturerName || []).slice(0, 4).map((s) => String(s).toLowerCase());
    assert.ok(head.every((m) => m.includes('p3dbf6qs')), 'p3dbf6qs case forms front-pinned');
    assert.equal(c.zigbee.productId[0], 'TS0601');
  });

  it('device_radiator_valve unions TZE200_p3dbf6qs (complementary)', () => {
    const c = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/device_radiator_valve/driver.compose.json'), 'utf8'));
    const m = c.zigbee.manufacturerName || [];
    assert.ok(m.includes('_TZE200_p3dbf6qs'));
    assert.ok(m.includes('_TZE284_p3dbf6qs'));
  });
});
