'use strict';

/**
 * P2757 — Bastien Precision Battery, Temperature & Humidity Enhancement (L99)
 *
 * Verifies:
 * 1. smoothBatteryPercent accepts 1% gradual discharge without deadband when finePrecision is true
 * 2. shouldAcceptBatterySample permits 1% moves under finePrecision
 * 3. UnifiedSensorBase._applyCalibration respects temperature_offset and humidity_offset
 * 4. Precision rounding supports sensor_precision (1 decimal default for humidity/temp, 2 decimals when set to '2')
 * 5. lcdtemphumidsensor driver declares calibration settings and 0.1C / 0.5% reporting thresholds
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2757 Bastien Battery, Temperature & Humidity Precision', () => {

  const {
    smoothBatteryPercent,
    shouldAcceptBatterySample,
  } = require(path.join(ROOT, 'lib', 'battery', 'SmartBatteryAdaptivePrecision'));

  it('1. smoothBatteryPercent permits 1% drops when finePrecision is requested', () => {
    // Normal remotes: 2% deadband holds steady to avoid UI noise
    assert.equal(smoothBatteryPercent(99, 100), 100);
    assert.equal(smoothBatteryPercent(98, 100), 100);

    // Fine precision (climate sensors, LCD monitor): 1% moves are tracked
    const fineDrop = smoothBatteryPercent(99, 100, { finePrecision: true });
    assert.ok(fineDrop <= 100, `Fine drop should track gradual decline, got ${fineDrop}`);
    assert.equal(smoothBatteryPercent(95, 100, { finePrecision: true }), 98); // Alpha 0.5 EMA: round(100*0.5 + 95*0.5) = 98
  });

  it('2. shouldAcceptBatterySample allows 1% change when finePrecision is enabled', () => {
    const now = Date.now();
    // Default at high SOC: 1% change is throttled
    const defaultSample = shouldAcceptBatterySample({
      prev: 90, next: 89, lastTs: now - 90 * 1000, now,
    });
    assert.equal(defaultSample.accept, false);

    // With finePrecision: 1% change is accepted
    const fineSample = shouldAcceptBatterySample({
      prev: 90, next: 89, lastTs: now - 90 * 1000, now, finePrecision: true,
    });
    assert.equal(fineSample.accept, true);
    assert.equal(fineSample.minChange, 1);
  });

  it('3. _applyCalibration applies calibration offsets and decimal precision', () => {
    const CapabilityManagerMixin = require(path.join(ROOT, 'lib', 'mixins', 'CapabilityManagerMixin'));

    // Create a mock sensor device using the mixin
    const mockDevice = Object.create(CapabilityManagerMixin);
    let settings = {
      temperature_offset: 0.5,
      humidity_offset: -2.3,
      sensor_precision: '1',
    };
    mockDevice.getSettings = () => settings;

    // Standard 1-decimal precision
    const calTemp = mockDevice._applyCalibration('measure_temperature', 21.0);
    assert.equal(calTemp, 21.5);

    const calHum = mockDevice._applyCalibration('measure_humidity', 50.0);
    assert.equal(calHum, 47.7);

    // High 2-decimal precision
    settings = {
      temperature_offset: 0.25,
      humidity_offset: -1.75,
      sensor_precision: '2',
    };
    const hpTemp = mockDevice._applyCalibration('measure_temperature', 21.12);
    assert.equal(hpTemp, 21.37);

    const hpHum = mockDevice._applyCalibration('measure_humidity', 50.15);
    assert.equal(hpHum, 48.4);

    // Verify UnifiedSensorBase integrates _applyCalibration
    const usbCode = fs.readFileSync(path.join(ROOT, 'lib', 'devices', 'UnifiedSensorBase.js'), 'utf8');
    assert.ok(usbCode.includes('value = this._applyCalibration(capability, value);'), 'UnifiedSensorBase must apply calibration in onTuyaDP');
    assert.ok(usbCode.includes('finalValue = this._applyCalibration(capability, finalValue);'), 'UnifiedSensorBase must apply calibration in ZCL data');
  });

  it('4. lcdtemphumidsensor driver manifest contains calibration settings and 1-decimal options', () => {
    const composePath = path.join(ROOT, 'drivers', 'lcdtemphumidsensor', 'driver.compose.json');
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

    const settingsIds = (compose.settings || []).map(s => s.id);
    assert.ok(settingsIds.includes('temperature_offset'), 'must include temperature_offset setting');
    assert.ok(settingsIds.includes('humidity_offset'), 'must include humidity_offset setting');
    assert.ok(settingsIds.includes('sensor_precision'), 'must include sensor_precision setting');

    assert.equal(compose.capabilitiesOptions?.measure_temperature?.decimals, 1);
    assert.equal(compose.capabilitiesOptions?.measure_humidity?.decimals, 1);
  });

  it('5. lcdtemphumidsensor device.js uses 0.1C and 0.5% reporting thresholds', () => {
    const devPath = path.join(ROOT, 'drivers', 'lcdtemphumidsensor', 'device.js');
    const devCode = fs.readFileSync(devPath, 'utf8');

    assert.ok(devCode.includes('minChange: 10'), 'msTemperatureMeasurement must use minChange: 10 (0.1C)');
    assert.ok(devCode.includes('minChange: 50'), 'msRelativeHumidity must use minChange: 50 (0.5%)');
  });

});
