'use strict';

/**
 * P2600 — GH#547/#550 OCR residual (L99): lux OK / presence+distance dead
 *
 * Contre quoi:
 * - Anti-FP treats DP9-never-seen as empty bathroom → blocks presence
 * - Lux cadence (tiny deltas) must soft-present while distance cold
 * - Native tuya.dataQuery alone — need EF00 requestDPs + forceActiveTuyaMode
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const CONFIGS = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');
const INFER = path.join(ROOT, 'lib/sensors/IntelligentPresenceInference.js');

describe('P2600 gkfbdvyx #550 lux/distance residual', () => {
  it('forceActiveTuyaMode + EF00 requestDPs + lux nudge', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('forceActiveTuyaMode'));
    assert.ok(src.includes('_queryCeilingPresenceDps'));
    assert.ok(src.includes('_nudgeCeilingDistanceArmFromLux'));
    assert.ok(src.includes('_distanceSeenOnce'));
    assert.ok(src.includes('P2600'));
  });

  it('anti-FP allows presence while distance never seen', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('DP9 never received'));
    assert.ok(src.includes('!this._distanceSeenOnce'));
  });

  it('ceiling V3 lux DP103 + distance ÷10 (P2604 supersedes DP104 presence)', () => {
    const cfg = fs.readFileSync(CONFIGS, 'utf8');
    const idx = cfg.indexOf('ZY_M100_CEILING_24G');
    const block = cfg.slice(idx, idx + 4000);
    assert.ok(block.includes("103: { cap: 'measure_luminance', type: 'lux_direct' }"));
    assert.ok(block.includes("9: { cap: 'measure_luminance.distance', divisor: 10 }"));
    assert.ok(block.includes("104: { cap: null, internal: 'motion_state_v2_compat' }"));
    // P2618: DP10 must not paint lux
    assert.ok(/10:\s*\{\s*cap:\s*null/.test(block));
  });

  it('inference lux cadence soft-present (P2600)', () => {
    const src = fs.readFileSync(INFER, 'utf8');
    assert.ok(src.includes('lux cadence → presence=true (P2600'));
    assert.ok(src.includes('_distanceSeenOnce'));
  });
});
