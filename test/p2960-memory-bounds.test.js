'use strict';
// P2960: Bastien 1.0.161 OOM (JsonStringify) regression + soak tests for the bounded collectors.
const assert = require('assert');
const { EventEmitter } = require('events');

function fakeHomey() {
  const store = {};
  const timers = new Set();
  const h = {
    sets: 0,
    settings: {
      get: async (k) => (k in store ? JSON.parse(JSON.stringify(store[k])) : null),
      set: async (k, v) => { h.sets++; store[k] = JSON.parse(JSON.stringify(v)); },
      unset: async (k) => { delete store[k]; },
    },
    store,
    timers,
    setTimeout: (fn, ms) => { const t = { fn, ms, kind: 'timeout' }; timers.add(t); return t; },
    clearTimeout: (t) => { timers.delete(t); },
    setInterval: (fn, ms) => { const t = { fn, ms, kind: 'interval' }; timers.add(t); return t; },
    clearInterval: (t) => { timers.delete(t); },
    log() {}, error() {},
  };
  return h;
}

function freshKpi() {
  delete require.cache[require.resolve('../lib/utils/energy-kpi')];
  return require('../lib/utils/energy-kpi');
}

describe('P2960 energy-kpi write-behind + caps', () => {
  it('does not serialise the whole map on every report (soak: 200 devices x 100 samples)', async () => {
    const kpi = freshKpi();
    const homey = fakeHomey();
    for (let d = 0; d < 200; d++) {
      for (let i = 0; i < 100; i++) {
        await kpi.pushEnergySample(homey, `dev${d}`, { power: i, voltage: 230, junk: 'x'.repeat(1000) });
      }
    }
    assert.strictEqual(homey.sets, 0, 'no persist before debounce');
    const pending = [...homey.timers].filter((t) => t.kind === 'timeout');
    assert.strictEqual(pending.length, 1, 'single debounced persist timer');
    await kpi.flushKpi(homey);
    assert.strictEqual(homey.sets, 1);
    const saved = homey.store.device_energy_kpi_v1;
    assert.ok(Object.keys(saved).length <= kpi.KPI_LIMITS.MAX_DEVICES);
    for (const arr of Object.values(saved)) {
      assert.ok(arr.length <= kpi.KPI_LIMITS.WINDOW_SIZE);
      assert.ok(!('junk' in arr[0]), 'unknown fields dropped');
    }
    assert.ok(JSON.stringify(saved).length < 120 * 1024, 'persisted payload bounded');
  });

  it('evicts the least recently reporting devices first and keeps KPI readable', async () => {
    const kpi = freshKpi();
    const homey = fakeHomey();
    for (let d = 0; d < kpi.KPI_LIMITS.MAX_DEVICES + 5; d++) {
      await kpi.pushEnergySample(homey, `d${d}`, { power: 10, ts: 1000 + d });
    }
    const all = await kpi.getAllKpi(homey);
    assert.ok(!('d0' in all) && ('d68' in all));
    const one = await kpi.getDeviceKpi(homey, 'd68');
    assert.ok(one);
  });

  it('sanitises a legacy oversized stored map on first load', async () => {
    const kpi = freshKpi();
    const homey = fakeHomey();
    const legacy = {};
    for (let d = 0; d < 300; d++) {legacy[`L${d}`] = Array.from({ length: 50 }, (_, i) => ({ ts: i, power: i, blob: 'y'.repeat(200) }));}
    homey.store.device_energy_kpi_v1 = legacy;
    await kpi.pushEnergySample(homey, 'new', { power: 1 });
    await kpi.flushKpi(homey);
    const saved = homey.store.device_energy_kpi_v1;
    assert.ok(Object.keys(saved).length <= kpi.KPI_LIMITS.MAX_DEVICES);
    assert.ok(Object.values(saved).every((a) => a.length <= kpi.KPI_LIMITS.WINDOW_SIZE && !a[0].blob));
  });

  it('clearDeviceKpi removes the device and persists immediately', async () => {
    const kpi = freshKpi();
    const homey = fakeHomey();
    await kpi.pushEnergySample(homey, 'a', { power: 1 });
    await kpi.clearDeviceKpi(homey, 'a');
    assert.ok(!('a' in homey.store.device_energy_kpi_v1));
    assert.strictEqual([...homey.timers].length, 0);
  });
});

function fakeDevice(homey) {
  const cluster = new EventEmitter();
  const zclNode = { endpoints: { 1: { clusters: { haElectricalMeasurement: cluster } } } };
  return {
    homey, zclNode, cluster,
    log() {}, error() {},
    hasCapability: () => false,
    getData: () => ({ id: 'x' }),
    getStoreValue: () => 'battery',
    safeSetCapabilityValue: async () => {},
  };
}

