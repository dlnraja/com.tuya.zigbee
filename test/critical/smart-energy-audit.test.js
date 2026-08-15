'use strict';

const assert = require('assert');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const SmartEnergyManager = require('../../lib/managers/SmartEnergyManager');
const DeviceTelemetryEstimator = require('../../lib/utils/DeviceTelemetryEstimator');

function mockDevice(overrides = {}) {
  const store = {};
  const caps = new Set(overrides.capabilities || ['measure_power', 'meter_power', 'onoff']);
  const values = {};
  const device = {
    _destroyed: false,
    mainsPowered: overrides.mainsPowered !== false,
    driver: { id: overrides.driverId || 'socket_energy' },
    homey: {
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (id) => clearTimeout(id),
    },
    zclNode: overrides.zclNode || { endpoints: {} },
    log: () => {},
    error: () => {},
    getClass: () => overrides.className || 'socket',
    getSetting: (k) => (overrides.settings || {})[k],
    getCapabilities: () => [...caps],
    hasCapability: (c) => caps.has(c),
    getCapabilityValue: (c) => values[c],
    setCapabilityValue: async (c, v) => { values[c] = v; },
    safeSetCapabilityValue: async (c, v) => { values[c] = v; },
    addCapability: async (c) => { caps.add(c); },
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    _store: store,
    _values: values,
    _caps: caps,
    ...overrides,
  };
  return device;
}

describe('SmartEnergyManager 5-min audit + measured vs estimated', () => {
  it('predicts energy candidates for metered socket drivers', async () => {
    const device = mockDevice({ driverId: 'plug_energy', className: 'socket' });
    const mgr = new SmartEnergyManager(device);
    // Skip UniversalEnergyHandler ZCL bind in unit test
    mgr.universalHandler = { init: async () => {} };
    await mgr._predictCandidateCapabilities();
    for (const cap of SmartEnergyManager.ENERGY_CAPS) {
      assert.ok(mgr._candidateCaps.has(cap), `expected candidate ${cap}`);
    }
  });

  it('skips energy candidates for battery sensors', async () => {
    const device = mockDevice({
      driverId: 'motion_sensor',
      className: 'sensor',
      mainsPowered: false,
      capabilities: ['alarm_motion', 'measure_battery'],
    });
    const mgr = new SmartEnergyManager(device);
    mgr.universalHandler = { init: async () => {} };
    await mgr._predictCandidateCapabilities();
    assert.strictEqual(mgr._candidateCaps.size, 0);
  });

  it('marks DP reports as direct and isRealCapability', async () => {
    const device = mockDevice();
    const mgr = new SmartEnergyManager(device);
    mgr.universalHandler = { init: async () => {} };
    device.smartEnergy = mgr;
    await mgr.handleDP(17, 1250); // power /10-ish via AdaptiveDataParser
    assert.ok(mgr.isRealCapability('measure_power'));
    assert.strictEqual(device.getStoreValue('telemetry_measure_power_source'), 'direct');
    assert.ok(device._lastRealPowerReport > 0);
  });

  it('finalizeAudit stamps silent caps as estimated-eligible', async () => {
    const device = mockDevice({
      capabilities: ['measure_power', 'meter_power', 'measure_voltage', 'onoff'],
    });
    const mgr = new SmartEnergyManager(device);
    mgr.universalHandler = { init: async () => {} };
    device.smartEnergy = mgr;
    // Only power reported during window
    await mgr.reportMeasured('measure_power', 42, 'test');
    await mgr._finalizeAudit();
    assert.ok(mgr.isAuditComplete());
    assert.ok(mgr.isRealCapability('measure_power'));
    assert.strictEqual(device.getStoreValue('telemetry_meter_power_source'), 'estimated');
    assert.strictEqual(device.getStoreValue('telemetry_measure_voltage_source'), 'estimated');
    assert.ok(device._energyRealCaps.has('measure_power'));
    assert.ok(!device._energyRealCaps.has('meter_power'));
  });

  it('DeviceTelemetryEstimator never overwrites direct during/after audit', async () => {
    const device = mockDevice({ capabilities: ['measure_power', 'onoff'] });
    const mgr = new SmartEnergyManager(device);
    mgr.universalHandler = { init: async () => {} };
    device.smartEnergy = mgr;
    await mgr.reportMeasured('measure_power', 100, 'zcl');
    const est = DeviceTelemetryEstimator.attach(device);
    assert.strictEqual(est._shouldFill('measure_power'), false);
    mgr._auditComplete = false;
    assert.strictEqual(est._shouldFill('measure_power'), false);
  });

  it('DeviceTelemetryEstimator waits for audit before filling silent energy', async () => {
    const device = mockDevice({ capabilities: ['measure_power', 'onoff'] });
    const mgr = new SmartEnergyManager(device);
    mgr.universalHandler = { init: async () => {} };
    device.smartEnergy = mgr;
    mgr._auditComplete = false;
    const est = DeviceTelemetryEstimator.attach(device);
    assert.strictEqual(est._shouldFill('measure_power'), false);
    mgr._auditComplete = true;
    // No direct source yet — estimated fill allowed
    assert.strictEqual(est._shouldFill('measure_power'), true);
  });

  it('late advertising after audit promotes silent cap to direct', async () => {
    const device = mockDevice({ capabilities: ['measure_power', 'meter_power'] });
    const mgr = new SmartEnergyManager(device);
    mgr.universalHandler = { init: async () => {} };
    device.smartEnergy = mgr;
    await mgr._finalizeAudit();
    assert.strictEqual(device.getStoreValue('telemetry_meter_power_source'), 'estimated');
    await mgr.reportMeasured('meter_power', 1.25, 'late-dp');
    assert.ok(mgr.isRealCapability('meter_power'));
    assert.strictEqual(device.getStoreValue('telemetry_meter_power_source'), 'direct');
  });

  it('destroy clears audit timer', async () => {
    const device = mockDevice();
    const mgr = new SmartEnergyManager(device);
    mgr.universalHandler = { init: async () => {} };
    mgr._startAuditWindow();
    assert.ok(mgr._auditTimer);
    mgr.destroy();
    assert.strictEqual(mgr._auditTimer, null);
  });
});
