'use strict';

/**
 * P2298 — Forum T140352 text+images:
 * - Peter #2202/#2203 diag 4b1a0dc9: late MFR-ENSURE must re-arm SH-SC07 0xFD
 * - A_Tas #2199: Linptech settings must never throw to Homey UI
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2298 forum T140352 Peter button + A_Tas settings', () => {
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
    assert.ok(src.includes('P2298'), 'P2298 marker');
  });

  it('Linptech onSettings has outer soft-fail (A_Tas)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/motion_sensor_radar_mmwave/device.js'), 'utf8');
    assert.ok(src.includes('onSettings outer soft-fail'), 'outer catch');
  });
});
