'use strict';

/**
 * P2598 — Michaelp #2253 residual: me167 DP4/5 ÷10 + live profile TX
 *
 * Contre quoi:
 * - smartDivisor on me167 DP4/5 leaves tenths as °C / looks empty-wrong
 * - closed-over dpProfile at listener register time sticks standard DP3 TX
 * Dual-app: BOTH · Forum: silent only
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TRV = path.join(ROOT, 'drivers/device_radiator_valve/device.js');
const SMART = path.join(ROOT, 'drivers/device_radiator_valve_smart/device.js');

describe('P2598 Michaelp #2253 me167 ÷10 + live profile', () => {
  it('me167 DP4/5 use divisor 10 (not smartDivisor)', () => {
    const src = fs.readFileSync(TRV, 'utf8');
    assert.ok(src.includes('P2598'));
    const idx = src.indexOf("if (this.dpProfile === 'me167')");
    assert.ok(idx > 0);
    const block = src.slice(idx, idx + 1800);
    assert.match(block, /4:\s*\{\s*capability:\s*'target_temperature',\s*divisor:\s*10\s*\}/);
    assert.match(block, /5:\s*\{\s*capability:\s*'measure_temperature',\s*divisor:\s*10\s*\}/);
    assert.ok(!/4:\s*\{\s*capability:\s*'target_temperature',\s*smartDivisor:\s*true/.test(block));
  });

  it('setpoint listener reads live this.dpProfile', () => {
    const src = fs.readFileSync(TRV, 'utf8');
    assert.ok(src.includes('never close over a stale profile'));
    assert.ok(src.includes("const dp = this.dpProfile === 'me167' ? 4 : 3"));
    assert.ok(src.includes('P2598 endDeviceAnnounce'));
  });

  it('smart TRV mirrors ÷10 + live profile', () => {
    const src = fs.readFileSync(SMART, 'utf8');
    assert.ok(src.includes('P2598'));
    assert.match(src, /4:\s*\{\s*capability:\s*'target_temperature',\s*divisor:\s*10\s*\}/);
    assert.ok(src.includes("const dp = this.dpProfile === 'me167' ? 4 : 3"));
  });
});
