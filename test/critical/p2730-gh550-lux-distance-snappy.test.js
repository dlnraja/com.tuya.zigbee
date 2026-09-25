'use strict';
/**
 * P2730 — GH#550 residual @ 9.0.1243 (gkfbdvyx lux lag + distance dip)
 *
 * Contre quoi:
 * - SanityFilter ROC discarded lux drops (light-off lag) and distance @ >5m/s
 * - dm↔cm flip mid-walk made distance decrease then increase
 * - motion re-arm threshold 0.15m missed small moves
 *
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SanityFilter = require('../../lib/filter/SanityFilter');
const { normalizeRadarTargetDistanceMeters } = require('../../lib/tuya/TuyaRadarRangeScale');

describe('P2730 GH#550 lux/distance snappy', () => {
  it('SanityFilter allows large lux drop within 100ms (light-off)', () => {
    const sf = new SanityFilter({});
    const id = 'p2730-lux';
    assert.strictEqual(sf.filter(id, 'measure_luminance', 647), 647);
    const out = sf.filter(id, 'measure_luminance', 50);
    assert.strictEqual(out, 50, `expected 50 got ${out} (ROC must not pin last lux)`);
  });

  it('SanityFilter distance ROC allows 0.6m @ 100ms (walk-away)', () => {
    const sf = new SanityFilter({});
    const id = 'p2730-dist';
    assert.ok(sf.filter(id, 'measure_luminance.distance', 2.0) === 2.0);
    const out = sf.filter(id, 'measure_luminance.distance', 2.6);
    assert.strictEqual(out, 2.6);
  });

  it('distance scale hysteresis sticks dm then cm', () => {
    const hint = { last: null };
    const a = normalizeRadarTargetDistanceMeters(30, { preferDivisor: 10, maxMeters: 9, scaleHint: hint });
    assert.strictEqual(a, 3);
    assert.strictEqual(hint.last, 'dm');
    // Ambiguous 40 with sticky dm → 4.0 not 0.4
    const b = normalizeRadarTargetDistanceMeters(40, { preferDivisor: 10, maxMeters: 9, scaleHint: hint });
    assert.strictEqual(b, 4);
    assert.strictEqual(hint.last, 'dm');
  });

  it('ceiling config snappier motion thresholds', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    assert.ok(/rearmMotionDistanceDeltaM:\s*0\.08/.test(src));
    assert.ok(/motionThrottleMs:\s*1000/.test(src));
    assert.ok(/motionDebounceMs:\s*400/.test(src));
  });

  it('#551 famkxci2 still front-pinned on button_wireless_3 without IAS clusters', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/button_wireless_3/driver.compose.json'), 'utf8'));
    const mfrs = compose.zigbee.manufacturerName || [];
    assert.ok(mfrs[0].toLowerCase().includes('famkxci2'));
    const ep1 = compose.zigbee.endpoints['1'].clusters;
    assert.ok(!ep1.includes(1280) && !ep1.includes(1281));
    const pids = compose.zigbee.productId || [];
    assert.ok(pids.includes('TS0043'));
    // Contre quoi invent: never TS0601 on scene remote (EF00 curtains/radar bleed)
    assert.ok(!pids.includes('TS0601'));
  });
});
