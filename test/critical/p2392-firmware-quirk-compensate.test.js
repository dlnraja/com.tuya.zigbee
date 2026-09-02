'use strict';

/**
 * P2392 — Firmware quirk fleet compensation
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P2392 — firmware quirk compensations', () => {
  it('FirmwareQuirkCompensator exports heal + DIY/mains helpers', () => {
    const m = require('../../lib/resilience/FirmwareQuirkCompensator');
    assert.strictEqual(typeof m.applyFirmwareQuirkCompensations, 'function');
    assert.strictEqual(typeof m.healFirmwareQuirks, 'function');
    assert.ok(m.DIY_CAPS.includes('tuya_dp_value'));
    assert.strictEqual(m.isDiyUniversalDriver({ driver: { id: 'presence_sensor_radar' } }), false);
    assert.strictEqual(m.isDiyUniversalDriver({ driver: { id: 'device_generic_diy_universal' } }), true);
    assert.strictEqual(m.isMainsPowered({ mainsPowered: true }), true);
  });

  it('HomeyGapCompensator wires FirmwareQuirkCompensator', () => {
    const src = read('lib/resilience/HomeyGapCompensator.js');
    assert.ok(src.includes('FirmwareQuirkCompensator'));
    assert.ok(src.includes('applyFirmwareQuirkCompensations'));
  });

  it('TuyaUniversalBridge does not inject DIY caps on normal drivers', () => {
    const src = read('lib/TuyaUniversalBridge.js');
    assert.ok(src.includes('P2392'));
    assert.ok(src.includes('DIY caps disabled'));
    assert.ok(src.includes("if (!has('tuya_dp_value'))"));
  });

  it('TuyaZigbeeDevice safeSet refuses DIY caps and mains battery', () => {
    const src = read('lib/tuya/TuyaZigbeeDevice.js');
    assert.ok(src.includes('P2392'));
    assert.ok(src.includes('tuya_dp_(raw|value|string|bitmap)'));
    assert.ok(src.includes("this.mainsPowered === true"));
  });
});
