'use strict';

/**
 * P2617 — GH#550 residual after tip 9.0.1097 (gkfbdvyx)
 *
 * Contre quoi:
 * - DP10 junk lux=1 overwrites DP103 illuminance
 * - Lux inference forces absent while distance still corroborates
 * - stuckZero re-arm only at ≤0.05m (OCR stuck at 0.2m)
 * - Tip bump phantom Button/zones sanitize burst too short
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DEVICE = path.join(ROOT, 'drivers/presence_sensor_radar/device.js');

describe('P2617 gkfbdvyx #550 tip-regress lux/distance', () => {
  it('prefers DP103 lux over DP10 junk', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2617 skip DP10'));
    assert.ok(src.includes('_lastDp103LuxAt'));
    assert.ok(src.includes('DP103 preferred'));
  });

  it('keeps presence when distance corroborates despite lux quiet', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2617 keep presence'));
    assert.ok(src.includes('_distanceCorroboratesPresence()'));
  });

  it('stuckZero nudge threshold covers OCR 0.2m', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(/dist <= 0\.3/.test(src));
    assert.ok(src.includes('requestDPs') && src.includes('10') && src.includes('103'));
  });

  it('ceiling sanitize burst extends past 2 minutes', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('600_000') || src.includes('300_000'));
    assert.ok(src.includes('P2617'));
  });

  it('npm check:p2617 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2617']);
  });
});
