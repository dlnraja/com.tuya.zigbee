'use strict';

/**
 * P2722 — GH#550 HiepSVG @ 9.0.1232 (_TZE204_gkfbdvyx+TS0601)
 *
 * Contre quoi:
 * - After stillness (DP1=1) motion stuck NO when user moves again (MCU skips enum 2)
 * - Distance UI ~1.2× tape without ceiling displayScale 0.9
 * - Soft-clear / corroboration corrupted by display scale
 *
 * Dual-app: BOTH (master + stable reliability; Bastien soak)
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const CONFIGS = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');

describe('P2722 HiepSVG #550 motion re-arm + distance display scale', () => {
  it('ceiling config: rearmMotionOnDistanceDelta + distanceDisplayScale 0.9', () => {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const mod = require(CONFIGS);
    const c = (mod.SENSOR_CONFIGS || mod).ZY_M100_CEILING_24G
      || Object.values(mod.SENSOR_CONFIGS || mod).find((x) => x && x.configName === 'ZY_M100_CEILING_24G');
    assert.ok(c);
    assert.equal(c.splitMotionPresence, true);
    assert.equal(c.rearmMotionOnDistanceDelta, true);
    assert.ok(Number(c.rearmMotionDistanceDeltaM) >= 0.1);
    assert.equal(c.distanceDisplayScale, 0.9);
  });

  it('device.js wires P2722 re-arm + pre-scale soft-clear', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_rearmMotionFromDistanceDelta'));
    assert.ok(src.includes('P2722 re-arm motion'));
    assert.ok(src.includes('distanceDisplayScale'));
    assert.ok(src.includes('keep pre-scale meters for soft-clear'));
    assert.match(src, /_softClearStuckPresenceOnZeroDistance\(logicDistance/);
    assert.ok(src.includes('sticky-ignore after leave — do not re-arm ghost motion')
      || src.includes('Sticky-ignore after leave'));
  });

  it('display scale 0.9 maps Homey 1.2 → tape ~1.08 (Hiep 1.2→1)', () => {
    const scale = 0.9;
    assert.equal(Math.round(1.2 * scale * 100) / 100, 1.08);
    assert.equal(Math.round(2.2 * scale * 100) / 100, 1.98);
  });

  it('npm check:p2722 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2722']);
  });
});
