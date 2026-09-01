'use strict';

/**
 * P2364 — SOS Flow parity + lib/dynamic DynCap hardening
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..', '..');

describe('P2364 SOS Flow / DynCap', () => {
  it('driver registers physical_on/off flow cards in onInit', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_emergency_sos/driver.js'), 'utf8');
    assert.match(src, /button_emergency_sos_physical_on/);
    assert.match(src, /button_emergency_sos_physical_off/);
    const start = src.indexOf('const triggerCards = [');
    const end = src.indexOf('];', start);
    const block = src.slice(start, end);
    assert.ok(block.includes('button_emergency_sos_physical_on'), 'physical_on in triggerCards');
    assert.ok(block.includes('button_emergency_sos_physical_off'), 'physical_off in triggerCards');
  });

  it('driver exposes triggerPhysicalOff for alarm reset', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_emergency_sos/driver.js'), 'utf8');
    assert.match(src, /async triggerPhysicalOff/);
    assert.match(src, /button_emergency_sos_physical_off/);
  });

  it('device routes DP13 press types and fires physical_off on reset', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_emergency_sos/device.js'), 'utf8');
    assert.match(src, /_resolvePressType/);
    assert.match(src, /pressType === 'double'/);
    assert.match(src, /pressType === 'long'/);
    assert.match(src, /triggerPhysicalOff/);
    assert.match(src, /_dynCapBlockDps = new Set\(\[1, 4, 13, 14, 15, 101\]\)/);
  });

  it('lib/dynamic DCM blocks button class and SOS-owned DPs', async () => {
    const DynamicCapabilityManager = require('../../lib/dynamic/DynamicCapabilityManager');
    const dcm = new DynamicCapabilityManager({
      driver: { id: 'button_emergency_sos', manifest: { id: 'button_emergency_sos', class: 'button' } },
      getClass: () => 'button',
      _dynCapBlockDps: new Set([1, 4, 13, 14, 15, 101]),
      hasCapability: () => false,
      homey: {},
      log: () => {},
      error: () => {},
    });

    assert.strictEqual(dcm._isDynCapDisabledForDevice(), true);
    assert.strictEqual(dcm._isDriverOwnedDp(13), true);
    assert.strictEqual(dcm._isIrrelevantCap('measure_humidity'), true);

    const result = await dcm.processDP(13, 1, 4);
    assert.strictEqual(result, null);
  });

  it('lib/dynamic DCM refuses measure_humidity on dimmer drivers', () => {
    const DynamicCapabilityManager = require('../../lib/dynamic/DynamicCapabilityManager');
    const dcm = new DynamicCapabilityManager({
      driver: { id: 'wall_dimmer_tuya', manifest: { id: 'wall_dimmer_tuya', class: 'light' } },
      getClass: () => 'light',
      hasCapability: () => false,
      homey: {},
      log: () => {},
      error: () => {},
    });

    assert.strictEqual(dcm._isDriverOwnedDp(2), true);
    assert.strictEqual(dcm._isIrrelevantCap('measure_humidity'), true);
  });
});