describe('P2960 data-collector: no stacked listeners / timers on re-init', () => {
  const dc = require('../lib/utils/data-collector');

  it('soak: 50 re-inits keep exactly one listener set and one interval', async () => {
    const homey = fakeHomey();
    const dev = fakeDevice(homey);
    for (let i = 0; i < 50; i++) {
      await dc.registerReportListeners(dev, dev.zclNode);
      dc.startPeriodicPolling(dev, dev.zclNode, 300000);
    }
    assert.strictEqual(dev.cluster.listenerCount('attr.activePower'), 1);
    assert.strictEqual([...homey.timers].filter((t) => t.kind === 'interval').length, 1);
  });

  it('a new zclNode (real re-init) registers again', async () => {
    const homey = fakeHomey();
    const dev = fakeDevice(homey);
    await dc.registerReportListeners(dev, dev.zclNode);
    const other = fakeDevice(homey);
    await dc.registerReportListeners(dev, other.zclNode);
    assert.strictEqual(other.cluster.listenerCount('attr.activePower'), 1);
  });

  it('stopDeviceCollection and _destroyed release the interval', async () => {
    const homey = fakeHomey();
    const dev = fakeDevice(homey);
    dc.startPeriodicPolling(dev, dev.zclNode, 1000);
    dc.stopDeviceCollection(dev);
    assert.strictEqual(homey.timers.size, 0);
    const t = dc.startPeriodicPolling(dev, dev.zclNode, 1000);
    dev._destroyed = true;
    await t.fn();
    assert.strictEqual(homey.timers.size, 0, 'interval self-cleared once device destroyed');
  });

  it('SmartDriverAdaptation no longer writes the timer handle into the store', () => {
    const src = require('fs').readFileSync(require.resolve('../lib/managers/SmartDriverAdaptation'), 'utf8');
    assert.ok(!/setStoreValue\('pollingInterval', pollingInterval\)/.test(src));
  });

  it('device bases call stopDeviceCollection on delete/uninit', () => {
    const fs = require('fs');
    for (const f of ['../lib/tuya/TuyaZigbeeDevice.js', '../lib/devices/BaseUnifiedDevice.js']) {
      assert.ok(fs.readFileSync(require.resolve(f), 'utf8').includes('stopDeviceCollection(this)'), f);
    }
  });
});

describe('P2960 legacy log-buffer + migration-queue caps', () => {
  it('log-buffer bounds each entry and the total payload', async () => {
    const homey = fakeHomey();
    global.Homey = { app: { homey } };
    try {
      delete require.cache[require.resolve('../lib/utils/log-buffer')];
      const lb = require('../lib/utils/log-buffer');
      for (let i = 0; i < 700; i++) {await lb.pushLog({ err: 'z'.repeat(5000), i });}
      const stored = homey.store[lb.LOG_KEY];
      assert.ok(stored.length <= lb.LOG_LIMITS.MAX_ENTRIES);
      assert.ok(JSON.stringify(stored).length <= lb.LOG_LIMITS.MAX_TOTAL_CHARS);
      assert.strictEqual(stored[stored.length - 1].entry.truncated, true);
      const circ = {}; circ.self = circ;
      assert.strictEqual(lb._boundEntry(circ), '[unserialisable]');
    } finally { delete global.Homey; }
  });

  it('migration queue is capped', async () => {
    const mq = require('../lib/utils/migration-queue');
    const homey = fakeHomey();
    for (let i = 0; i < mq.MAX_QUEUE + 40; i++) {await mq.queueMigration(homey, `dev${i}`, 'switch_1gang', 'test');}
    assert.ok(homey.store.tuya_migration_queue_v1.length <= mq.MAX_QUEUE);
  });
});

describe('P2960 heap regression (soak)', () => {
  it('10k KPI reports on 300 devices do not grow the heap by more than 8 MB', async function () {
    this.timeout(20000);
    const kpi = freshKpi();
    const homey = fakeHomey();
    if (global.gc) {global.gc();}
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 10000; i++) {await kpi.pushEnergySample(homey, `d${i % 300}`, { power: i, voltage: 230, current: 0.1 });}
    await kpi.flushKpi(homey);
    if (global.gc) {global.gc();}
    const grew = process.memoryUsage().heapUsed - before;
    assert.ok(grew < 8 * 1024 * 1024, `heap grew ${Math.round(grew / 1024)} KB`);
  });
});
