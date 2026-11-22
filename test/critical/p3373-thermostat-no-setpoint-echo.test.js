'use strict';

/**
 * P3373 - no setpoint echo loop on thermostats.
 * Source: Homey forum 146735 #504 (https://community.homey.app/t/146735/504, Magnum MRC on the
 * official Tuya cloud app): a setpoint changed on the device or in Tuya Smart is reverted within
 * 1 s. Contre quoi: our thermostats must never transmit when a setpoint REPORT comes from the
 * device - only a Homey-side command may write. RX paths checked: Zigbee UnifiedThermostatBase
 * (Tuya DP + ZCL occupiedHeatingSetpoint) and the Wi-Fi local layer (radiator_wifi_tuya, generic).
 */

require('../../tools/ci/preload-homey-stub');
const assert = require('assert');
const { describe, it } = require('../_support/dual-runner');
const UnifiedThermostatBase = require('../../lib/devices/UnifiedThermostatBase');
const RadiatorWifiTuyaDevice = require('../../drivers/radiator_wifi_tuya/device');

function baseStubs(d, tx) {
  const values = { target_temperature: 20 };
  const caps = new Set(['target_temperature', 'measure_temperature', 'thermostat_mode']);
  const listeners = {};
  Object.assign(d, {
    values,
    hasCapability: (c) => caps.has(c),
    addCapability: async (c) => { caps.add(c); },
    getCapabilityValue: (c) => values[c],
    // Homey SDK semantics: setCapabilityValue never calls the capability listener.
    setCapabilityValue: async (c, v) => { values[c] = v; },
    registerCapabilityListener: (c, fn) => { listeners[c] = fn; },
    getSetting: () => undefined, getSettings: () => ({}), setSettings: async () => {},
    getStoreValue: () => undefined, setStoreValue: async () => {}, getStore: () => ({}),
    getData: () => ({ id: 'dev-1' }), getName: () => 'Thermostat',
    homey: { app: {}, flow: { getDeviceTriggerCard: () => ({ trigger: async () => {} }) }, setTimeout, clearTimeout },
    log() {}, error() {},
  });
  d._listeners = listeners;
  d._tx = tx;
  return d;
}

const tick = () => new Promise((r) => setTimeout(r, 30));

describe('P3373 Zigbee UnifiedThermostatBase - setpoint report never written back', () => {
  function zDev() {
    const tx = [];
    const d = baseStubs(Object.create(UnifiedThermostatBase.prototype), tx);
    d._isPureTuyaDP = true;
    d.tuyaEF00Manager = { sendDP: async (...a) => { tx.push(a); } };
    d._sendTuyaDP = async (...a) => { tx.push(a); };
    // The base setter only gates/records; it never transmits (lib/tuya/TuyaZigbeeDevice).
    d.safeSetCapabilityValue = async (c, v) => { d.values[c] = v; return true; };
    d._registerCapabilityListeners();
    return d;
  }
  it('Tuya DP2 report 21.5 C updates the tile, sends nothing', async () => {
    const d = zDev();
    d._handleDP(2, 215);
    await tick();
    assert.strictEqual(d.values.target_temperature, 21.5);
    assert.deepStrictEqual(d._tx, []);
  });
  it('a Homey command still writes (control)', async () => {
    const d = zDev();
    await d._listeners.target_temperature(22);
    assert.strictEqual(d._tx.length, 1);
  });
  it('ZCL occupiedHeatingSetpoint report sends nothing', async () => {
    const d = zDev();
    const handlers = {};
    const thermostat = { on: (ev, fn) => { handlers[ev] = fn; } };
    d._setupZCLMode({ endpoints: { 1: { clusters: { thermostat } } } });
    d.writeAttributes = async (...a) => { d._tx.push(a); };
    thermostat.writeAttributes = async (...a) => { d._tx.push(a); };
    await handlers['attr.occupiedHeatingSetpoint'](2350);
    assert.strictEqual(d.values.target_temperature, 23.5);
    assert.deepStrictEqual(d._tx, []);
  });
});

describe('P3373 Wi-Fi local layer - setpoint report never written back', () => {
  it('radiator_wifi_tuya DP2 report updates the tile, no setDP/setDPs', async () => {
    const tx = [];
    const d = baseStubs(Object.create(RadiatorWifiTuyaDevice.prototype), tx);
    d._client = {
      setDP: async (...a) => { tx.push(['setDP', ...a]); },
      setDPs: async (...a) => { tx.push(['setDPs', ...a]); },
      lastDps: {},
    };
    d._connected = true;
    await d._onData({ dps: { 2: 215 } });
    await tick();
    assert.deepStrictEqual(tx, []);
    assert.notStrictEqual(d.values.target_temperature, 20, 'tile follows the device');
  });
});
