'use strict';

/**
 * P2597 — GH#547/#550 HiepSVG: lux OK / distance null / Missing onoff listener
 *
 * Contre quoi (Z2M ZY-M100-24GV3 + L99):
 * - DP101 find_switch OFF → DP9 never reports (distance forever null)
 * - lux→presence gates too strict for ambient flood while find_switch warms
 * - compose onoff without listener → "Missing capability Listener: onoff"
 * - MTG 24G detection_range <2.5m left unclamped (Z2M#24831)
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CONFIGS = path.join(ROOT, 'drivers/presence_sensor_radar/configs.js');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');
const INFER = path.join(ROOT, 'lib/sensors/IntelligentPresenceInference.js');
const DB = path.join(ROOT, 'lib/tuya/TuyaSensorDatabase.js');

describe('P2597 gkfbdvyx find_switch + lux warm + phantom onoff soft', () => {
  it('ceiling config auto-enables DP101 find_switch', () => {
    const src = fs.readFileSync(CONFIGS, 'utf8');
    assert.ok(src.includes('P2597'));
    assert.ok(src.includes('enableFindSwitchOnBoot: true'));
    assert.ok(src.includes('autoEnableFindSwitch: true'));
    const idx = src.indexOf('ZY_M100_CEILING_24G');
    const block = src.slice(idx, idx + 3200);
    assert.match(block, /101:\s*\{[\s\S]*?autoEnableFindSwitch:\s*true/);
    assert.ok(block.includes('luxPresenceRateThreshold: 3'));
  });

  it('device schedules find_switch ON + soft phantom onoff listener', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_ensureCeilingFindSwitchOn'));
    assert.ok(src.includes('_scheduleCeilingFindSwitchEnable'));
    assert.ok(src.includes('_registerPhantomRelaySoftListeners'));
    assert.ok(src.includes('P2597 enabling DP101 find_switch'));
    assert.ok(src.includes('mtg24gMinDetectionRangeM'));
    assert.ok(src.includes('clamp detection_range'));
  });

  it('inference applies lux tuning + abs-delta motion (P2597)', () => {
    const src = fs.readFileSync(INFER, 'utf8');
    assert.ok(src.includes('applyRadarConfigTuning'));
    assert.ok(src.includes('luxPresenceMinAbsDelta'));
    assert.ok(src.includes('P2597 find_switch warm'));
  });

  it('TuyaSensorDatabase mirrors find_switch auto-enable', () => {
    const src = fs.readFileSync(DB, 'utf8');
    assert.ok(src.includes('enableFindSwitchOnBoot: true'));
    assert.match(src, /101:\s*\{[^}]*autoEnableFindSwitch:\s*true/);
  });
});
