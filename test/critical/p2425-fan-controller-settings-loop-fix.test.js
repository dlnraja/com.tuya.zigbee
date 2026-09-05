'use strict';

/**
 * P2425 — Fan Controller settings write loop fix (#536)
 * Verifies that:
 * 1. _handleDP guards against re-triggering onSettings writes via _isInternalSettingsSync for DP2 & DP11.
 * 2. onSettings skips write-back when _isInternalSettingsSync is active.
 * 3. Only updates settings if changed to prevent echo loops.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const devicePath = path.join(ROOT, 'drivers', 'fan_controller', 'device.js');

assert.ok(fs.existsSync(devicePath), 'fan_controller/device.js missing');
const src = fs.readFileSync(devicePath, 'utf8');

// 1. Guard in fan_controller
assert.ok(src.includes('_isInternalSettingsSync'), 'fan_controller/device.js must reference _isInternalSettingsSync');

// 2. onSettings guard check
assert.ok(
  /if\s*\(\s*this\._isInternalSettingsSync\s*\)\s*\{[\s\S]*?Skipping write-back/.test(src),
  'onSettings must skip write-back during internal sync'
);

// 3. DP2 and DP11 guarded updates
assert.ok(
  /this\.getSetting\?\.?\('countdown'\)\s*!==\s*sec/.test(src),
  'DP2 countdown must only call setSettings if value changed'
);

assert.ok(
  /this\.getSetting\?\.?\('power_on_behavior'\)\s*!==\s*key/.test(src),
  'DP11 power_on_behavior must only call setSettings if value changed'
);

console.log('P2425 Fan controller settings loop fix test: PASS');
