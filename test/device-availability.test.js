'use strict';

/**
 * Tests — DeviceAvailabilityManager (v9.0.401, P92.104)
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const DeviceAvailabilityManager = require('../lib/managers/DeviceAvailabilityManager');

function fakeDevice(id, caps = []) {
  return {
    id,
    getData: () => ({ id }),
    getName: () => `Device ${id}`,
    getCapabilities: () => caps,
  };
}

describe('DeviceAvailabilityManager', () => {
  it('classifies battery vs mains from capabilities', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('a', ['onoff']));
    mgr.registerDevice(fakeDevice('b', ['onoff', 'measure_battery']));
    assert.strictEqual(mgr.getReport().mains_devices, 1);
    assert.strictEqual(mgr.getReport().battery_devices, 1);
    mgr.destroy();
  });

  it('marks mains device unavailable after 15 min silent, battery not before 24h', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('mains1', ['onoff']));
    mgr.registerDevice(fakeDevice('batt1', ['measure_battery']));
    const events = [];
    mgr.on('unavailable', (d) => events.push(d));

    const now = Date.now();
    mgr._devices.get('mains1').lastSeen = now - 16 * 60 * 1000;   // 16 min
    mgr._devices.get('batt1').lastSeen = now - 16 * 60 * 1000;    // 16 min
    mgr._evaluate();
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].deviceId, 'mains1');
    assert.strictEqual(mgr.isUnavailable('mains1'), true);
    assert.strictEqual(mgr.isUnavailable('batt1'), false);

    mgr._devices.get('batt1').lastSeen = now - 25 * 60 * 60 * 1000; // 25 h
    mgr._evaluate();
    assert.strictEqual(mgr.isUnavailable('batt1'), true);
    mgr.destroy();
  });

  it('emits back_online with minutes_silent when a device reports again', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('x', ['onoff']));
    const backEvents = [];
    mgr.on('back_online', (d) => backEvents.push(d));

    mgr._devices.get('x').lastSeen = Date.now() - 20 * 60 * 1000;
    mgr._evaluate();
    assert.strictEqual(mgr.isUnavailable('x'), true);

    mgr.markSeen('x');
    assert.strictEqual(mgr.isUnavailable('x'), false);
    assert.strictEqual(backEvents.length, 1);
    assert.strictEqual(typeof backEvents[0].minutes_silent, 'number');
    mgr.destroy();
  });

  it('does not re-emit unavailable while already unavailable', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('y', ['onoff']));
    const events = [];
    mgr.on('unavailable', (d) => events.push(d));
    mgr._devices.get('y').lastSeen = Date.now() - 30 * 60 * 1000;
    mgr._evaluate();
    mgr._evaluate();
    assert.strictEqual(events.length, 1);
    mgr.destroy();
  });

  it('report lists unavailable devices by name', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('z', ['onoff']));
    mgr._devices.get('z').lastSeen = Date.now() - 60 * 60 * 1000;
    mgr._evaluate();
    const report = mgr.getReport();
    assert.strictEqual(report.unavailable_count, 1);
    assert.strictEqual(report.unavailable[0].name, 'Device z');
    mgr.destroy();
  });

  it('timer uses globalThis fallback when homey is absent', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.start();
    assert.ok(mgr._evalTimer, 'timer started via globalThis');
    mgr.destroy();
  });
});
