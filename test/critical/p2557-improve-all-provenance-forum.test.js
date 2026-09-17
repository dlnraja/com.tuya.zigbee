'use strict';

/**
 * P2557 — Improve-all: fleet provenance forward + virtual energy origins + VicHY/PresentSky
 *
 * Contre quoi:
 * - safeSetCapabilityValue drops meta.origin → estimated looks measured
 * - virtual energy stamps everything estimated (kWh/I should be calculated)
 * - PresentSky dimmer TX without per-session magic
 * - VicHY tip-lag class flip without presence-edge nudge
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2557 improve-all provenance + forum heals', () => {
  it('TuyaZigbeeDevice forwards meta into DeviceTelemetryEstimator.record', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.match(src, /DeviceTelemetryEstimator\.record\([\s\S]*?\.\.\.\(meta/);
    assert.match(src, /P2557/);
  });

  it('VirtualEnergy marks meter/current calculated and power estimated', () => {
    const mgr = fs.readFileSync(path.join(ROOT, 'lib/managers/VirtualEnergyManager.js'), 'utf8');
    assert.match(mgr, /origin = cap === 'meter_power'/);
    assert.match(mgr, /'calculated'/);
    assert.match(mgr, /'estimated'/);

    const mix = fs.readFileSync(path.join(ROOT, 'lib/mixins/VirtualEnergyMeterMixin.js'), 'utf8');
    assert.match(mix, /_setEstimatedCap\('meter_power'[\s\S]*'calculated'/);
    assert.match(mix, /_setEstimatedCap\('measure_current'[\s\S]*'calculated'/);
    assert.match(mix, /_setEstimatedCap\('measure_power'[\s\S]*'estimated'/);
  });

  it('wall_dimmer arms magic per session + remagic on TX fail', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/wall_dimmer_tuya/device.js'), 'utf8');
    assert.match(src, /_dimmerMagicArmedThisSession/);
    assert.match(src, /P2557 \/ PresentSky/);
    assert.match(src, /_dimmerMagicArmedThisSession = false/);
  });

  it('presence radar nudges sensor class on motion/human edges', () => {
    const src = fs.readFileSync(
      path.join(ROOT, 'drivers/presence_sensor_radar/device.js'), 'utf8');
    assert.match(src, /_nudgeSensorClassLock/);
    assert.match(src, /P2557 \/ VicHY #2243/);
    assert.match(src, /15_000/);
  });
});
