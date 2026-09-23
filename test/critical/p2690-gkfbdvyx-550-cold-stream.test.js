'use strict';

/**
 * P2690 — GH#550 residual @ 9.0.1145 (gkfbdvyx)
 *
 * Contre quoi:
 * - Lux+distance cold while DP1 alarms still move → lux-only nudge never fires
 * - Poll only requestDPs without re-arming DP101 find_switch
 * - Cold-stream watchdog absent
 *
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');

describe('P2690 gkfbdvyx #550 cold-stream lux/distance', () => {
  it('arms cold-stream watchdog + cold detection helpers', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('_armCeilingColdStreamWatchdog'));
    assert.ok(src.includes('_ceilingStreamsAreCold'));
    assert.ok(src.includes('P2690'));
    assert.ok(src.includes('_lastLuxPaintAt'));
    assert.ok(src.includes('_lastDistancePaintAt'));
  });

  it('poll re-arms find_switch when streams are cold', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    const idx = src.indexOf('async _requestDPRefresh');
    assert.ok(idx > 0);
    const block = src.slice(idx, idx + 900);
    assert.ok(block.includes('_ceilingStreamsAreCold'));
    assert.ok(block.includes('poll-cold'));
    assert.ok(block.includes('_nudgeCeilingDistanceArmFromLux'));
  });

  it('presence DP1 nudges when find_switch family is cold', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes("presence-cold"));
    assert.ok(/cold\|poll/.test(src) || src.includes('cold|poll'));
  });

  it('npm check:p2690 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2690']);
  });
});
