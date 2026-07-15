#!/usr/bin/env node
'use strict';

/**
 * tools/ci/test-p64-12-zg204-driver.js
 *
 * Tests for P64.12 ZG-204ZM/ZV driver improvements:
 *  - 7 new ZG-204ZM DPs added (114 time, 115 alarm_time, 116 alarm_volume,
 *    117 working_mode, 118 auto1, 119 auto2, 120 auto3)
 *  - ZG_204ZV_MULTISENSOR dpMap aligned with Z2M (102/103/104/105/107 swapped)
 *  - 4 new ZG-204ZV settings added (humidity_calibration, temperature_calibration,
 *    illuminance_interval, temperature_unit)
 *  - Settings flow: user changes setting → device.js onSettings sends back
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
const CONFIGS = path.join(REPO, 'drivers', 'presence_sensor_radar', 'configs.js');
const COMPOSE = path.join(REPO, 'drivers', 'presence_sensor_radar', 'driver.compose.json');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
  else      { failed++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
}
function test(name, fn) {
  console.log(`\n\x1b[36m${name}\x1b[0m`);
  try { fn(); } catch (e) { failed++; console.log(`  \x1b[31m✗\x1b[0m ${e.message}`); }
}

const cfg = fs.readFileSync(CONFIGS, 'utf8');
const compose = JSON.parse(fs.readFileSync(COMPOSE, 'utf8'));

console.log('\n\x1b[1mP64.12 ZG-204 driver tests\x1b[0m');

test('HOBEIAN_ZG204ZM has 7 new DPs (114/115/116/117/118/119/120)', () => {
  const config = cfg.match(/'HOBEIAN_ZG204ZM':\s*\{[\s\S]*?dpMap:\s*\{([\s\S]*?)\n\s*\}\s*\}/);
  assert(config, 'HOBEIAN_ZG204ZM config block found');
  if (config) {
    const body = config[1];
    for (const dp of [114, 115, 116, 117, 118, 119, 120]) {
      const re = new RegExp(`\\b${dp}:\\s*\\{`);
      assert(re.test(body), `DP ${dp} present in HOBEIAN_ZG204ZM dpMap`);
    }
  }
});

test('HOBEIAN_ZG204ZM writableDPs includes 114/115/116/117/118/119/120', () => {
  const writable = cfg.match(/HOBEIAN_ZG204ZM[\s\S]*?writableDPs:\s*\[([^\]]+)\]/);
  assert(writable, 'writableDPs array found');
  if (writable) {
    const arr = writable[1];
    for (const dp of [114, 115, 116, 117, 118, 119, 120]) {
      assert(arr.includes(String(dp)), `writableDPs includes ${dp}`);
    }
  }
});

test('HOBEIAN_ZG204ZM still has the 7 already-mapped DPs (103, 110, 111, 112, 113, 122, 123)', () => {
  const config = cfg.match(/'HOBEIAN_ZG204ZM':\s*\{[\s\S]*?dpMap:\s*\{([\s\S]*?)\n\s*\}\s*\}/);
  if (config) {
    const body = config[1];
    for (const dp of [103, 110, 111, 112, 113, 122, 123]) {
      const re = new RegExp(`\\b${dp}:\\s*\\{`);
      assert(re.test(body), `DP ${dp} still present in HOBEIAN_ZG204ZM dpMap`);
    }
  }
});

test('driver.compose.json has new ZG-204ZM settings', () => {
  const ids = (compose.settings || []).map(s => s.id);
  for (const id of ['time', 'alarm_time', 'alarm_volume', 'working_mode']) {
    assert(ids.includes(id), `setting "${id}" present in driver.compose.json`);
  }
});

test('ZG_204ZV_MULTISENSOR dpMap aligned with Z2M (102/103/104/105/107 swapped)', () => {
  // Z2M ZG-204ZV:
  //   DP 102 = fading_time
  //   DP 103 = anti_interference
  //   DP 104 = humidity_calibration
  //   DP 105 = temperature_calibration
  //   DP 107 = illuminance_interval
  //   DP 108 = indicator
  //   DP 109 = temperature_unit
  const config = cfg.match(/'ZG_204ZV_MULTISENSOR':\s*\{[\s\S]*?dpMap:\s*\{([\s\S]*?)\n\s*\}\s*\}/);
  assert(config, 'ZG_204ZV_MULTISENSOR config block found');
  if (config) {
    const body = config[1];
    // Check each DP has the right setting
    const tests = [
      { dp: 102, setting: 'fading_time' },
      { dp: 103, setting: 'anti_interference' },
      { dp: 104, setting: 'humidity_calibration' },
      { dp: 105, setting: 'temperature_calibration' },
      { dp: 107, setting: 'illuminance_interval' },
      { dp: 108, setting: 'indicator' },
      { dp: 109, setting: 'temperature_unit' },
    ];
    for (const t of tests) {
      const re = new RegExp(`\\b${t.dp}:\\s*\\{[^}]*setting:\\s*['"\`]${t.setting}['"\`]`);
      assert(re.test(body), `DP ${t.dp} → setting "${t.setting}" (matches Z2M)`);
    }
  }
});

test('driver.compose.json has new ZG-204ZV settings', () => {
  const ids = (compose.settings || []).map(s => s.id);
  for (const id of ['humidity_calibration', 'temperature_calibration', 'illuminance_interval', 'temperature_unit']) {
    assert(ids.includes(id), `setting "${id}" present in driver.compose.json`);
  }
});

test('ZG_204ZV_MULTISENSOR keeps best-effort extra DPs (3, 4, 9, 10, 11, 17, 18, 113, 119, 122, 123, 124)', () => {
  const config = cfg.match(/'ZG_204ZV_MULTISENSOR':\s*\{[\s\S]*?dpMap:\s*\{([\s\S]*?)\n\s*\}\s*\}/);
  if (config) {
    const body = config[1];
    for (const dp of [3, 4, 9, 10, 11, 17, 18, 113, 119, 122, 123, 124]) {
      const re = new RegExp(`\\b${dp}:\\s*\\{`);
      assert(re.test(body), `best-effort DP ${dp} still present`);
    }
  }
});

test('ZG_204ZV_MULTISENSOR still has temp+humidity+battery capabilities', () => {
  const config = cfg.match(/'ZG_204ZV_MULTISENSOR':\s*\{[\s\S]*?dpMap:\s*\{([\s\S]*?)\n\s*\}\s*\}/);
  if (config) {
    const body = config[1];
    assert(/101:\s*\{[^}]*measure_humidity/.test(body), 'DP 101 → measure_humidity');
    assert(/110:\s*\{[^}]*measure_battery/.test(body), 'DP 110 → measure_battery');
    assert(/111:\s*\{[^}]*measure_temperature/.test(body), 'DP 111 → measure_temperature');
    assert(/106:\s*\{[^}]*measure_luminance/.test(body), 'DP 106 → measure_luminance');
  }
});

test('ZG-204ZM v1 (TZE200_2aaelwxk) is still in HOBEIAN_ZG204ZM sensor list', () => {
  // The MFR list for HOBEIAN_ZG204ZM is `['HOBEIAN']` — any HOBEIAN
  // vendor name will trigger HOBEIAN_ZG204ZM if modelId includes ZG-204ZM
  const block = cfg.match(/'HOBEIAN_ZG204ZM':\s*\{([\s\S]*?)\}/);
  if (block) {
    assert(/sensors:\s*\[\s*['"]HOBEIAN['"]/.test(block[1]), 'sensors list contains HOBEIAN vendor');
    assert(/modelId:\s*['"]ZG-204ZM['"]/.test(block[1]), 'modelId is ZG-204ZM');
  }
});

console.log(`\n\x1b[1m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed === 0 ? 0 : 1);
