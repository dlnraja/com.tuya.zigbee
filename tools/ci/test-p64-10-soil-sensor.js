#!/usr/bin/env node
'use strict';

/**
 * tools/ci/test-p64-10-soil-sensor.js
 *
 * Tests for P64.10 soil sensor fixes:
 *  - DP 105 (humidity_calibration on ZG-303Z) is NOT fired as moisture flow
 *  - DP 107 (soil_moisture on ZG-303Z) IS handled as moisture
 *  - DP 1 is water_warning for ZG-303Z (not temperature)
 *  - isZG303ZVariant getter correctly identifies HOBEIAN family
 *
 * Bug context: Peter (#511) reported "Could not trigger Flow card with id
 * 'soil_sensor_moisture_changed': Invalid value" because the old code
 * treated DP 105 (calibration) as moisture, firing false triggers with
 * calibration values that were sometimes non-finite.
 */

const fs = require('fs');
const path = require('path');
const Module = require('module');

const REPO = path.resolve(__dirname, '..', '..');
const DEVICE_JS = path.join(REPO, 'drivers', 'soil_sensor', 'device.js');

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
  else      { failed++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
}

function test(name, fn) {
  console.log(`\n\x1b[36m${name}\x1b[0m`);
  try { fn(); } catch (e) { failed++; console.log(`  \x1b[31m✗\x1b[0m ${e.message}`); }
}

console.log('\n\x1b[1mP64.10 soil sensor fixes\x1b[0m');

test('device.js exists and is syntactically valid', () => {
  assert(fs.existsSync(DEVICE_JS), 'drivers/soil_sensor/device.js exists');
  const txt = fs.readFileSync(DEVICE_JS, 'utf8');
  assert(txt.includes('isZG303ZVariant'), 'has isZG303ZVariant getter');
  assert(txt.includes('humidity_calibration'), 'mentions humidity_calibration');
  assert(txt.includes('water_warning'), 'mentions water_warning');
});

test('isZG303ZVariant includes Peter\'s MFR (_TZE284_awepdiwi)', () => {
  const txt = fs.readFileSync(DEVICE_JS, 'utf8');
  // Find the zg303Mfrs array contents
  const m = txt.match(/zg303Mfrs\s*=\s*\[([\s\S]*?)\]/);
  assert(m, 'has zg303Mfrs array');
  if (m) {
    const arr = m[1];
    assert(arr.includes('_tze284_awepdiwi'), 'includes _tze284_awepdiwi');
    assert(arr.includes('_tze284_ga1maeof'), 'includes _tze284_ga1maeof');
    assert(arr.includes('_tze284_myd45weu'), 'includes _tze284_myd45weu');
    assert(arr.includes('_tze200_wqashyqo'), 'includes _tze200_wqashyqo (canonical ZG-303Z)');
    assert(arr.includes('_tze200_npj9bug3'), 'includes _tze200_npj9bug3 (CS-201Z)');
  }
});

test('DP 105 is no longer treated as moisture', () => {
  const txt = fs.readFileSync(DEVICE_JS, 'utf8');
  // Old code: if (dp === 2 || dp === 3 || dp === 105) → fired moisture flow
  // New code: if (dp === 2 || dp === 3 || dp === 107) → fires moisture flow
  // and DP 105 has its own handler that does NOT call _triggerMoistureFlows
  const moistureMatch = txt.match(/if \(dp === 2 \|\| dp === 3 \|\| dp === (\d+)\)/);
  assert(moistureMatch, 'has moisture DP check');
  if (moistureMatch) {
    assert(moistureMatch[1] === '107', `moisture DP is now 107 (was 105, now fixed). Got: ${moistureMatch[1]}`);
  }
  // DP 105 handler exists separately
  const cal105 = txt.match(/if \(dp === 105\)/);
  assert(cal105, 'DP 105 has its own handler (humidity_calibration)');
  // DP 105 handler does NOT call _triggerMoistureFlows
  if (cal105) {
    const idx = cal105.index;
    const snippet = txt.slice(idx, idx + 600);
    assert(!snippet.includes('_triggerMoistureFlows'), 'DP 105 handler does NOT trigger moisture flow');
  }
});

