'use strict';

/**
 * P3028 — ideas from Rick_D's SHS Device Watchdog (community.homey.app/t/157537),
 * rewritten: learned reporting gaps (raise-only), event-only remotes, flap /
 * mass-outage hints, stale battery reading hint, transient low-battery dip.
 */

const assert = require('assert');
const { describe, it } = require('node:test');

const Learn = require('../../lib/managers/availability-learning');
const DeviceAvailabilityManager = require('../../lib/managers/DeviceAvailabilityManager');
const SmartBatteryLowAlarm = require('../../lib/battery/SmartBatteryLowAlarm');

const H = 60 * 60 * 1000;

function fakeDevice(id, caps = [], store = {}, cls) {
  return {
    id,
    getData: () => ({ id }),
    getName: () => `Device ${id}`,
    getCapabilities: () => caps,
    getClass: () => cls,
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    store,
  };
}

function learned(stats, gapMs, count, start) {
  let t = start;
  for (let i = 0; i < count; i++) { t += gapMs; Learn.noteGap(stats, gapMs, t); }
  return t;
}

describe('P3028 availability-learning (pure)', () => {
  it('ignores bursts under a minute', () => {
    const st = Learn.emptyStats(0);
    Learn.noteGap(st, 5000, 5000);
    assert.strictEqual(st.n, 0);
  });

  it('stays in learning mode before 5 samples and 48 h', () => {
    const st = Learn.emptyStats(0);
    learned(st, H, 4, 0);
    assert.strictEqual(Learn.learnedTimeoutMs(st, 100 * H), null);
    const st2 = Learn.emptyStats(0);
    learned(st2, H, 10, 0);
    assert.strictEqual(Learn.learnedTimeoutMs(st2, 10 * H), null, 'needs 48 h of observation');
    assert.strictEqual(Learn.learnedTimeoutMs(st2, 49 * H), Math.ceil(H * 1.5));
  });

  it('is raise-only and capped at 7 days', () => {
    const st = Learn.emptyStats(0);
    const end = learned(st, H, 10, 0);
    const now = Math.max(end, 49 * H);
    assert.strictEqual(Learn.effectiveTimeoutMs({ baseMs: 24 * H, stats: st, eventOnly: false, now }), 24 * H);
    const big = Learn.emptyStats(0);
    learned(big, 30 * H, 6, 0);
    assert.strictEqual(Learn.effectiveTimeoutMs({ baseMs: 24 * H, stats: big, eventOnly: false, now: 200 * H }), 45 * H);
    const huge = Learn.emptyStats(0);
    learned(huge, 6 * 24 * H, 6, 0);
    assert.strictEqual(Learn.learnedTimeoutMs(huge, 40 * 24 * H), Learn.MAX_LEARNED_TIMEOUT_MS);
  });

  it('event-only devices have no silence timeout until learned', () => {
    const st = Learn.emptyStats(0);
    assert.strictEqual(Learn.effectiveTimeoutMs({ baseMs: 24 * H, stats: st, eventOnly: true, now: 100 * H }), Infinity);
    learned(st, 4 * H, 12, 0);
    assert.strictEqual(Learn.effectiveTimeoutMs({ baseMs: 24 * H, stats: st, eventOnly: true, now: 60 * H }), 24 * H);
  });

  it('old outliers fade after two 7-day windows', () => {
    const st = Learn.emptyStats(0);
    Learn.noteGap(st, 50 * H, 50 * H);
    let t = 50 * H + 8 * 24 * H;
    Learn.noteGap(st, H, t); // rotates: prev = 50 h
    assert.strictEqual(st.maxPrev, 50 * H);
    t += 8 * 24 * H;
    Learn.noteGap(st, H, t); // rotates again: outlier gone
    assert.strictEqual(Math.max(st.maxCur, st.maxPrev), H);
  });

  it('restoreStats rejects garbage and future timestamps', () => {
    assert.strictEqual(Learn.restoreStats({ n: 'x' }, 1000).n, 0);
    assert.strictEqual(Learn.restoreStats({ n: 3, mean: 1, maxCur: 1, maxPrev: 1, winStart: 1, since: 9e15 }, 1000).n, 0);
    const ok = Learn.restoreStats({ n: 3, mean: 10, maxCur: 20, maxPrev: 5, winStart: 1, since: 1 }, 1000);
    assert.strictEqual(ok.n, 3);
  });

  it('classifies remotes as event-only, sensors not', () => {
    assert.strictEqual(Learn.isEventOnlyDevice(fakeDevice('r', ['button.1', 'measure_battery']), true), true);
    assert.strictEqual(Learn.isEventOnlyDevice(fakeDevice('k', ['button', 'dim', 'measure_battery'], {}, 'button'), true), true);
    assert.strictEqual(Learn.isEventOnlyDevice(fakeDevice('s', ['measure_battery']), true), false);
    assert.strictEqual(Learn.isEventOnlyDevice(fakeDevice('m', ['alarm_motion', 'measure_battery']), true), false);
    assert.strictEqual(Learn.isEventOnlyDevice(fakeDevice('p', ['button.1', 'onoff']), false), false);
  });

  it('flap ring is bounded and detects 3 drops in 6 h', () => {
    let ring = null;
    for (let i = 0; i < 10; i++) { ring = Learn.noteFlap(ring, i * H); }
    assert.strictEqual(ring.length, Learn.FLAP_RING);
    assert.strictEqual(Learn.isFlapping([0, H, 2 * H], 3 * H), true);
    assert.strictEqual(Learn.isFlapping([0, 10 * H], 11 * H), false);
  });

  it('mass outage needs 3+ devices and 30 % of the monitored ones', () => {
    assert.strictEqual(Learn.isMassOutage(2, 3), false);
    assert.strictEqual(Learn.isMassOutage(3, 5), true);
    assert.strictEqual(Learn.isMassOutage(3, 40), false);
    assert.strictEqual(Learn.isMassOutage(12, 40), true);
  });

  it('advice codes', () => {
    const now = 30 * 24 * H;
    assert.strictEqual(Learn.adviseFor({ isBattery: true, batteryAt: now - 10 * 24 * H, unavailable: true }, now), 'battery_reading_old_device_quiet');
    assert.strictEqual(Learn.adviseFor({ eventOnly: true, learned: false }, now), 'event_only_not_monitored');
    assert.strictEqual(Learn.adviseFor({ flapping: true }, now), 'flapping_check_signal');
    assert.strictEqual(Learn.adviseFor({ learned: true, baseTimeoutMs: 24 * H, timeoutMs: 45 * H }, now), 'learned_longer_interval');
    assert.strictEqual(Learn.adviseFor({ isBattery: true, batteryAt: now - H }, now), null);
  });
});

