'use strict';

/**
 * Tests — SensorSuppressionManager (v9.0.402, P92.105)
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const SensorSuppressionManager = require('../lib/managers/SensorSuppressionManager');

describe('SensorSuppressionManager', () => {
  it('suppresses and reports a device', () => {
    const mgr = new SensorSuppressionManager(null);
    assert.strictEqual(mgr.suppress('dev1', 30, 'Hallway'), true);
    assert.strictEqual(mgr.isSuppressed('dev1'), true);
    const report = mgr.getReport();
    assert.strictEqual(report.suppressed_count, 1);
    assert.strictEqual(report.suppressed[0].name, 'Hallway');
    assert.ok(report.suppressed[0].remaining_minutes <= 30);
    mgr.destroy();
  });

  it('unsuppress lifts the mute', () => {
    const mgr = new SensorSuppressionManager(null);
    mgr.suppress('dev1', 30);
    assert.strictEqual(mgr.unsuppress('dev1'), true);
    assert.strictEqual(mgr.isSuppressed('dev1'), false);
    assert.strictEqual(mgr.unsuppress('dev1'), false);
    mgr.destroy();
  });

  it('re-suppressing resets the expiry (no double timer)', () => {
    const mgr = new SensorSuppressionManager(null);
    mgr.suppress('dev1', 10);
    mgr.suppress('dev1', 60);
    const report = mgr.getReport();
    assert.strictEqual(report.suppressed_count, 1);
    assert.ok(report.suppressed[0].remaining_minutes > 10);
    mgr.destroy();
  });

  it('suppressible card detection is scoped to motion/presence', () => {
    const mgr = new SensorSuppressionManager(null);
    assert.strictEqual(mgr.isSuppressibleCard('motion_sensor_motion_detected'), true);
    assert.strictEqual(mgr.isSuppressibleCard('presence_sensor_radar_presence_detected'), true);
    assert.strictEqual(mgr.isSuppressibleCard('sensor_battery_low'), false);
    assert.strictEqual(mgr.isSuppressibleCard('device_became_unavailable'), false);
    assert.strictEqual(mgr.isSuppressibleCard(null), false);
    mgr.destroy();
  });

  it('timer uses globalThis fallback without homey', () => {
    const mgr = new SensorSuppressionManager(null);
    mgr.suppress('dev1', 1);
    assert.ok(mgr._suppressed.get('dev1').timer, 'timer created via globalThis');
    mgr.destroy();
    assert.strictEqual(mgr.isSuppressed('dev1'), false);
  });
});