test('DP 107 (ZG-303Z soil_moisture) is handled', () => {
  const txt = fs.readFileSync(DEVICE_JS, 'utf8');
  assert(txt.includes('dp === 107'), 'DP 107 has handler');
  // Find DP 107 handler (it's combined with 2 and 3 in one if)
  const m = txt.match(/if \(dp === 2 \|\| dp === 3 \|\| dp === 107\)[\s\S]{0,500}/);
  assert(m, 'DP 107 handler block found');
  if (m) {
    // Look further down for _triggerMoistureFlows (the function may be called after the if block)
    const tail = txt.slice(m.index, m.index + 1200);
    assert(tail.includes('_triggerMoistureFlows'), 'DP 107 (or its combined block) triggers moisture flow');
    assert(tail.includes('_normalizeSoilMoisture'), 'DP 107 normalizes value');
  }
});

test('DP 103 (ZG-303Z temperature) is handled', () => {
  const txt = fs.readFileSync(DEVICE_JS, 'utf8');
  assert(txt.includes('dp === 103'), 'DP 103 has handler');
  const m = txt.match(/if \(dp === 103\)[\s\S]{0,500}/);
  if (m) {
    assert(m[0].includes('measure_temperature') || m[0].includes('safeSetCapabilityValue'),
      'DP 103 sets measure_temperature');
  }
});

test('DP 1 is water_warning for ZG-303Z, temperature for legacy', () => {
  const txt = fs.readFileSync(DEVICE_JS, 'utf8');
  // Find the ZG-303Z DP 1 handler
  const m = txt.match(/if \(dp === 1 && this\.isZG303ZVariant\)/);
  assert(m, 'DP 1 has conditional ZG-303Z handler');
  if (m) {
    const idx = m.index;
    const snippet = txt.slice(idx, idx + 400);
    assert(snippet.includes('alarm_water'), 'ZG-303Z DP 1 sets alarm_water');
  }
  // Legacy DP 1 + DP 5 → temperature
  const legacy = txt.match(/if \(dp === 5 \|\| dp === 1\)/);
  assert(legacy, 'legacy temperature handler still present for non-ZG-303Z');
});

test('DP 102, 104, 106, 110, 111, 112 are handled as settings', () => {
  const txt = fs.readFileSync(DEVICE_JS, 'utf8');
  for (const dp of [102, 104, 106, 110, 111, 112]) {
    assert(txt.includes(`dp === ${dp}`), `DP ${dp} has handler`);
  }
  // DP 102, 104, 106 must call setSettings
  const calBlock = txt.match(/if \(dp === 102 \|\| dp === 104 \|\| dp === 106\)[\s\S]{0,600}/);
  assert(calBlock, 'DP 102/104/106 has block');
  if (calBlock) {
    assert(calBlock[0].includes('setSettings'), 'DP 102/104/106 uses setSettings');
    assert(!calBlock[0].includes('_triggerMoistureFlows'), 'DP 102/104/106 does NOT trigger moisture flow');
  }
  // DP 110, 111, 112 must call setSettings
  const setBlock = txt.match(/if \(dp === 110 \|\| dp === 111 \|\| dp === 112\)[\s\S]{0,600}/);
  assert(setBlock, 'DP 110/111/112 has block');
  if (setBlock) {
    assert(setBlock[0].includes('setSettings'), 'DP 110/111/112 uses setSettings');
  }
});

test('soil_sensor_moisture_changed flow card has number token', () => {
  const flow = path.join(REPO, 'drivers', 'soil_sensor', 'driver.flow.compose.json');
  const c = JSON.parse(fs.readFileSync(flow, 'utf8'));
  const card = c.triggers.find(t => t.id === 'soil_sensor_moisture_changed');
  assert(card, 'flow card exists');
  if (card) {
    const tok = card.tokens?.find(t => t.name === 'moisture');
    assert(tok, 'moisture token exists');
    if (tok) {
      assert(tok.type === 'number', `moisture token type is "number" (got: ${tok.type})`);
    }
  }
});

test('soil_sensor driver.compose.json has HOBEIAN and awepdiwi', () => {
  const compose = path.join(REPO, 'drivers', 'soil_sensor', 'driver.compose.json');
  const c = JSON.parse(fs.readFileSync(compose, 'utf8'));
  const mfrs = c.zigbee.manufacturerName.map(m => m.toLowerCase());
  assert(mfrs.includes('hobeian'), 'HOBEIAN in manufacturerName');
  assert(mfrs.includes('_tze284_awepdiwi'), '_TZE284_awepdiwi in manufacturerName');
  assert(mfrs.includes('_tze284_ga1maeof'), '_TZE284_ga1maeof in manufacturerName');
});

console.log(`\n\x1b[1m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed === 0 ? 0 : 1);
