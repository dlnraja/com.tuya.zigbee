'use strict';

/**
 * P216 — ZCL batteryPercentageRemaining must not blindly /2 (100% → 50%).
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { normalizeZclBatteryPercent } = require('../../lib/battery/zcl-percent');

describe('P216 ZCL battery half-percent (100 must stay 100)', () => {
  it('keeps Tuya/IKEA 0–100 reports as percent (do not /2)', () => {
    assert.strictEqual(normalizeZclBatteryPercent(100), 100);
    assert.strictEqual(normalizeZclBatteryPercent(68), 68);
    assert.strictEqual(normalizeZclBatteryPercent(50), 50);
  });

  it('converts spec ZCL 0–200 half-percent units', () => {
    assert.strictEqual(normalizeZclBatteryPercent(200), 100);
    assert.strictEqual(normalizeZclBatteryPercent(160), 80);
    assert.strictEqual(normalizeZclBatteryPercent(199), 100);
  });

  it('drops sentinels instead of inventing 50%', () => {
    assert.strictEqual(normalizeZclBatteryPercent(255), null);
    assert.strictEqual(normalizeZclBatteryPercent(0xFFFF), null);
  });

  it('hot paths no longer hardcode batteryPercentageRemaining / 2', () => {
    const root = path.join(__dirname, '..', '..');
    const files = [
      'lib/devices/BaseUnifiedDevice.js',
      'lib/devices/UnifiedSensorBase.js',
      'lib/managers/DynamicCapabilityManager.js',
      'lib/tuya/TuyaUnifiedParser.js',
      'lib/tuya/DataRecoveryManager.js',
      'lib/tuya/TuyaSyncManager.js',
      'drivers/generic_diy/device.js',
    ];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(root, rel), 'utf8');
      assert.doesNotMatch(
        src,
        /batteryPercentageRemaining\s*\/\s*2/,
        rel,
      );
      assert.doesNotMatch(
        src,
        /Math\.min\(100,\s*Math\.round\(value \/ 2\)\)/,
        rel,
      );
    }
  });
});