describe('P3028 DeviceAvailabilityManager integration', () => {
  it('a remote silent for 3 days is not reported unavailable', () => {
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('remote', ['button.1', 'button.2', 'measure_battery'], {}, 'remote'));
    const ev = [];
    mgr.on('unavailable', (d) => ev.push(d));
    const e = mgr._devices.get('remote');
    e.registeredAt = Date.now() - 10 * H;
    e.lastSeen = Date.now() - 72 * H;
    mgr._evaluate();
    assert.strictEqual(ev.length, 0);
    const row = mgr.getSettingsSnapshot().rows[0];
    assert.strictEqual(row.eventOnly, true);
    assert.strictEqual(row.advice, 'event_only_not_monitored');
    mgr.destroy();
  });

  it('a 30 h sensor learns a longer timeout and persists the stats', () => {
    const store = {};
    const mgr = new DeviceAvailabilityManager(null);
    mgr.registerDevice(fakeDevice('door', ['alarm_contact', 'measure_battery'], store));
    const e = mgr._devices.get('door');
    const now = Date.now();
    e.registeredAt = now - 400 * H;
    e.gapStats = Learn.emptyStats(now - 400 * H);
    let t = now - 400 * H;
    for (let i = 0; i < 6; i++) { t += 30 * H; Learn.noteGap(e.gapStats, 30 * H, t); }
    assert.strictEqual(mgr._timeoutFor(e, now), 45 * H);
    // a real frame after a long in-session gap is learned and persisted
    e.lastSeen = now - 2 * H;
    mgr.markSeen('door');
    assert.ok(store[DeviceAvailabilityManager.GAP_STATS_STORE_KEY], 'gap stats persisted');
    // 26 h silent: under the learned 45 h → still available
    e.lastSeen = Date.now() - 26 * H;
    mgr._evaluate();
    assert.strictEqual(mgr.isUnavailable('door'), false);
    mgr.destroy();
  });

  it('does not learn the downtime gap across an app restart', () => {
    const mgr = new DeviceAvailabilityManager(null);
    const now = Date.now();
    mgr.registerDevice(fakeDevice('t', ['measure_temperature', 'measure_battery'], { avail_last_seen_ts: now - 20 * H }));
    mgr.markSeen('t');
    assert.strictEqual(mgr._devices.get('t').gapStats.n, 0);
    mgr.destroy();
  });

  it('flags a mass outage when many devices drop in one pass', () => {
    const mgr = new DeviceAvailabilityManager(null);
    const ev = [];
    mgr.on('unavailable', (d) => ev.push(d));
    for (const id of ['a', 'b', 'c', 'd']) {
      mgr.registerDevice(fakeDevice(id, ['onoff']));
      const e = mgr._devices.get(id);
      e.registeredAt = Date.now() - H;
      e.lastSeen = Date.now() - 20 * 60 * 1000;
    }
    mgr._evaluate();
    assert.strictEqual(ev.length, 4);
    assert.ok(ev.every((d) => d.mass_outage === true));
    assert.ok(mgr.getReport().last_mass_outage);
    mgr.destroy();
  });

  it('a lone mains drop is not a mass outage', () => {
    const mgr = new DeviceAvailabilityManager(null);
    const ev = [];
    mgr.on('unavailable', (d) => ev.push(d));
    mgr.registerDevice(fakeDevice('x', ['onoff']));
    const e = mgr._devices.get('x');
    e.registeredAt = Date.now() - H;
    e.lastSeen = Date.now() - 20 * 60 * 1000;
    mgr._evaluate();
    assert.strictEqual(ev[0].mass_outage, false);
    mgr.destroy();
  });
});

