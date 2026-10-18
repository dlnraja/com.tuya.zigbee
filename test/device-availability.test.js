'use strict';

/**
 * Tests — DeviceAvailabilityManager (v9.0.401, P92.104)
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const DeviceAvailabilityManager = require('../lib/managers/DeviceAvailabilityManager');

function fakeDevice(id, caps = [], store = {}) {
  return {
    id,
    getData: () => ({ id }),
    getName: () => `Device ${id}`,
    getCapabilities: () => caps,
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    store,
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
    mgr._devices.get('mains1').registeredAt = now - 6 * 60 * 1000;
    mgr._devices.get('batt1').registeredAt = now - 6 * 60 * 1000;
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

    mgr._devices.get('x').registeredAt = Date.now() - 6 * 60 * 1000;
    mgr._devices.get('x').lastSeen = Date.now() - 20 * 60 * 1000;
    mgr._evaluate();
    assert.strictEqual(mgr.isUnavailable('x'), true);

    mgr.markSeen('x');
    assert.strictEqual(mgr.isUnavailable('x'), false);
    assert.strictEqual(backEvents.length, 1);
    assert.strictEqual(typeof backEvents[0].minutes_silent, 'number');
    mgr.destroy();
  });

  it('emits rejoined on a short power-cut before the unavailable timeout', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('rejoin1', ['onoff']));
    const rejoins = [];
    mgr.on('rejoined', (d) => rejoins.push(d));
    mgr._devices.get('rejoin1').lastSeen = Date.now() - 45 * 1000;
    mgr.markSeen('rejoin1');
    assert.strictEqual(rejoins.length, 1);
    assert.ok(rejoins[0].gap_ms >= 30000);
    assert.strictEqual(rejoins[0].reason, 'power_restore');
    assert.strictEqual(mgr.isUnavailable('rejoin1'), false);
    assert.strictEqual(mgr.getReport().power_restore_count, 1);
    mgr.destroy();
  });

  it('noteBootDump fires after init guard and ignores the next duplicate burst', () => {
    const mgr = new DeviceAvailabilityManager(null);
    const dev = fakeDevice('dump1', ['onoff']);
    mgr.registerDevice(dev);
    mgr._devices.get('dump1').registeredAt = Date.now() - 2 * 60 * 1000;
    const rejoins = [];
    mgr.on('rejoined', (d) => rejoins.push(d));
    assert.strictEqual(mgr.noteBootDump(dev), true);
    assert.strictEqual(rejoins[0].reason, 'boot_dump');
    assert.strictEqual(mgr.noteBootDump(dev), false);
    assert.strictEqual(rejoins.length, 1);
    mgr.destroy();
  });

  it('uses 2x interval EMA for mains timeout, never below 3 minutes', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('ema1', ['onoff']));
    const entry = mgr._devices.get('ema1');
    entry.intervalEma = 90 * 1000;
    assert.strictEqual(mgr._timeoutFor(entry), 3 * 60 * 1000);
    entry.intervalEma = 8 * 60 * 1000;
    assert.strictEqual(mgr._timeoutFor(entry), 16 * 60 * 1000);
    mgr.destroy();
  });

  it('backs off plug polling while unavailable', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('plug1', ['measure_power']));
    assert.strictEqual(mgr.nextPollDelayMs('plug1'), 0);
    mgr._devices.get('plug1').unavailableSince = Date.now();
    mgr.notePollFailure('plug1');
    assert.ok(mgr.nextPollDelayMs('plug1') >= 5000);
    mgr.destroy();
  });

  it('does not re-emit unavailable while already unavailable', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('y', ['onoff']));
    const events = [];
    mgr.on('unavailable', (d) => events.push(d));
    mgr._devices.get('y').registeredAt = Date.now() - 6 * 60 * 1000;
    mgr._devices.get('y').lastSeen = Date.now() - 30 * 60 * 1000;
    mgr._evaluate();
    mgr._evaluate();
    assert.strictEqual(events.length, 1);
    mgr.destroy();
  });

  it('report lists unavailable devices by name', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('z', ['onoff']));
    mgr._devices.get('z').registeredAt = Date.now() - 6 * 60 * 1000;
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

  it('skips watchdog during 5 min boot grace even if lastSeen is already old', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('grace1', ['onoff']));
    const events = [];
    mgr.on('unavailable', (d) => events.push(d));
    mgr._devices.get('grace1').lastSeen = Date.now() - 20 * 60 * 1000;
    mgr._evaluate();
    assert.strictEqual(events.length, 0);
    mgr.destroy();
  });

  it('restores lastSeen from store so pre-restart offline is seen after grace', () => {
    const { LAST_SEEN_STORE_KEY } = DeviceAvailabilityManager;
    const twoDaysAgo = Date.now() - 48 * 60 * 60 * 1000;
    const dev = fakeDevice('stale1', ['onoff'], { [LAST_SEEN_STORE_KEY]: twoDaysAgo });
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(dev);
    assert.ok(Math.abs(mgr._devices.get('stale1').lastSeen - twoDaysAgo) < 1000);
    mgr._devices.get('stale1').registeredAt = Date.now() - 6 * 60 * 1000;
    const events = [];
    mgr.on('unavailable', (d) => events.push(d));
    mgr._evaluate();
    assert.strictEqual(events.length, 1);
    mgr.destroy();
  });

  it('persists lastSeen on markSeen', async () => {
    const { LAST_SEEN_STORE_KEY } = DeviceAvailabilityManager;
    const store = {};
    const dev = fakeDevice('persist1', ['onoff'], store);
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(dev);
    mgr._devices.get('persist1')._lastPersistAt = 0;
    mgr.markSeen('persist1');
    assert.ok(Number(store[LAST_SEEN_STORE_KEY]) > 0);
    mgr.destroy();
  });

  it('exports a serializable settings snapshot without device objects', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('a', ['onoff']));
    mgr.registerDevice(fakeDevice('b', ['measure_battery']));
    const snap = mgr.getSettingsSnapshot();
    assert.strictEqual(snap.total_devices, 2);
    assert.strictEqual(snap.rows.length, 2);
    assert.ok(!snap.rows[0].device);
    assert.ok(typeof snap.rows[0].name === 'string');
    mgr.destroy();
  });

  it('counts RX frames for last hour / 24h and names the busiest device', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('quiet', ['onoff']));
    mgr.registerDevice(fakeDevice('chatty', ['onoff']));
    for (let i = 0; i < 5; i++) {mgr.markSeen('chatty');}
    mgr.markSeen('quiet');
    const traffic = mgr.getTrafficSummary();
    assert.strictEqual(traffic.busiest.id, 'chatty');
    assert.strictEqual(traffic.busiest.lastHour, 5);
    assert.strictEqual(traffic.busiest.last24h, 5);
    const snap = mgr.getSettingsSnapshot();
    assert.strictEqual(snap.rows.find((r) => r.id === 'chatty').rxLastHour, 5);
    assert.match(mgr.formatTrafficLabel('quiet'), /RX 1\/1h/);
    const chatty = mgr._devices.get('chatty');
    chatty.rxSlot -= 2;
    mgr.markSeen('chatty');
    assert.strictEqual(mgr._rxLastHour(chatty), 1);
    assert.ok(mgr._rxLast24h(chatty) >= 6);
    mgr.destroy();
  });
});
