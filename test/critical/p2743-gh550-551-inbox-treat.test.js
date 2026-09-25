'use strict';
/**
 * P2743 — inbox treat GH#550 / #551 (2026-09-25)
 *
 * Contre quoi:
 * - GH#550 @ 9.0.1243: motion stays NO after stillness when DP9 barely moves
 *   (walk in place) — lux delta must re-arm alarm_motion while human YES
 * - SanityFilter lux drop must snap EMA (light-off lag)
 * - GH#551: button_wireless_3 invent pids TS0013/TS0215A re-inflate matrix;
 *   sacred couple is famkxci2+TS0043 only
 *
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2743 GH#550/#551 inbox treat', () => {
  it('ceiling config enables lux-based motion re-arm', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    assert.ok(/rearmMotionOnLuxDelta:\s*true/.test(src));
    assert.ok(/rearmMotionLuxDelta:\s*12/.test(src));
    const device = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(/_rearmMotionFromLuxDelta/.test(device));
    assert.ok(/P2743 re-arm motion/.test(device));
  });

  it('SanityFilter snaps EMA on lux drop', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/filter/SanityFilter.js'), 'utf8');
    assert.ok(/P2743/.test(src));
    assert.ok(/state\.ema\s*=\s*rawValue/.test(src));
  });

  it('button_wireless_3 locks famkxci2 to TS0043 only (no invent pids)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'));
    const pids = compose.zigbee.productId || [];
    assert.deepEqual(pids, ['TS0043']);
    const mfr = compose.zigbee.manufacturerName || [];
    assert.ok(mfr.some((m) => /famkxci2/i.test(m)));
    const keep = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'config/architecture/publish-sacred-keep-couples.json'), 'utf8'));
    const pin = (keep.couples || []).find((c) => /famkxci2/i.test(c.mfr || ''));
    assert.ok(pin, 'sacred-keep must pin famkxci2');
    assert.equal(String(pin.pid), 'TS0043');
    assert.equal(pin.driverId, 'button_wireless_3');
  });
});
