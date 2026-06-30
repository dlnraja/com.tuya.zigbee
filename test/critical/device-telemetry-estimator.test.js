'use strict';

const assert = require('assert');

const DeviceTelemetryEstimator = require('../../lib/utils/DeviceTelemetryEstimator');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

class FakeDevice {
  constructor({ capabilities = [], values = {}, store = {}, settings = {}, driverId = 'button_remote', deviceClass = 'sensor', name = 'Test device' } = {}) {
    this.capabilities = new Set(capabilities);
    this.values = { ...values };
    this.store = { ...store };
    this.settings = { ...settings };
    this.driver = { id: driverId };
    this.deviceClass = deviceClass;
    this.name = name;
    this.homey = {
      setInterval: (fn, ms) => {
        const handle = setInterval(fn, ms);
        handle.unref?.();
        return handle;
      },
      clearInterval,
    };
  }

  hasCapability(capability) {
    return this.capabilities.has(capability);
  }

  getCapabilityValue(capability) {
    return this.values[capability] ?? null;
  }

  async safeSetCapabilityValue(capability, value) {
    if (!this.hasCapability(capability)) return false;
    this.values[capability] = value;
    return true;
  }

  async setCapabilityValue(capability, value) {
    return this.safeSetCapabilityValue(capability, value);
  }

  getStoreValue(key) {
    return this.store[key];
  }

  async setStoreValue(key, value) {
    this.store[key] = value;
  }

  getSetting(key) {
    return this.settings[key];
  }

  getClass() {
    return this.deviceClass;
  }

  getName() {
    return this.name;
  }

  log() {}
}

async function withEstimator(device, fn) {
  const estimator = new DeviceTelemetryEstimator(device);
  try {
    await estimator.init();
    await fn(estimator);
  } finally {
    estimator.destroy();
  }
}

describe('DeviceTelemetryEstimator', () => {
  it('fills a missing battery with a marked estimate instead of leaving null', async () => {
    const device = new FakeDevice({
      capabilities: ['measure_battery', 'alarm_battery'],
      values: { measure_battery: null, alarm_battery: null },
      driverId: 'remote_button',
    });

    await withEstimator(device, async () => {
      assert.strictEqual(device.values.measure_battery, 50);
      assert.strictEqual(device.values.alarm_battery, false);
      assert.strictEqual(device.store.telemetry_battery_estimated, true);
      assert.strictEqual(device.store.telemetry_measure_battery_source, 'estimated');
    });
  });

  it('keeps a direct battery value authoritative', async () => {
    const device = new FakeDevice({
      capabilities: ['measure_battery'],
      values: { measure_battery: 84 },
    });

    await withEstimator(device, async () => {
      assert.strictEqual(device.values.measure_battery, 84);
      assert.strictEqual(device.store.telemetry_battery_estimated, false);
      assert.strictEqual(device.store.last_battery_percentage, 84);
    });
  });

  it('decays a stored battery value when the device has not reported yet', async () => {
    const device = new FakeDevice({
      capabilities: ['measure_battery'],
      values: { measure_battery: null },
      store: {
        last_battery_percentage: 80,
        last_battery_time: Date.now() - (10 * DAY_MS),
      },
      driverId: 'motion_sensor',
    });

    await withEstimator(device, async () => {
      assert(device.values.measure_battery <= 80);
      assert(device.values.measure_battery >= 75);
      assert.match(device.store.telemetry_battery_estimate_reason, /^last-real:/);
    });
  });

  it('estimates power, current and energy from on/off runtime', async () => {
    const device = new FakeDevice({
      capabilities: ['onoff', 'measure_power', 'measure_current', 'measure_voltage', 'meter_power'],
      values: { onoff: true, measure_power: null, measure_current: null, measure_voltage: null, meter_power: null },
      store: {
        telemetry_usage_last_state: true,
        telemetry_usage_last_at: Date.now() - HOUR_MS,
        estimated_energy: 0.2,
      },
      settings: { nominal_power: 60, standby_power: 1 },
      driverId: 'plug_smart',
      deviceClass: 'socket',
    });

    await withEstimator(device, async () => {
      assert.strictEqual(device.values.measure_power, 60);
      assert.strictEqual(device.values.measure_voltage, 230);
      assert(Math.abs(device.values.measure_current - 0.261) < 0.001);
      assert(device.values.meter_power >= 0.259);
      assert.strictEqual(device.store.telemetry_measure_power_source, 'estimated');
    });
  });

  it('tracks usage cycles from on/off transitions', async () => {
    const device = new FakeDevice({
      capabilities: ['onoff'],
      values: { onoff: false },
      store: {
        telemetry_usage_last_state: true,
        telemetry_usage_last_at: Date.now() - 1000,
        telemetry_usage_cycle_count: 2,
      },
    });

    await withEstimator(device, async estimator => {
      assert.strictEqual(device.store.telemetry_usage_cycle_count, 2);
      device.values.onoff = true;
      await estimator.recordCapability('onoff', true);
      assert.strictEqual(device.store.telemetry_usage_cycle_count, 3);
    });
  });
});
