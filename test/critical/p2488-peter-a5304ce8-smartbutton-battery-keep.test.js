'use strict';

/**
 * P2488 — Peter diag a5304ce8 @ 9.0.916 Smartbutton battery
 * Contre quoi: IntelligentDeviceAdapter maintenance strips measure_battery on
 * sleepy button_wireless_1 → ZCL batteryPercentageRemaining → capability_id_not_available_on_device
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2488 Peter a5304ce8 Smartbutton keep measure_battery', () => {
  it('IntelligentDeviceAdapter treats measure_battery as critical for buttons', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib', 'intelligent', 'IntelligentDeviceAdapter.js'),
      'utf8',
    );
    assert.ok(src.includes('P2488'), 'P2488 marker');
    assert.ok(src.includes("capability === 'measure_battery'"), 'battery critical branch');
    assert.ok(src.includes('keepBattery'), 'analyze keepBattery gate');
    assert.ok(/button_\|remote_\|scene_switch_/.test(src), 'button driver keep pattern');
  });

  it('button_wireless_1 still declares measure_battery + CR2450', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers', 'button_wireless_1', 'driver.compose.json'),
      'utf8',
    ));
    assert.ok(compose.capabilities.includes('measure_battery'));
    assert.equal(compose.energy.batteries[0], 'CR2450');
  });
});
