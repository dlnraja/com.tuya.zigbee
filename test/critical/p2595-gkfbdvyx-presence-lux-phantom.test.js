'use strict';

/**
 * P2595 — GH#547/#550 HiepSVG gkfbdvyx: lux OK, presence/distance dead + phantom onoff
 *
 * Contre quoi:
 * - DP9 smartDivisor → wrong scale (Z2M ZY-M100-24GV3 uses ÷10)
 * - unreliable DP1 ignored forever when DP9 null (no lux corroboration)
 * - mainsPowered keepRelay keeps Channel 1 / Button 1 → Missing capability Listener
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

describe('P2595 gkfbdvyx presence dead + phantom onoff', () => {
  it('ZY_M100_CEILING_24G locks DP9 ÷10 and hasRelay false', () => {
    const src = fs.readFileSync(CONFIGS, 'utf8');
    assert.ok(src.includes('P2595'));
    assert.ok(src.includes('hasRelay: false'));
    assert.ok(src.includes('syncPresenceFromLuxInference: true'));
    const idx = src.indexOf('ZY_M100_CEILING_24G');
    assert.ok(idx > 0);
    const block = src.slice(idx, idx + 2500);
    assert.match(block, /9:\s*\{\s*cap:\s*'measure_luminance\.distance',\s*divisor:\s*10\s*\}/);
    assert.ok(!/9:\s*\{\s*cap:\s*'measure_luminance\.distance',\s*smartDivisor:\s*true/.test(block));
  });

  it('DynCap strips onoff/button for gkfbdvyx (not keep via mainsPowered)', () => {
    const src = fs.readFileSync(DEVICE, 'utf8');
    assert.ok(src.includes('P2595'));
    assert.ok(src.includes('noRelayCeiling'));
    assert.ok(src.includes("staleCaps.push('onoff', 'button.1', 'button')"));
    assert.ok(src.includes('syncPresenceFromLuxInference'));
    assert.ok(src.includes('allow strip'));
    // Contre quoi: old keepRelay = mainsPowered alone on onoff remove
    assert.ok(!/keepRelay\s*=\s*cfg\.hasRelay\s*===\s*true\s*\|\|\s*this\.mainsPowered\s*===\s*true/.test(src));
  });

  it('inference corroborates unreliable DP1 with lux rate', () => {
    const src = fs.readFileSync(INFER, 'utf8');
    assert.ok(src.includes('P2595'));
    assert.ok(src.includes('corroborated by lux rate'));
  });

  it('TuyaSensorDatabase gkfbdvyx DP9 ÷10', () => {
    const src = fs.readFileSync(DB, 'utf8');
    assert.ok(src.includes("gkfbdvyx"));
    assert.match(src, /ZY_M100_CEILING_24G[\s\S]*?9:\s*\{\s*cap:\s*'measure_luminance\.distance',\s*divisor:\s*10\s*\}/);
  });
});
