'use strict';
/**
 * P2278 — TRV ogx8u5z6 profile + cal divisor gate
 */
const assert = require('assert');
const { describe, it } = require('node:test');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');

describe('P2278 ogx8u5z6 TRV profile', () => {
  it('compose keeps ogx8u5z6 on device_radiator_valve', () => {
    const trv = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'device_radiator_valve', 'driver.compose.json'), 'utf8'));
    assert.ok((trv.zigbee.manufacturerName || []).some((m) => /ogx8u5z6/i.test(m)));
  });

  it('device.js routes ogx8u5z6 to me167 + cal divisor 10', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers', 'device_radiator_valve', 'device.js'), 'utf8');
    assert.ok(src.includes('ogx8u5z6'));
    assert.ok(src.includes('calDivisor = /ogx8u5z6/i.test(mfr) ? 10 : 1'));
    assert.ok(src.includes("setting: 'temperature_calibration'"));
  });

  it('compose exposes temperature_calibration setting', () => {
    const trv = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'device_radiator_valve', 'driver.compose.json'), 'utf8'));
    assert.ok((trv.settings || []).some((s) => s.id === 'temperature_calibration'));
  });

  it('UnifiedThermostatBase applies setting DPs + onSettings cal TX', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'UnifiedThermostatBase.js'), 'utf8');
    assert.ok(src.includes('DP${dpId} → setting'));
    assert.ok(src.includes('cal TX DP'));
    assert.ok(src.includes("setting: 'temperature_calibration'"));
  });

  it('P2277 thermostats not on climate/TRV', () => {
    const climate = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'climate_sensor', 'driver.compose.json'), 'utf8'));
    assert.ok(!(climate.zigbee.manufacturerName || []).some((m) => /lpedvtvr/i.test(m)));
    const trv = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'device_radiator_valve', 'driver.compose.json'), 'utf8'));
    assert.ok(!(trv.zigbee.manufacturerName || []).some((m) => /xalsoe3m/i.test(m)));
    const wt = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers', 'wall_thermostat', 'driver.compose.json'), 'utf8'));
    assert.ok((wt.zigbee.manufacturerName || []).some((m) => /lpedvtvr/i.test(m)));
    assert.ok((wt.zigbee.manufacturerName || []).some((m) => /xalsoe3m/i.test(m)));
  });
});
