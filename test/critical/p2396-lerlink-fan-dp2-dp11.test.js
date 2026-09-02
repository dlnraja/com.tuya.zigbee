'use strict';

/**
 * P2396 — Lerlink fan_switch DP2 countdown + DP11 power-on (#536)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2396 Lerlink fan DP2/DP11', () => {
  it('settings compose declares countdown + power_on_behavior', () => {
    const p = path.join(__dirname, '..', '..', 'drivers', 'fan_controller', 'driver.settings.compose.json');
    const settings = JSON.parse(fs.readFileSync(p, 'utf8'));
    const flat = JSON.stringify(settings);
    assert.ok(flat.includes('"countdown"'));
    assert.ok(flat.includes('"power_on_behavior"'));
    assert.ok(!flat.includes('"previous"'), 'fan_switch power-on is off/on only');
  });

  it('device.js handles DP2 and DP11', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'drivers', 'fan_controller', 'device.js'),
      'utf8'
    );
    assert.ok(src.includes('case 2:'));
    assert.ok(src.includes('case 11:'));
    assert.ok(src.includes('onSettings'));
    assert.ok(src.includes('dp: 2'));
    assert.ok(src.includes('dp: 11'));
  });

  it('BatteryMasterEngine no longer maps r32ctezx to AA', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'lib', 'battery', 'BatteryMasterEngine.js'),
      'utf8'
    );
    assert.ok(!/'_TZE200_r32ctezx'\s*:/.test(src));
  });
});
