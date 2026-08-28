'use strict';

/**
 * P2294 — Peter diag 4b1a0dc9: IntelligentBattery must not strip measure_battery
 * on SH-SC07 / button_wireless_1, and Hybrid must not optimize-disable button RX.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2294 Peter Smartbutton battery/hybrid lock', () => {
  it('IntelligentDeviceAdapter keeps battery for button/skipBatteryReporting', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/intelligent/IntelligentDeviceAdapter.js'),
      'utf8',
    );
    assert.ok(src.includes('_mustKeepBatteryCapability'), 'guard method');
    assert.ok(src.includes('P2294'), 'P2294 marker');
    assert.ok(src.includes('skipBatteryReporting'), 'profile lock');
    assert.ok(src.includes('Refusing remove measure_battery'), 'refuse remove');
  });

  it('HybridProtocolManager treats button_wireless as sleepy', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/protocol/HybridProtocolManager.js'),
      'utf8',
    );
    assert.ok(src.includes('isButtonish'), 'buttonish guard');
    assert.ok(/button_\|remote_/i.test(src) || src.includes('button_|remote_'), 'button driver regex');
    assert.ok(src.includes('Skip protocol disable on sleepy/IAS-only/button'), 'log marker');
  });

  it('mrpevh8p still has skipBatteryReporting in PhysicalButtonMixin', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'),
      'utf8',
    );
    assert.ok(src.includes("'_TZ3000_mrpevh8p'"), 'mrpevh8p profile key');
    assert.ok(src.includes('skipBatteryReporting: true'), 'skipBatteryReporting flag');
  });
});
