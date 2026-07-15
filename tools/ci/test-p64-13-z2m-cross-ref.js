#!/usr/bin/env node
'use strict';

/**
 * tools/ci/test-p64-13-z2m-cross-ref.js
 *
 * Tests the P64.13 Z2M cross-reference:
 *  - #506 (Lalla80111) climate_sensor gets measure_voltage (battery_voltage)
 *  - dimmer_wall_1gang gets measure_voltage
 *  - sensor_motion_presence gets measure_voltage
 *  - pir_sensor_2 gets measure_voltage
 *  - sensor_contact_zigbee gets measure_voltage
 *  - climate_sensor has battery_voltage_changed flow trigger
 *  - climate_sensor has battery_voltage_below condition
 *  - Gap audit report exists and identifies battery_voltage
 */

const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
  else      { failed++; console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
}
function test(name, fn) {
  console.log(`\n\x1b[36m${name}\x1b[0m`);
  try { fn(); } catch (e) { failed++; console.log(`  \x1b[31m✗\x1b[0m ${e.message}`); }
}

console.log('\n\x1b[1mP64.13 Z2M cross-reference tests\x1b[0m');

test('climate_sensor has measure_voltage capability (#506 fix)', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'climate_sensor', 'driver.compose.json'), 'utf8'));
  assert(c.capabilities.includes('measure_voltage'), 'climate_sensor has measure_voltage');
  const dev = fs.readFileSync(path.join(REPO, 'drivers', 'climate_sensor', 'device.js'), 'utf8');
  assert(/sensorCapabilities[\s\S]*?measure_voltage/.test(dev), 'climate_sensor device.js sensorCapabilities includes measure_voltage');
});

test('dimmer_wall_1gang has measure_voltage capability', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'dimmer_wall_1gang', 'driver.compose.json'), 'utf8'));
  assert(c.capabilities.includes('measure_voltage'), 'dimmer_wall_1gang has measure_voltage');
});

test('sensor_motion_presence has measure_voltage capability', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'sensor_motion_presence', 'driver.compose.json'), 'utf8'));
  assert(c.capabilities.includes('measure_voltage'), 'sensor_motion_presence has measure_voltage');
});

test('pir_sensor_2 has measure_voltage capability', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'pir_sensor_2', 'driver.compose.json'), 'utf8'));
  assert(c.capabilities.includes('measure_voltage'), 'pir_sensor_2 has measure_voltage');
});

test('sensor_contact_zigbee has measure_voltage capability', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'sensor_contact_zigbee', 'driver.compose.json'), 'utf8'));
  assert(c.capabilities.includes('measure_voltage'), 'sensor_contact_zigbee has measure_voltage');
});

test('climate_sensor has battery_voltage_changed flow trigger', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'climate_sensor', 'driver.flow.compose.json'), 'utf8'));
  const trigger = c.triggers.find(t => t.id === 'climate_sensor_battery_voltage_changed');
  assert(trigger, 'climate_sensor_battery_voltage_changed trigger exists');
  if (trigger) {
    const tok = (trigger.tokens || []).find(t => t.name === 'voltage');
    assert(tok, 'has voltage token');
    if (tok) {
      assert(tok.type === 'number', `voltage token type is "number" (got: ${tok.type})`);
    }
  }
});

test('climate_sensor has battery_voltage_below condition', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'climate_sensor', 'driver.flow.compose.json'), 'utf8'));
  const cond = (c.conditions || []).find(x => x.id === 'climate_sensor_battery_voltage_below');
  assert(cond, 'climate_sensor_battery_voltage_below condition exists');
  if (cond) {
    const arg = (cond.args || []).find(a => a.name === 'voltage');
    assert(arg, 'has voltage arg');
  }
});

test('Z2M gap audit report exists and has gaps', () => {
  const p = path.join(REPO, 'data', 'z2m_expose_gap_report.json');
  assert(fs.existsSync(p), 'data/z2m_expose_gap_report.json exists');
  if (fs.existsSync(p)) {
    const r = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert(r._meta.totalMfrsInDrivers > 0, `MFRs in drivers: ${r._meta.totalMfrsInDrivers}`);
    assert(r._meta.totalMfrsInZ2M > 1000, `MFRs in Z2M: ${r._meta.totalMfrsInZ2M}`);
    assert(r._meta.totalGaps > 0, `Total gaps: ${r._meta.totalGaps}`);
    assert(typeof r._meta.byExpose['battery_voltage'] === 'number',
      `battery_voltage gaps: ${r._meta.byExpose['battery_voltage']}`);
  }
});

test('battery_voltage gap is reduced (from 30 to <10)', () => {
  const r = JSON.parse(fs.readFileSync(path.join(REPO, 'data', 'z2m_expose_gap_report.json'), 'utf8'));
  const bv = r._meta.byExpose['battery_voltage'] || 0;
  assert(bv < 10, `battery_voltage gaps = ${bv} (was 30 before P64.13 fix)`);
});

test('#506 Lalla80111 fingerprint _TZ3000_fllyghyj still in climate_sensor', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'climate_sensor', 'driver.compose.json'), 'utf8'));
  const mfrs = (c.zigbee.manufacturerName || []).map(m => m.toLowerCase());
  assert(mfrs.includes('_tz3000_fllyghyj'), '_TZ3000_fllyghyj in climate_sensor');
});

test('#511 Peter fingerprint _TZE284_awepdiwi still in soil_sensor (no regression)', () => {
  const c = JSON.parse(fs.readFileSync(path.join(REPO, 'drivers', 'soil_sensor', 'driver.compose.json'), 'utf8'));
  const mfrs = (c.zigbee.manufacturerName || []).map(m => m.toLowerCase());
  assert(mfrs.includes('_tze284_awepdiwi'), '_TZE284_awepdiwi in soil_sensor');
  assert(mfrs.includes('_tze284_ga1maeof'), '_TZE284_ga1maeof in soil_sensor');
  assert(mfrs.includes('hobeian'), 'HOBEIAN in soil_sensor');
});

test('device-investigator.js recognizes battery_voltage → measure_voltage mapping', () => {
  const src = fs.readFileSync(path.join(REPO, 'tools', 'ci', 'device-investigator.js'), 'utf8');
  assert(/battery_voltage.*measure_voltage/s.test(src), 'exposeToCap includes battery_voltage → measure_voltage');
});

console.log(`\n\x1b[1m${passed} passed, ${failed} failed\x1b[0m\n`);
process.exit(failed === 0 ? 0 : 1);
