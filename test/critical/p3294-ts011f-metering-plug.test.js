'use strict';
// P3294 (issue #559 follow-up, 04/11/2026: "on/off is working, but no power metering"):
// _TZ3210_w0qqde0g / TS011F (Haozee HT-SP-ZB-01 in Z2M tuya.ts) exposes 0x0B04 + 0x0702 in its interview.
// Three gaps in UnifiedPlugBase kept the energy capabilities empty:
//  1) the meter read asked for `currentSummDelivered`, which is not a zigbee-clusters attribute name
//     (`currentSummationDelivered`), so readAttributes threw and meter_power was never read;
//  2) the 15 min energy watchdog removed measure_power/meter_power/... on a plug WITH metering clusters
//     when it had not reported yet, and nothing ever re-added them;
//  3) electricalMeasurement/metering were never bound (Z2M binds genOnOff, haElectricalMeasurement, seMetering).
require('../_support/homey-stub');
const { describe, it, before, after } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');

const P = require(path.join(__dirname, '..', '..', 'lib', 'devices', 'UnifiedPlugBase.js'));
const VALID_METER = new Set(['currentSummationDelivered', 'currentSummationReceived', 'multiplier', 'divisor', 'instantaneousDemand']);

function fakeCluster(valid, values, calls) {
  return {
    async readAttributes(names) {
      for (const n of names) { if (!valid.has(n)) { throw new TypeError(`${n} is not a valid attribute of x`); } }
      calls.push(['read', names]);
      const out = {}; for (const n of names) { if (values[n] !== undefined) { out[n] = values[n]; } }
      return out;
    },
    async configureReporting(o) { calls.push(['report', Object.keys(o)]); },
    async bind() { calls.push(['bind']); },
    on() {},
  };
}

function fakeDevice(caps, clusters) {
  const capSet = new Set(caps);
  const values = {};
  const logs = [];
  const timers = [];
  const dev = Object.create(P.prototype);
  Object.assign(dev, {
    zclNode: { endpoints: { 1: { clusters } } },
    homey: { setTimeout: (fn) => { timers.push(fn); return 1; }, setInterval: (fn) => { timers.push(fn); return 2; }, clearTimeout() {}, clearInterval() {} },
    hasCapability: (c) => capSet.has(c),
    async addCapability(c) { capSet.add(c); },
    async removeCapability(c) { capSet.delete(c); delete values[c]; },
    getCapabilityValue: (c) => (values[c] === undefined ? null : values[c]),
    getSetting: () => null, hasSetting: () => false, getData: () => ({}),
    log: (...a) => logs.push(a.join(' ')), error: (...a) => logs.push(a.join(' ')),
  });
  Object.defineProperty(dev, 'zclEnergyDivisors', { value: { power: 1, voltage: 1, current: 1000, energy: 100 } });
  dev.__values = values; dev.__caps = capSet; dev.__logs = logs; dev.__timers = timers;
  return dev;
}

describe('P3294 TS011F metering plug (#559): meter read, watchdog, restore, bind', () => {
  // capability writes land in `__values`: the parent safeSetCapabilityValue needs a full Homey device,
  // so it is swapped for the duration of this block only and restored afterwards.
  const base = Object.getPrototypeOf(P.prototype);
  const hadOwn = Object.prototype.hasOwnProperty.call(base, 'safeSetCapabilityValue');
  const orig = base.safeSetCapabilityValue;
  before(() => { base.safeSetCapabilityValue = async function (c, v) { if (this.__caps.has(c)) { this.__values[c] = v; } return true; }; });
  after(() => { if (hadOwn) { base.safeSetCapabilityValue = orig; } else { delete base.safeSetCapabilityValue; } });
  it('reads meter_power with the zigbee-clusters attribute name', async () => {
    const calls = [];
    const meter = fakeCluster(VALID_METER, { currentSummationDelivered: 1234 }, calls);
    const elec = fakeCluster(new Set(['activePower', 'rmsVoltage', 'rmsCurrent']), { activePower: 12, rmsVoltage: 231, rmsCurrent: 90 }, calls);
    const dev = fakeDevice(['onoff', 'measure_power', 'measure_voltage', 'measure_current', 'meter_power'], { onOff: fakeCluster(new Set(['onOff']), { onOff: true }, calls), metering: meter, electricalMeasurement: elec });
    await dev._readInitialPlugState(dev.zclNode);
    assert.strictEqual(dev.__values.meter_power, 12.34);
    assert.strictEqual(dev.__values.measure_power, 12);
    assert.strictEqual(dev.__values.measure_voltage, 231);
  });

  it('the watchdog keeps energy capabilities on a node that has metering clusters', async () => {
    const calls = [];
    const dev = fakeDevice(['onoff', 'measure_power', 'meter_power'], { metering: fakeCluster(VALID_METER, {}, calls), electricalMeasurement: fakeCluster(new Set(['activePower']), {}, calls) });
    dev._startEnergyCapabilityWatchdog();
    await dev.__timers[0]();
    assert.ok(dev.__caps.has('measure_power') && dev.__caps.has('meter_power'));
  });

  it('the watchdog still removes empty energy capabilities when the node has no metering cluster', async () => {
    const dev = fakeDevice(['onoff', 'measure_power'], { onOff: {} });
    dev._startEnergyCapabilityWatchdog();
    await dev.__timers[0]();
    assert.ok(!dev.__caps.has('measure_power'));
  });

  it('a real metering value re-adds a capability removed earlier (no re-pair)', async () => {
    const calls = [];
    const dev = fakeDevice(['onoff'], { metering: fakeCluster(VALID_METER, {}, calls), electricalMeasurement: fakeCluster(new Set(['activePower']), {}, calls) });
    await dev.safeSetCapabilityValue('measure_power', 40);
    assert.ok(dev.__caps.has('measure_power'));
    assert.strictEqual(dev.__values.measure_power, 40);
  });

  it('no metering cluster: an energy value does not invent a capability', async () => {
    const dev = fakeDevice(['onoff'], { onOff: {} });
    await dev.safeSetCapabilityValue('measure_power', 40);
    assert.ok(!dev.__caps.has('measure_power'));
  });

  it('binds electricalMeasurement and metering before configuring reports', async () => {
    const calls = [];
    const dev = fakeDevice(['onoff', 'measure_power', 'meter_power'], { metering: fakeCluster(VALID_METER, {}, calls), electricalMeasurement: fakeCluster(new Set(['activePower', 'rmsVoltage', 'rmsCurrent']), {}, calls) });
    await dev._setupZCLReporting(dev.zclNode);
    assert.strictEqual(calls.filter((c) => c[0] === 'bind').length, 2);
  });

  it('the periodic poll also refreshes meter_power', async () => {
    const calls = [];
    const dev = fakeDevice(['onoff', 'measure_power', 'meter_power'], { metering: fakeCluster(VALID_METER, { currentSummationDelivered: 500 }, calls), electricalMeasurement: fakeCluster(new Set(['activePower', 'rmsVoltage', 'rmsCurrent']), { activePower: 3 }, calls) });
    dev._startEnergyPoll(dev.zclNode);
    await dev.__timers[0]();
    assert.strictEqual(dev.__values.meter_power, 5);
    assert.strictEqual(dev.__values.measure_power, 3);
  });
});
