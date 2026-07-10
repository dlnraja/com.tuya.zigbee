'use strict';

const assert = require('assert');
const EventEmitter = require('events');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'zigbee-clusters') {
    return { CLUSTER: { POWER_CONFIGURATION: 'powerConfiguration' } };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const BatteryRouter = require('../../lib/helpers/BatteryRouter');
const SmartBatteryManager = require('../../lib/managers/SmartBatteryManager');

Module._load = originalLoad;

function createDevice() {
  const values = {};
  const store = {};
  const capabilities = new Set(['measure_battery']);
  const manager = new EventEmitter();

  return {
    values,
    store,
    tuyaEF00Manager: manager,
    on: manager.on.bind(manager),
    emit: manager.emit.bind(manager),
    log: () => {},
    driver: { id: 'button_wireless_2' },
    zclNode: { endpoints: {} },
    getSettings: () => ({}),
    getStore: () => store,
    getStoreValue: key => store[key],
    setStoreValue: async (key, value) => {
      store[key] = value;
    },
    hasCapability: cap => capabilities.has(cap),
    addCapability: async cap => capabilities.add(cap),
    removeCapability: async cap => capabilities.delete(cap),
    getCapabilityValue: cap => values[cap] ?? null,
    setCapabilityValue: async (cap, value) => {
      values[cap] = value;
    },
    safeSetCapabilityValue: async (cap, value) => {
      values[cap] = value;
    },
  };
}

describe('secondary battery paths', function() {
  it('shares the extended Tuya battery and voltage DP matrix', function() {
    assert(BatteryRouter.TUYA_BATTERY_DPS.includes(3), 'DP3 state battery must be routed');
    assert(BatteryRouter.TUYA_BATTERY_DPS.includes(121), 'DP121 extended battery must be routed');
    assert.deepStrictEqual(BatteryRouter.TUYA_VOLTAGE_DPS, [33, 35, 247]);
  });

  it('uses marked 50% estimates and replaces them with real router DP values', async function() {
    const device = createDevice();

    await BatteryRouter.configureBatteryReporting(device, {
      source: BatteryRouter.BatterySource.TUYA_DP,
      method: 'tuya_dp_listener',
      dps: [121],
    });

    assert.strictEqual(device.values.measure_battery, 50);
    assert.strictEqual(device.store.last_battery_estimated, true);
    assert.strictEqual(device.store.last_battery_source, 'battery-router-estimated-default');

    device.tuyaEF00Manager.emit('dp-121', 88);
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(device.values.measure_battery, 88);
    assert.strictEqual(device.store.last_battery_estimated, false);
    assert.strictEqual(device.store.last_battery_source, 'battery-router-tuya-dp-121');
  });

  it('does not let router sentinels overwrite existing battery values', async function() {
    const device = createDevice();
    device.values.measure_battery = 74;

    await BatteryRouter.configureBatteryReporting(device, {
      source: BatteryRouter.BatterySource.TUYA_DP,
      method: 'tuya_dp_listener',
      dps: [4],
    });

    device.tuyaEF00Manager.emit('dp-4', 255);
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(device.values.measure_battery, 74);
    assert.strictEqual(device.store.last_battery_source, undefined);

    await BatteryRouter.configureBatteryReporting(device, {
      source: BatteryRouter.BatterySource.TUYA_DP,
      method: 'tuya_dp_listener',
      dps: [102],
    });

    device.tuyaEF00Manager.emit('dp-102', 1);
    await new Promise(resolve => setImmediate(resolve));

    assert.strictEqual(device.values.measure_battery, 74);
  });

  it('routes SmartBatteryManager extended DPs through the unified cascade', async function() {
    const device = createDevice();
    const manager = new SmartBatteryManager(device);

    assert.strictEqual(await manager.handleDP(121, 91), true);
    assert.strictEqual(device.values.measure_battery, 91);
    assert.strictEqual(device.store.last_battery_source, 'smart-tuya-dp-121');

    assert.strictEqual(await manager.handleDP(4, 255), true);
    assert.strictEqual(device.values.measure_battery, 91);

    assert.strictEqual(await manager.handleDP(102, 1), true);
    assert.strictEqual(device.values.measure_battery, 91);
  });
});
