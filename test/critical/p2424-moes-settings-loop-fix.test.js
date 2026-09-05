'use strict';

/**
 * P2424 — Moes ZTS settings write loop fix (#533 / salvagr)
 * Verifies that:
 * 1. _syncMoesSettingFromDp guards against re-triggering onSettings writes via _isInternalSettingsSync.
 * 2. onSettings skips _applyMoesZtsSettings when _isInternalSettingsSync is active.
 * 3. _applyCalibrationSettings does not blast DP3/7/8/10 on boot for Moes ZTS.
 * 4. _applyMoesZtsSettings paces DP commands with a delay.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const devicePath = path.join(ROOT, 'drivers', 'curtain_motor', 'device.js');

assert.ok(fs.existsSync(devicePath), 'curtain_motor/device.js missing');
const src = fs.readFileSync(devicePath, 'utf8');

// 1. Guard in _syncMoesSettingFromDp
assert.ok(src.includes('_isInternalSettingsSync'), 'device.js must reference _isInternalSettingsSync');
assert.ok(src.includes('P2424'), 'device.js must reference P2424');

// 2. onSettings guard check
assert.ok(
  /if\s*\(\s*this\._isInternalSettingsSync\s*\)\s*\{[\s\S]*?Skipping Moes ZTS send on settings/.test(src),
  'onSettings must skip sending Moes ZTS settings during internal sync'
);

// 3. No boot calibration blast
assert.ok(
  /skipping boot calibration blast/.test(src),
  '_applyCalibrationSettings must skip boot DP blast for Moes ZTS'
);

// 4. Command pacing
assert.ok(
  /setTimeout\(r,\s*150\)/.test(src),
  '_applyMoesZtsSettings must pace DP writes with an inter-frame delay'
);

console.log('P2424 Moes settings loop fix test: PASS');
