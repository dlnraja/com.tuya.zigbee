'use strict';

/**
 * Tests — central _destroyed guards (v9.0.388)
 * The base class must skip capability operations after device destruction,
 * covering ALL call paths (raw setCapabilityValue, safeSetCapabilityValue,
 * addCapability, removeCapability).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'lib', 'tuya', 'TuyaZigbeeDevice.js'), 'utf8');

describe('central _destroyed guards (TuyaZigbeeDevice)', () => {
  it('safeSetCapabilityValue is guarded first', () => {
    const fn = src.slice(src.indexOf('async safeSetCapabilityValue'));
    assert.ok(fn.indexOf('this._destroyed') < fn.indexOf('_blockBizarreValue'),
      'destroyed guard must run before any other logic');
    assert.match(fn, /GUARD\] setCapabilityValue/);
  });

  it('addCapability and removeCapability are guarded', () => {
    assert.match(src, /async addCapability\(capability\) \{\s*if \(this\._destroyed\)/);
    assert.match(src, /async removeCapability\(capability\) \{\s*if \(this\._destroyed\)/);
  });

  it('raw setCapabilityValue routes through the guarded safe wrapper', () => {
    assert.match(src, /async setCapabilityValue\(capability, value\) \{\s*return this\.safeSetCapabilityValue\(capability, value\)/);
  });
});

describe('linear battery formulas eliminated', () => {
  const files = [
    'lib/tuya/DataRecoveryManager.js',
    'lib/xiaomi/XiaomiSpecialHandler.js',
    'lib/devices/BaseUnifiedDevice.js',
  ];

  for (const f of files) {
    it(`${f} uses UnifiedBatteryHandler`, () => {
      const content = fs.readFileSync(path.join(ROOT, f), 'utf8');
      assert.match(content, /UnifiedBatteryHandler|UBH/, `${f} must use the curve-based handler`);
      assert.ok(!/voltage\s*-\s*2\.[0-9].*\/.*0\.[0-9]/.test(content), 'no linear formula left');
    });
  }

  it('CR2032 curve handles the voltage range of the old formulas', () => {
    const UBH = require('../lib/battery/UnifiedBatteryHandler');
    // ancienne formule linéaire: (voltage - 2.4) / 0.6 * 100
    // la courbe non-linéaire doit donner des valeurs plausibles sur la plage
    const p0 = UBH.calculateFromVoltage(2.4, 'CR2032');
    const p50 = UBH.calculateFromVoltage(2.7, 'CR2032');
    const p100 = UBH.calculateFromVoltage(3.0, 'CR2032');
    assert.ok(p0 >= 0 && p0 < 30, `2.4V → ${p0}%`);
    assert.ok(p50 > 30 && p50 < 80, `2.7V → ${p50}%`);
    assert.ok(p100 >= 90, `3.0V → ${p100}%`);
  });
});
