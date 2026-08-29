'use strict';

/**
 * P2299 — Gmail Homey diags harvest (2026-08-21 → 2026-08-27)
 * Fixes residual issues still visible after P2298 on Test tip.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

describe('P2299 Gmail diag harvest fixes', () => {
  it('DataRecovery skips battery reporting + IAS on wireless buttons', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/DataRecoveryManager.js'), 'utf8');
    assert.ok(src.includes('skipBatteryReporting'), 'battery skip');
    assert.ok(src.includes('Skip IAS enroll for wireless button'), 'IAS skip');
  });

  it('DCM refuses alarm_battery phantom on remotes (f647d35b)', () => {
    const dcm = fs.readFileSync(path.join(ROOT, 'lib/managers/DynamicCapabilityManager.js'), 'utf8');
    assert.ok(dcm.includes("'alarm_battery'"), 'DCM irrelevant');
    const btn = fs.readFileSync(path.join(ROOT, 'lib/devices/ButtonDevice.js'), 'utf8');
    assert.ok(btn.includes("'alarm_battery'"), 'ButtonDevice forbidden');
  });

  it('Tongou OCR 60cnqlhn aliases to din_rail_meter', () => {
    const compose = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/din_rail_meter/driver.compose.json'), 'utf8'));
    assert.ok((compose.zigbee.manufacturerName || []).some((m) => /60cnqlhn/i.test(m)), 'compose OCR alias');
    const reg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/user-misattribution-registry.json'), 'utf8'));
    const tongou = (reg.cases || []).find((c) => c.id === 'tongou-to-q-sys-jzt-din-meter');
    assert.ok(tongou.mfr.some((m) => /60cnqlhn/i.test(m)), 'registry OCR alias');
    const device = fs.readFileSync(path.join(ROOT, 'drivers/din_rail_meter/device.js'), 'utf8');
    assert.ok(device.includes('60cnqlhn'), 'device Tongou detect');
  });

  it('P2298 keep-battery still present for Peter SH-SC07', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/intelligent/IntelligentDeviceAdapter.js'), 'utf8');
    assert.ok(src.includes('_mustKeepBatteryCapability') && src.includes('mrpevh8p'));
  });
});
