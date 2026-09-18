'use strict';

/**
 * P2601 — Fleet residual after P2600 tip: mains forceActive DataQuery + DP9 ÷10 SSOT
 *
 * Contre quoi:
 * - UnifiedSensorBase skipped periodic DataQuery for mains → ceiling DP1/9 cold
 * - SensorConfigs gkfbdvyx DP9 still ÷100 while driver/Z2M use ÷10
 * - Phantom onoff listener registered too late (Missing Listener during base init)
 * Dual-app: BOTH
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2601 mains forceActive query + gkfbdvyx DP9 ÷10', () => {
  it('UnifiedSensorBase starts periodic query when forceActiveTuyaMode', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
    assert.ok(src.includes('forceActiveTuyaMode === true'));
    assert.ok(src.includes('P2601'));
  });

  it('SensorConfigs gkfbdvyx DP9 divisor 10 + find_switch flags', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/data/SensorConfigs.js'), 'utf8');
    const idx = src.indexOf("'_TZE204_gkfbdvyx'");
    assert.ok(idx > 0);
    const block = src.slice(idx, idx + 1800);
    assert.match(block, /9:\s*\{\s*cap:\s*'measure_luminance\.distance',\s*divisor:\s*10/);
    assert.ok(block.includes('enableFindSwitchOnBoot: true'));
    assert.ok(block.includes('syncPresenceFromLuxInference: true'));
  });

  it('phantom onoff soft listeners armed before super.onNodeInit', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    const pre = src.indexOf('_registerPhantomRelaySoftListeners();');
    const superInit = src.indexOf('await super.onNodeInit({ zclNode })');
    assert.ok(pre > 0 && superInit > 0);
    assert.ok(pre < superInit, 'phantom listeners must register before super.onNodeInit');
  });
});
