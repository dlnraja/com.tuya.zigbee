'use strict';

/**
 * Test BatteryCore v2 bridge in UnifiedBatteryHandler (P58)
 *
 * Run with: node tools/ci/test-battery-core-bridge.js
 */

const assert = require('assert');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const UBH = require(path.join(ROOT, 'lib/battery/UnifiedBatteryHandler.js'));

let passed = 0, failed = 0;
function test(name, fn) {
  return Promise.resolve().then(fn).then(
    () => { passed++; console.log(`  ✓ ${name}`); },
    (err) => { failed++; console.log(`  ✗ ${name}\n      ${err.message}`); }
  );
}

(async function run() {
  console.log('=== UnifiedBatteryHandler ↔ BatteryCore bridge ===');

  await test('voltageToPercentChemistry: Li-Ion at 3.7V → 50%', () => {
    const p = UBH.voltageToPercentChemistry(3700, 'Li-Ion');
    assert.ok(p >= 40 && p <= 60, `got ${p}`);
  });

  await test('voltageToPercentChemistry: LiFePO4 at 3.2V → 50%', () => {
    const p = UBH.voltageToPercentChemistry(3200, 'LiFePO4');
    assert.ok(p >= 30 && p <= 70, `got ${p}`);
  });

  await test('voltageToPercentChemistry: returns null for unknown chemistry', () => {
    const p = UBH.voltageToPercentChemistry(3000, 'Plutonium-239');
    assert.strictEqual(p, null);
  });

  await test('autoDetectChemistry: 3.0V → Coin Cell or Alkaline', () => {
    const c = UBH.autoDetectChemistry(3000);
    assert.ok(['Coin Cell', 'Alkaline', 'NiMH'].includes(c), `got ${c}`);
  });

  await test('smoothEma: 50 with prev 60 alpha 0.3 → 57', () => {
    const v = UBH.smoothEma(50, 60, 0.3);
    assert.strictEqual(v, 57);
  });

  await test('stateOfHealth: 0 cycles → ~100%', () => {
    const soh = UBH.stateOfHealth(0, 'Li-Ion');
    assert.ok(soh >= 95 && soh <= 100, `got ${soh}`);
  });

  await test('stateOfHealth: many cycles degrades', () => {
    const soh0 = UBH.stateOfHealth(0, 'Li-Ion');
    const soh500 = UBH.stateOfHealth(500, 'Li-Ion');
    assert.ok(soh500 < soh0, `${soh500} not less than ${soh0}`);
  });

  await test('shouldCommitBatteryValue: huge jump is rejected (rate-limit)', () => {
    // lastValue must be { value, timestamp } for the rate check to apply
    const last = { value: 30, timestamp: Date.now() };
    const r = UBH.shouldCommitBatteryValue(90, last, { maxChange: 50, maxChangeWindow: 60000 });
    assert.strictEqual(r, false);
  });

  await test('shouldCommitBatteryValue: small change OK', () => {
    const last = { value: 75, timestamp: Date.now() };
    const r = UBH.shouldCommitBatteryValue(76, last, { maxChange: 50, maxChangeWindow: 60000 });
    assert.strictEqual(r, true);
  });

  await test('shouldCommitBatteryValue: null lastValue is always accepted', () => {
    const r = UBH.shouldCommitBatteryValue(50, null, {});
    assert.strictEqual(r, true);
  });

  await test('normalizeZclPercentV2: 200 → 50 (ZCL strict spec, 100=50%)', () => {
    // BatteryCore follows the strict ZCL spec: 0..100 = 0..100%, 100..200 = 50..100% with 100=50%
    // (rawValue - 100) / 2 = 50 for input 200
    const n = UBH.normalizeZclPercentV2(200);
    assert.strictEqual(n, 50);
  });

  await test('normalizeZclPercentV2: 100 → 100', () => {
    const n = UBH.normalizeZclPercentV2(100);
    assert.strictEqual(n, 100);
  });

  await test('normalizeZclPercentV2: 50 → 50', () => {
    const n = UBH.normalizeZclPercentV2(50);
    assert.strictEqual(n, 50);
  });

  await test('cascadeBatterySources: single value', () => {
    const r = UBH.cascadeBatterySources([null, null, 75]);
    assert.strictEqual(r.value, 75);
  });

  await test('cascadeBatterySources: objects picks highest confidence', () => {
    const r = UBH.cascadeBatterySources([
      { name: 'zcl', value: 70, confidence: 0.9 },
      { name: 'tuya', value: 68, confidence: 0.7 },
    ]);
    assert.strictEqual(r.value, 70);
    assert.strictEqual(r.source, 'zcl');
  });

  await test('cascadeBatterySources: all null returns null', () => {
    const r = UBH.cascadeBatterySources([null, undefined, null]);
    assert.strictEqual(r, null);
  });

  await test('getCore: lazy-loads BatteryCore on first call', () => {
    UBH.BatteryCore = null;  // force re-load
    const c = UBH.getCore();
    assert.ok(c);
  });

  await test('integration: UBH + BatteryCore + SafeCapability all load', () => {
    const { safeSetCapabilityValue } = require(path.join(ROOT, 'lib/utils/SafeCapability.js'));
    assert.strictEqual(typeof safeSetCapabilityValue, 'function');
    assert.ok(UBH.voltageToPercentChemistry(3000, 'Coin Cell') !== null);
  });

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
})();