describe('P3028 transient low-battery dip', () => {
  const th = { low: 20, clear: 25 };
  it('holds one big drop, confirms on the next low reading', () => {
    const d = {};
    assert.strictEqual(SmartBatteryLowAlarm.isUnconfirmedDip(d, false, 62, th), false);
    assert.strictEqual(SmartBatteryLowAlarm.isUnconfirmedDip(d, false, 1, th), true);
    assert.strictEqual(SmartBatteryLowAlarm.isUnconfirmedDip(d, false, 1, th), false);
  });
  it('a slow drain is never delayed', () => {
    const d = {};
    SmartBatteryLowAlarm.isUnconfirmedDip(d, false, 23, th);
    assert.strictEqual(SmartBatteryLowAlarm.isUnconfirmedDip(d, false, 19, th), false);
  });
  it('first reading and already-low are untouched; invalid values ignored', () => {
    assert.strictEqual(SmartBatteryLowAlarm.isUnconfirmedDip({}, null, 5, th), false);
    const d = {};
    SmartBatteryLowAlarm.isUnconfirmedDip(d, true, 80, th);
    assert.strictEqual(SmartBatteryLowAlarm.isUnconfirmedDip(d, true, 5, th), false);
    const e = {};
    SmartBatteryLowAlarm.isUnconfirmedDip(e, false, 200, th);
    assert.strictEqual(SmartBatteryLowAlarm.isUnconfirmedDip(e, false, 5, th), false);
  });
});
