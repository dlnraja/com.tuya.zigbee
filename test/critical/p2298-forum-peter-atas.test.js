'use strict';

/**
 * P2298 — Forum T140352 text+images (BOTH backport):
 * - Peter #2202/#2203: late MFR-ENSURE must re-arm SH-SC07 0xFD
 * - A_Tas #2199: mmwave settings must never throw to Homey UI
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2298 forum T140352 Peter button + A_Tas settings (stable)', () => {
  it('ManufacturerNameHelper hooks identity resolve after setSettings', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/helpers/ManufacturerNameHelper.js'), 'utf8');
    assert.ok(src.includes('_onZigbeeIdentityResolved'), 'identity hook');
    assert.ok(src.includes('P2298'), 'P2298 marker');
  });

  it('PhysicalButtonMixin re-arms OnOff 0xFD on identity resolve', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/mixins/PhysicalButtonMixin.js'), 'utf8');
    assert.ok(src.includes('async _onZigbeeIdentityResolved'), 'hook method');
    assert.ok(src.includes('initPhysicalButtonDetection'), 're-init physical');
    assert.ok(src.includes('mrpevh8p'), 'SH-SC07 mfr');
  });

  it('IntelligentBattery locks mrpevh8p / TS0041 by couple', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/intelligent/IntelligentDeviceAdapter.js'), 'utf8');
    assert.ok(src.includes('mrpevh8p'), 'couple lock');
    assert.ok(src.includes('_mustKeepBatteryCapability'), 'keep lock');
  });

  it('Hybrid skips protocol disable on buttonish drivers', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/protocol/HybridProtocolManager.js'), 'utf8');
    assert.ok(src.includes('isButtonish'), 'buttonish lock');
  });

  it('mmwave onSettings has outer soft-fail (A_Tas)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/motion_sensor_radar_mmwave/device.js'), 'utf8');
    assert.ok(src.includes('onSettings outer soft-fail'), 'outer catch');
  });

  it('Elliot CO2 couple is on air_quality_co2 not climate_sensor', () => {
    const co2 = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/air_quality_co2/driver.compose.json'), 'utf8'));
    const climate = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/climate_sensor/driver.compose.json'), 'utf8'));
    assert.ok((co2.zigbee.manufacturerName || []).some((m) => /ogkdpgy2/i.test(m)), 'co2 has ogkdpgy2');
    assert.ok(!(climate.zigbee.manufacturerName || []).some((m) => /ogkdpgy2/i.test(m)), 'climate must not steal ogkdpgy2');
  });
});
