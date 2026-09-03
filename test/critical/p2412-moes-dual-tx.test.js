'use strict';

/**
 * P2412 — Moes ZTS dual TX (#533 / diag 4a918200)
 * Homey UI sends windowcoverings_state; tip 9.0.807 logged DP1/DP2 sent but motor idle.
 * Dual-write enum + position; optional moes_control_invert.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const coverPath = path.join(ROOT, 'lib', 'devices', 'UnifiedCoverBase.js');
const composePath = path.join(ROOT, 'drivers', 'curtain_motor', 'driver.compose.json');

assert.ok(fs.existsSync(coverPath), 'UnifiedCoverBase missing');
const src = fs.readFileSync(coverPath, 'utf8');
assert.ok(src.includes('_sendMoesZtsMotion'), 'Moes dual TX helper missing');
assert.ok(src.includes('_moesControlInverted'), 'moes_control_invert helper missing');
assert.ok(src.includes('moes_control_invert'), 'setting key referenced');
assert.ok(src.includes('Dual TX for Moes ZTS'), 'dual TX comment');

const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
const settingIds = (compose.settings || []).map((s) => s.id);
assert.ok(settingIds.includes('moes_control_invert'), 'compose setting moes_control_invert');
assert.ok(settingIds.includes('moes_motor_direction'), 'moes_motor_direction setting present');
assert.ok(settingIds.includes('moes_backlight'), 'moes_backlight setting present');

// Sacred couple still on curtain_motor
const mfrs = compose.zigbee?.manufacturerName || [];
const pids = compose.zigbee?.productId || [];
assert.ok(mfrs.some((m) => String(m).toLowerCase() === '_tze204_5slehgeo'), 'Moes mfr on curtain_motor');
assert.ok(pids.includes('TS0601'), 'TS0601 on curtain_motor');

console.log('P2412 Moes dual-TX / control invert: PASS');
