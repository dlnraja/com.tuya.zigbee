'use strict';
// Logs b3f8c2c6 (2026-11-04) and b2e9ffe8 (2026-11-05), master 9.0.1615.
// power_clamp_meter profile 3phase received bidirectional-clamp DP numbers.
// The same numbers were logged as unhandled and then written as temperature,
// humidity, luminance and radar sensitivity. No manufacturer name is in
// either report, so this test does not use one.

require('../_support/homey-stub');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('perf_hooks');

const Device = require('../../drivers/power_clamp_meter/device');
const Dyn = require('../../lib/dynamic/DynamicCapabilityManager');
const { KeyedLogThrottle } = require('../../lib/utils/MeterWriteCoalescer');

function clamp() {
  const writes = [];
  const logs = [];
  const dev = Object.create(Device.prototype);
  dev._ctRatio = 1;
  dev._cachedMfr = '';
  dev.getSetting = () => '';
  dev.getStoreValue = () => '';
  dev.hasCapability = () => true;
  dev.safeSetCapabilityValue = async (cap, value) => { writes.push([cap, value]); };
  dev.log = (line) => logs.push(String(line));
  dev.error = () => {};
  return { dev, writes, logs };
}

describe('P3276 clamp reports from the CPU-limit logs (no manufacturer name)', () => {
  it('scales the datapoints from the two CPU-limit logs and does not call them unhandled', () => {
    const { dev, writes, logs } = clamp();
    assert.equal(dev.meterProfile, '3phase');
    dev._handleDP(111, 4908);
    dev._handleDP(112, 2256);
    // DP 121 is PJ-1203A-specific: P3322 locks the learned profile here so the
    // rest of the burst uses the 2-channel map (the 3-phase fallback is only
    // for DPs seen before a distinctive one).
    dev._handleDP(121, 100);
    assert.equal(dev.meterProfile, 'pj1203a');
    dev._handleDP(110, 100);
    dev._handleDP(105, 0);
    dev._handleDP(113, 0);
    dev._handleDP(115, 0);
    assert.deepEqual(writes, [
      ['measure_frequency', 49.08],
      ['measure_voltage', 225.6],
      ['measure_power_factor', 1],
      ['measure_power_factor', 1],
      ['measure_power.phase2', 0],
      ['measure_power', 0],
      ['measure_current', 0],
      ['measure_power', 0],
    ]);
    assert.equal(logs.some((line) => line.includes('Unhandled')), false);
    assert.equal(logs.some((line) => /temperature|humidity|radar_sensitivity/.test(line)), false);
  });

  it('a repeated frame within 400ms does not write or log again', () => {
    const { dev, writes, logs } = clamp();
    // P3298 (CPU-limit diags b3f8c2c6/b2e9ffe8) throttles DP log lines per DP:
    // one line per minute, the muted lines are counted on the next one. A
    // controlled clock makes that contract exact instead of time-dependent.
    const clock = { t: 1_000_000 };
    dev.__p3298t = new KeyedLogThrottle({ now: () => clock.t });
    dev._handleDP(111, 4908);
    dev._handleDP(111, 4908);
    dev._handleDP(111, 4910);
    // The repeat is not written; the new reading is written at once.
    assert.deepEqual(writes, [['measure_frequency', 49.08], ['measure_frequency', 49.1]]);
    // The repeat never reaches the log; the new reading is muted inside the window...
    assert.deepEqual(logs.filter((line) => line.includes('[DP111]')), ['[DP111] = 4908 (profile: 3phase)']);
    // ...and is counted on the first line after the window (+1: the repeat was
    // dropped before the log, only the 4910 reading was muted).
    clock.t += 60_000;
    dev._handleDP(111, 4912);
    assert.deepEqual(writes[2], ['measure_frequency', 49.12]);
    assert.deepEqual(logs.filter((line) => line.includes('[DP111]')),
      ['[DP111] = 4908 (profile: 3phase)', '[DP111] = 4912 (profile: 3phase) (+1 muted in 60s)']);
  });

  it('the clamp owns those datapoints so the generic radar map does not', () => {
    const { dev } = clamp();
    for (const dp of [101, 105, 111, 112, 113, 115, 121]) {
      assert.ok(dev.dpMappings[dp], `dp ${dp}`);
    }
    assert.notEqual(dev.dpMappings[101].capability, 'radar_sensitivity');
  });

  it('dynamic enrichment does not write climate values onto a power clamp', async () => {
    const writes = [];
    const device = {
      homey: {},
      driver: { id: 'power_clamp_meter' },
      hasCapability: () => true,
      setCapabilityValue: async (cap, value) => { writes.push([cap, value]); },
      log: () => {},
      error: () => {},
    };
    const dyn = new Dyn(device);
    assert.equal(dyn._isIrrelevantCap('measure_temperature'), true);
    assert.equal(dyn._isIrrelevantCap('measure_humidity'), true);
    assert.equal(dyn._isIrrelevantCap('measure_luminance'), true);
    await dyn._applyValue({ capability: 'measure_temperature', dpId: 121, converter: 'smartTemperature' }, 100);
    await dyn._applyValue({ capability: 'measure_humidity', dpId: 111, converter: 'smartHumidity' }, 4908);
    assert.deepEqual(writes, []);
    const owned = new Dyn({
      homey: {},
      driver: { id: 'power_clamp_meter' },
      dpMappings: devFromClamp().dpMappings,
      hasCapability: () => true,
      setCapabilityValue: async () => {},
      log: () => {},
      error: () => {},
    });
    assert.equal(owned._isDriverOwnedDp(111), true);
    assert.equal(owned._isDriverOwnedDp(121), true);
  });

  it('replays the anonymized burst: distinct readings stay, repeats do not multiply', () => {
    const burst = [
      [105, 0], [105, 0], [105, 0],
      [121, 100], [121, 100], [121, 100],
      [111, 4908], [111, 4908], [111, 4908],
      [115, 0], [115, 0],
      [112, 2256], [112, 2256], [112, 2256],
      [112, 2293],
      [113, 0], [113, 0],
      [101, 0], [101, 0], [101, 0],
      [110, 100],
      [111, 4910], [111, 4912],
    ];
    const { dev, writes, logs } = clamp();
    const cpu0 = process.cpuUsage();
    const t0 = performance.now();
    const heap0 = process.memoryUsage().heapUsed;
    for (let n = 0; n < 200; n++) {
      for (const [dp, value] of burst) {dev._handleDP(dp, value);}
    }
    const elapsed = performance.now() - t0;
    const cpu = process.cpuUsage(cpu0);
    const heap = process.memoryUsage().heapUsed - heap0;
    const calls = burst.length * 200;
    const distinct = new Set(burst.map(([dp, value]) => `${dp}:${value}`)).size;
    const baselineLogs = calls * 2;
    assert.ok(writes.length < calls / 3, `writes ${writes.length} calls ${calls}`);
    assert.ok(logs.length < calls / 3, `logs ${logs.length} calls ${calls}`);
    assert.ok(writes.some(([cap, value]) => cap === 'measure_frequency' && value === 49.12));
    assert.equal(logs.some((line) => /Unhandled|temperature|humidity/.test(line)), false);
    assert.ok(dev._dpEcho.size <= 64);
    console.log(`P3276 replay calls=${calls} distinctValues=${distinct} writes=${writes.length} logs=${logs.length} baselineLogs=${baselineLogs} wallMs=${elapsed.toFixed(1)} cpuUserUs=${cpu.user} cpuSystemUs=${cpu.system} heapDelta=${heap}`);
  });

  it('a 4-byte frame and its integer are one report, and a later different value is kept', () => {
    const Mgr = require('../../lib/tuya/TuyaEF00Manager');
    const mgr = Object.create(Mgr.prototype);
    mgr.device = { driver: { id: 'power_clamp_meter' } };
    const raw = Buffer.from([0x00, 0x00, 0x13, 0x2c]);
    assert.equal(mgr._isRecentDuplicateDP(111, raw), false);
    assert.equal(mgr._isRecentDuplicateDP(111, 4908), true);
    assert.equal(mgr._isRecentDuplicateDP(111, 4910), false);
    assert.equal(mgr._isRecentDuplicateDP(1, true), false);
  });
});

function devFromClamp() {
  const dev = Object.create(Device.prototype);
  return dev;
}
