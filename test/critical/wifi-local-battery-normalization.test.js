'use strict';

const assert = require('assert');

const Module = require('module');
const originalLoad = Module._load;
Module._load = function patchedHomeyLoad(request, parent, isMain) {
  if (request === 'homey') {
    return { Device: class {} };
  }
  if (request === './TuyaLocalClient') {
    return class TuyaLocalClientMock {};
  }
  return originalLoad.call(this, request, parent, isMain);
};
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
Module._load = originalLoad;

function createLocalDevice() {
  const values = {};
  const store = {};
  const device = Object.create(TuyaLocalDevice.prototype);

  device.dpMappings = {
    4: { capability: 'measure_battery' },
    6: { capability: 'measure_battery' },
    15: { capability: 'measure_battery' },
    33: { capability: 'measure_battery' },
    102: { capability: 'measure_battery' },
    20: { capability: 'measure_power', divisor: 10 },
  };
  device.values = values;
  device.store = store;
  device.log = () => {};
  device.error = () => {};
  device.getSettings = () => ({});
  device.getStore = () => store;
  device.getData = () => ({ modelId: 'wifi-test' });
  device.hasCapability = cap => ['measure_battery', 'measure_power'].includes(cap);
  device.getCapabilityValue = cap => values[cap] ?? null;
  device.setCapabilityValue = async (cap, value) => {
    values[cap] = value;
  };
  device.setStoreValue = async (key, value) => {
    store[key] = value;
  };

  return device;
}

describe('Wi-Fi local battery normalization', function() {
  it('uses the unified battery cascade for local-first Wi-Fi DP batteries', function() {
    const device = createLocalDevice();

    assert.strictEqual(device._fromDeviceValue('measure_battery', 4, { capability: 'measure_battery' }, 200), 100);
    assert.strictEqual(device._fromDeviceValue('measure_battery', 4, { capability: 'measure_battery' }, 255), null);

    const voltagePercent = device._fromDeviceValue('measure_battery', 33, { capability: 'measure_battery' }, 3000);
    assert(voltagePercent >= 90 && voltagePercent <= 100, `3000mV should normalize near full, got ${voltagePercent}`);
  });

  it('stores real Wi-Fi battery sources and leaves non-battery transforms unchanged', async function() {
    const device = createLocalDevice();

    await device._onData({ dps: { 4: 200, 20: 123 } });

    assert.strictEqual(device.values.measure_battery, 100);
    assert.strictEqual(device.values.measure_power, 12.3);
    assert.strictEqual(device.store.last_battery_percentage, 100);
    assert.strictEqual(device.store.last_battery_source, 'wifi-dp-4');
    assert.strictEqual(device.store.last_battery_estimated, false);
  });

  it('does not overwrite an existing battery value with invalid Wi-Fi sentinels', async function() {
    const device = createLocalDevice();
    device.values.measure_battery = 74;

    await device._onData({ dps: { 4: 255 } });

    assert.strictEqual(device.values.measure_battery, 74);
    assert.strictEqual(device.store.last_battery_percentage, undefined);

    await device._onData({ dps: { 102: 1 } });

    assert.strictEqual(device.values.measure_battery, 74);
  });
});
