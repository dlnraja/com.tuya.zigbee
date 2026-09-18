'use strict';

/**
 * P2600 — GH#547/#550 OCR residual (L99): lux OK / presence+distance dead
 *
 * Contre quoi:
 * - Anti-FP treats DP9-never-seen as empty bathroom → blocks presence
 * - DP104 motion_state clear wipes lux/DP1 presence while find_switch warms
 * - Native tuya.dataQuery alone — need EF00 requestDPs + forceActiveTuyaMode
 * - Lux cadence (tiny deltas) must soft-present while distance cold
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
const DB = path.join(ROOT, 'lib/tuya/TuyaSensorDatabase.js');

describe('P2600 gkfbdvyx #550 lux/distance residual', () => {
  it('forceActiveTuyaMode + EF00 requestDPs + lux nudge', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('forceActiveTuyaMode'));
    assert.ok(src.includes('_queryCeilingPresenceDps'));
    assert.ok(src.includes('_nudgeCeilingDistanceArmFromLux'));
    assert.ok(src.includes('_distanceSeenOnce'));
    assert.ok(src.includes('P2600'));
    assert.ok(src.includes('ignorePresenceClear'));
  });

  it('anti-FP allows presence while distance never seen', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('DP9 never received'));
    assert.ok(src.includes('!this._distanceSeenOnce'));
  });

  it('ceiling DP104 ignorePresenceClear', () => {
    const cfg = fs.readFileSync(CONFIGS, 'utf8');
    const idx = cfg.indexOf('ZY_M100_CEILING_24G');
    const block = cfg.slice(idx, idx + 3500);
    assert.match(block, /104:\s*\{[\s\S]*?ignorePresenceClear:\s*true/);
    const db = fs.readFileSync(DB, 'utf8');
    assert.ok(db.includes('ignorePresenceClear: true'));
  });

  it('inference lux cadence soft-present (P2600)', () => {
    const src = fs.readFileSync(INFER, 'utf8');
    assert.ok(src.includes('lux cadence → presence=true (P2600'));
    assert.ok(src.includes('_distanceSeenOnce'));
  });
});
