'use strict';

/**
 * P2472a — VicHY clrdrnya 220V: compose must NOT ship measure_battery / energy.batteries
 * Contre quoi: Homey Energy re-injects low-battery UI on tip update for mains MTG radars.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2472a VicHY mains radar — no compose battery Energy poison', () => {
  it('presence_sensor_radar compose has no measure_battery and no energy.batteries', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    assert.ok(!compose.capabilities.includes('measure_battery'),
      'compose must not declare measure_battery (mains MTG poisoned by Homey Energy)');
    assert.ok(!compose.capabilities.includes('alarm_battery'),
      'compose must not declare alarm_battery');
    assert.ok(!compose.energy?.batteries?.length,
      'compose must not declare energy.batteries (P2472a)');
  });

  it('app.json presence_sensor_radar mirrors compose (no battery Energy)', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const d = app.drivers.find((x) => x.id === 'presence_sensor_radar');
    assert.ok(d, 'presence_sensor_radar in app.json');
    assert.ok(!d.capabilities.includes('measure_battery'),
      'app.json must not declare measure_battery');
    assert.ok(!d.energy?.batteries?.length,
      'app.json must not declare energy.batteries');
  });

  it('device.js still clears Energy on mains + adds runtime battery Energy for HOBEIAN', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.ok(src.includes('P2472a'), 'P2472a marker');
    assert.ok(/setEnergy\(\{\s*batteries:\s*null,\s*mains:\s*true\s*\}\)/.test(src),
      'mains setEnergy batteries:null');
    assert.ok(/batteries:\s*\[['"]CR2032['"]/.test(src),
      'battery radars runtime setEnergy');
    assert.ok(src.includes('1_800_000'), '30min re-heal delay');
  });

  it('clrdrnya stays on presence_sensor_radar (sacred couple)', () => {
    const compose = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/driver.compose.json'), 'utf8'));
    const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.some((m) => m.includes('clrdrnya')), 'clrdrnya fingerprint retained');
  });
});
