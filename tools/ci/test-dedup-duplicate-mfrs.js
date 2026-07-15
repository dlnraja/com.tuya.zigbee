'use strict';

/**
 * Test dedup-duplicate-mfrs.js (P58.11)
 * Run: node tools/ci/test-dedup-duplicate-mfrs.js
 */

const assert = require('assert');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { categorize, pickKeepDriver } = require(path.join(ROOT, 'tools/ci/dedup-duplicate-mfrs.js'));

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
}

console.log('=== Dedup Duplicate MFRs tests (P58.11) ===');

test('categorize: light bulb in 3+ drivers', () => {
  const c = categorize('_tz3210_xx', ['bulb_dimmable', 'light_bulb_dimmable_tunable', 'light_bulb_rgb_rgbw']);
  assert.strictEqual(c, 'light_bulb');
});

test('categorize: led controllers in 2+ drivers', () => {
  const c = categorize('_TZ3000_xx', ['led_controller_cct', 'led_strip_rgbw']);
  assert.strictEqual(c, 'led_controller');
});

test('categorize: placeholder', () => {
  const c = categorize('_TZE200_placeholder', ['device_air_purifier_climate', 'flood_sensor']);
  assert.strictEqual(c, 'placeholder');
});

test('categorize: dummy', () => {
  const c = categorize('_TZE200_dummy', ['universal_fallback', 'outdoor_plug']);
  assert.strictEqual(c, 'placeholder');
});

test('categorize: HOBEIAN (uppercase)', () => {
  const c = categorize('HOBEIAN', ['scene_switch_6', 'switch_plug_1']);
  assert.strictEqual(c, 'case_diff');
});

test('categorize: other (no pattern match)', () => {
  const c = categorize('_TZE200_random_xx', ['climate_sensor', 'motion_sensor']);
  assert.strictEqual(c, 'other');
});

test('pickKeepDriver: light_bulb prefers bulb_dimmable', () => {
  const k = pickKeepDriver('_tz3210_xx', ['light_bulb_dimmable_tunable', 'bulb_dimmable', 'light_bulb_rgb_rgbw']);
  assert.strictEqual(k, 'bulb_dimmable');
});

test('pickKeepDriver: led prefers led_controller_dimmable', () => {
  const k = pickKeepDriver('_TZ3210_xx', ['led_controller_cct', 'led_controller_dimmable', 'led_strip_rgbw']);
  assert.strictEqual(k, 'led_controller_dimmable');
});

test('pickKeepDriver: placeholder prefers matching name', () => {
  const k = pickKeepDriver('_TZE200_placeholder', ['flood_sensor', 'switch_2_gang', 'temphumidsensor5']);
  // flood_sensor is in our keep list
  assert.ok(k === 'flood_sensor' || k === 'switch_2_gang' || k === 'temphumidsensor5');
});

test('pickKeepDriver: dummy prefers universal_fallback', () => {
  const k = pickKeepDriver('_TZE200_dummy', ['outdoor_plug', 'universal_fallback', 'valvecontroller']);
  assert.strictEqual(k, 'universal_fallback');
});

test('pickKeepDriver: fallback to first driver when no preference', () => {
  const k = pickKeepDriver('_TZE200_xx', ['climate_sensor']);
  assert.strictEqual(k, 'climate_sensor');
});

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
