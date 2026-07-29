'use strict';

/**
 * Tests — battery estimation & SOS button battery info (v9.0.365)
 *  - normalizeZigbeeValue: ZCL 0-200 scale, sentinels, curated 0-50 scale
 *  - the 0-50 doubling must NEVER apply to non-curated manufacturers
 *    (a genuinely discharged device at 40% must stay 40%)
 *  - ZCL batteryVoltage units (100mV) — 30 must mean 3.0V, not 30V
 */

const assert = require('assert');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const UnifiedBatteryHandler = require('../lib/battery/UnifiedBatteryHandler');
const { normalizeZigbeeValue, calculateFromVoltage } = UnifiedBatteryHandler;

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

describe('SOS button management (v9.0.365)', () => {
  const source = fs.readFileSync(path.join(ROOT, 'drivers/button_emergency_sos/device.js'), 'utf8');

  it('registers a capability listener for button.1 (virtual press)', () => {
    assert.match(source, /registerCapabilityListener\('button\.1'/);
  });

  it('routes battery reports through the smart normalizer', () => {
    assert.match(source, /normalizeZigbeeValue/);
  });

  it('handles ZCL 100mV battery voltage units', () => {
    assert.match(source, /voltage >= 10\) \{voltage = voltage \/ 10/);
  });
});

describe('normalizeZigbeeValue — scales', () => {
  it('ZCL 0-200 scale: 200 → 100, 150 → 75', () => {
    assert.strictEqual(normalizeZigbeeValue(200, {}), 100);
    assert.strictEqual(normalizeZigbeeValue(150, {}), 75);
  });

  it('sentinels stay unknown: 255 → null', () => {
    assert.strictEqual(normalizeZigbeeValue(255, {}), null);
  });

  it('plain 0-100 passes through, including low values', () => {
    assert.strictEqual(normalizeZigbeeValue(87, {}), 87);
    assert.strictEqual(normalizeZigbeeValue(40, { lastValue: 40 }), 40); // NOT doubled
    assert.strictEqual(normalizeZigbeeValue(30, { lastValue: 30 }), 30); // NOT doubled
  });

  it('0-50 scale doubling is curated-manufacturer only', () => {
    assert.strictEqual(normalizeZigbeeValue(40, { manufacturer: '_TZE284_vvmbj46n' }), 80);
    assert.strictEqual(normalizeZigbeeValue(50, { manufacturer: '_TZE200_vvmbj46n' }), 100);
    assert.strictEqual(normalizeZigbeeValue(40, { manufacturer: '_TZ3000_whatever' }), 40);
  });
});

describe('SOS battery voltage units (ZCL 100mV)', () => {
  it('3.0V yields a sane high percentage on a 3V profile', () => {
    const pct = calculateFromVoltage(3.0, '3V_2100');
    assert.ok(pct > 50 && pct <= 100, `expected 50-100, got ${pct}`);
  });

  it('ZCL raw 30 (100mV units) converts to 3.0V before lookup', () => {
    // driver conversion under test: >=10 → /10 ; >300 → /1000
    const zclToVolts = (v) => (v > 300 ? v / 1000 : v >= 10 ? v / 10 : v);
    assert.strictEqual(zclToVolts(30), 3.0);
    assert.strictEqual(zclToVolts(3000), 3.0);
    assert.strictEqual(zclToVolts(2.9), 2.9);
    const pct = calculateFromVoltage(zclToVolts(30), '3V_2100');
    assert.ok(pct > 50 && pct <= 100, `expected 50-100, got ${pct}`);
  });
});
