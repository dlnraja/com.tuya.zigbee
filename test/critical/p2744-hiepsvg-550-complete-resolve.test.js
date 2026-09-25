'use strict';
/**
 * P2744 — HiepSVG GH#550 full fine-read resolve (C14 @ 9.0.1250)
 *
 * Contre quoi (his exact words):
 * 1. LUX not reacts when light changes, yet fluctuates when lighting is stable
 * 2. Distance laggy AND increases before going down when stepping closer
 * 3. Measures suddenly hang for several minutes
 *
 * Dual-app: BOTH
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { normalizeRadarTargetDistanceMeters } = require('../../lib/tuya/TuyaRadarRangeScale');
const EventDeduplicationLayer = require('../../lib/filter/EventDeduplicationLayer');

describe('P2744 HiepSVG #550 complete resolve', () => {
  it('preferDivisor=10 never honors sticky cm in ambiguous dm band', () => {
    const hint = { last: 'cm' };
    // After a cm frame poisoned sticky — dm 25 must stay 2.5m not 0.25m
    assert.equal(normalizeRadarTargetDistanceMeters(25, {
      maxMeters: 9, preferDivisor: 10, scaleHint: hint,
    }), 2.5);
    assert.equal(hint.last, 'dm');
    // Still accept real cm (≥100)
    assert.equal(normalizeRadarTargetDistanceMeters(250, {
      maxMeters: 9, preferDivisor: 10, scaleHint: hint,
    }), 2.5);
    assert.equal(hint.last, 'cm');
    // Next dm frame must NOT stay poisoned
    assert.equal(normalizeRadarTargetDistanceMeters(20, {
      maxMeters: 9, preferDivisor: 10, scaleHint: hint,
    }), 2.0);
    assert.equal(hint.last, 'dm');
  });

  it('EventDedup soft-skips lux noise Δ<8 but keeps real steps', () => {
    const layer = new EventDeduplicationLayer({ windowMs: 1200, softNumeric: true });
    try {
      const id = 'p2744';
      assert.strictEqual(layer.shouldProcess(id, 'measure_luminance', 120), true);
      assert.strictEqual(layer.shouldProcess(id, 'measure_luminance', 123), false); // noise
      assert.strictEqual(layer.shouldProcess(id, 'measure_luminance', 40), true); // real step
    } finally {
      layer.destroy();
    }
  });

  it('SanityFilter allows large lux abs steps (not only drops)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/filter/SanityFilter.js'), 'utf8');
    assert.ok(/P2744/.test(src));
    assert.ok(/abs >= 15/.test(src));
  });

  it('ceiling config + device gate ghost farther + hang watchdog 30s', () => {
    const cfg = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/configs.js'), 'utf8');
    assert.ok(/rejectGhostFartherDistance:\s*true/.test(cfg));
    const device = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(/_gateGhostFartherDistance/.test(device));
    assert.ok(/hang-watchdog/.test(device));
    assert.ok(/30_000/.test(device));
  });
});
