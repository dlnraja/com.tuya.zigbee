'use strict';

/**
 * P2506 — Homey SDK forbids measure_battery + alarm_battery together.
 * Contre quoi: native dual battery, missing hysteresis, inventing alarm_battery.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  CAP_ID,
  decideLow,
  resolveThresholds,
  shouldOwnAlarm,
} = require('../../lib/battery/SmartBatteryLowAlarm');

describe('P2506 SmartBatteryLowAlarm (app-owned, not Homey alarm_battery)', () => {
  it('capability compose exists and is not alarm_battery', () => {
    const p = path.join(ROOT, '.homeycompose/capabilities/tuya_battery_low.json');
    assert.ok(fs.existsSync(p));
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    assert.strictEqual(j.type, 'boolean');
    assert.notStrictEqual(CAP_ID, 'alarm_battery');
    assert.ok(!String(CAP_ID).startsWith('alarm_battery'));
  });

  it('flow cards exist for true/false + condition', () => {
    for (const rel of [
      '.homeycompose/flow/triggers/tuya_battery_low_true.json',
      '.homeycompose/flow/triggers/tuya_battery_low_false.json',
      '.homeycompose/flow/conditions/tuya_battery_is_low.json',
    ]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), rel);
    }
  });

  it('hysteresis: assert at low, clear only at low+hyst', () => {
    const t = { low: 20, clear: 25 };
    assert.strictEqual(decideLow(false, 19, t), true);
    assert.strictEqual(decideLow(true, 21, t), null); // still low zone
    assert.strictEqual(decideLow(true, 25, t), false);
    assert.strictEqual(decideLow(null, 50, t), false);
    assert.strictEqual(decideLow(null, 10, t), true);
  });

  it('resolveThresholds uses settings with sane bounds', () => {
    const device = {
      getSetting: (k) => (k === 'battery_low_threshold' ? 15 : k === 'battery_low_clear_hysteresis' ? 8 : undefined),
    };
    const th = resolveThresholds(device);
    assert.strictEqual(th.low, 15);
    assert.strictEqual(th.clear, 23);
  });

  it('mains / no measure_battery → do not own alarm', () => {
    assert.strictEqual(shouldOwnAlarm({ mainsPowered: true, hasCapability: () => true }), false);
    assert.strictEqual(shouldOwnAlarm({ hasCapability: (c) => c !== 'measure_battery' }), false);
    assert.strictEqual(shouldOwnAlarm({ hasCapability: (c) => c === 'measure_battery' }), true);
  });

  it('TuyaZigbeeDevice wires P2506 after measure_battery paint + boot ensure', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaZigbeeDevice.js'), 'utf8');
    assert.ok(src.includes('SmartBatteryLowAlarm'));
    assert.ok(src.includes('applyFromPercent'));
    assert.ok(src.includes('ensureCapability'));
    assert.ok(src.includes('stripNativeAlarmBattery') || (src.includes('alarm_battery') && src.includes('measure_battery')));
  });

  it('SmartBatteryLowAlarm bypasses safeSet for boolean (Contre quoi: throttle hold)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/battery/SmartBatteryLowAlarm.js'), 'utf8');
    assert.ok(src.includes('Device.prototype.setCapabilityValue') || src.includes('Homey.Device'));
  });
});
