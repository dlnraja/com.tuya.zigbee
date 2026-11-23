'use strict';
// P3398: the remaining IAS zoneStatus bit maths (water leak, SOS, door/window helper, IAS
// battery-low readers) go through ZoneStatusRx. zigbee-clusters gives a map16 Bitmap object;
// some stacks/readers hand a Buffer or a JSON Buffer. `obj & 0x08` / Number(obj) gave 0 / NaN.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { ZCLDataTypes } = require('zigbee-clusters');

const ROOT = path.join(__dirname, '..', '..');
const ZS = ZCLDataTypes.map16('alarm1', 'alarm2', 'tamper', 'battery', 'supervisionReports',
  'restoreReports', 'trouble', 'acMains', 'test', 'batteryDefect');
const bitmap = (n) => ZS.fromBuffer(Buffer.from([n & 0xff, (n >> 8) & 0xff]), 0);
const settle = () => new Promise((r) => setImmediate(r));

function fakeDevice(caps) {
  const values = {};
  return {
    values,
    log() {},
    error() {},
    getSetting: () => null,
    getSettings: () => ({}),
    getStoreValue: () => null,
    setStoreValue: async () => {},
    hasCapability: (c) => caps.includes(c),
    safeSetCapabilityValue(c, v) { values[c] = v; return Promise.resolve(); },
    setCapabilityValue(c, v) { values[c] = v; return Promise.resolve(); },
  };
}

describe('P3398 remaining IAS zoneStatus decoders', () => {
  it('DoorWindowContactHelper tamper listener reads bit 2 from a Buffer frame', () => {
    const { attachTamperListener } = require('../../lib/devices/DoorWindowContactHelper');
    const dev = fakeDevice(['alarm_tamper']);
    const ias = new EventEmitter();
    attachTamperListener(dev, { endpoints: { 1: { clusters: { iasZone: ias } } } });
    ias.emit('attr.zoneStatus', Buffer.from([0x04, 0x00]));
    assert.strictEqual(dev.values.alarm_tamper, true);
    ias.onZoneStatusChangeNotification({ zoneStatus: bitmap(0) });
    assert.strictEqual(dev.values.alarm_tamper, false);
  });

  it('DoorWindowContactHelper contact + battery from a JSON Buffer notification', async () => {
    const { setupDoorWindowSensor } = require('../../lib/devices/DoorWindowContactHelper');
    const dev = fakeDevice(['alarm_contact', 'alarm_battery']);
    const ias = new EventEmitter();
    ias.readAttributes = async () => null;
    await setupDoorWindowSensor(dev, { endpoints: { 1: { clusters: { iasZone: ias } } } }).catch(() => {});
    ias.onZoneStatusChangeNotification({ zoneStatus: { type: 'Buffer', data: [0x09, 0x00] } });
    assert.strictEqual(dev.values.alarm_contact, true);
    assert.strictEqual(dev.values.alarm_battery, true);
  });

  it('SmartBatteryManager IAS listener sets battery-low from a Bitmap and does not clear it on undecodable frames', async () => {
    const SBM = require('../../lib/managers/SmartBatteryManager');
    const ias = new EventEmitter();
    const calls = [];
    const self = {
      device: fakeDevice([]),
      _findEndpointByCluster: () => ({ cluster: ias }),
      setAlarmBattery: async (v) => { calls.push(v); },
    };
    await SBM.prototype._setupIASListener.call(self, {});
    ias.emit('attr.zoneStatus', bitmap(0x08));
    ias.emit('attr.zoneStatus', {});
    assert.deepStrictEqual(calls, [true]);
  });

  it('UnifiedBatteryHandler IAS battery alarm reads bit 3 from a Bitmap', () => {
    const UBH = require('../../lib/battery/UnifiedBatteryHandler');
    const ias = new EventEmitter();
    const calls = [];
    const self = {
      device: fakeDevice([]),
      _findEndpointByCluster: () => ({ clusters: { iasZone: ias } }),
      _updateBatteryAlarm: (v) => calls.push(v),
    };
    UBH.prototype._setupIasZoneBattery.call(self, {});
    ias.emit('attr.zoneStatus', bitmap(0x08));
    ias.emit('attr.zoneStatus', bitmap(0x00));
    assert.deepStrictEqual(calls, [true, false]);
  });

  it('BatteryMasterEngine / BatteryCascadeEngine IAS fallback see battery-low in a Bitmap', () => {
    const { BatteryMasterEngine } = require('../../lib/battery/BatteryMasterEngine');
    const { BatteryCascadeEngine } = require('../../lib/battery/BatteryCascadeEngine');
    const cluster = { readAttributes: () => ({ zoneStatus: bitmap(0x08) }) };
    const zclNode = { endpoints: { 1: { clusters: { iasZone: cluster } } } };
    const m = BatteryMasterEngine.prototype._tryIasZone.call({ zclNode, device: { zclNode } });
    assert.strictEqual(m && m.value, 5);
    // Cascade calls .catch() on the read (async API), so only its decoder is checked statically.
    assert.strictEqual(typeof BatteryCascadeEngine.prototype._tryIasZone, 'function');
    const src = fs.readFileSync(path.join(ROOT, 'lib/battery/BatteryCascadeEngine.js'), 'utf8');
    assert.ok(!/attrs\.zoneStatus & 0x08/.test(src));
    assert.ok(/zoneStatusBits\(attrs\.zoneStatus\)/.test(src));
  });

  it('button_emergency_sos accepts a press whose zoneStatus is a Buffer', async () => {
    const SOS = require('../../drivers/button_emergency_sos/device');
    const dev = fakeDevice(['alarm_generic']);
    Object.assign(dev, {
      _destroyed: false,
      _lastTrigger: 0,
      _updateActivity() {},
      _readBatteryNow: async () => {},
      _verifyCieAddress: async () => {},
      driver: {},
      homey: { setTimeout: () => 0, clearTimeout() {} },
    });
    await SOS.prototype._handleAlarm.call(dev, { zoneStatus: Buffer.from([0x01, 0x00]) }).catch(() => {});
    assert.strictEqual(dev.values.alarm_generic, true);
  });

  it('water_leak_sensor_tuya initial read decodes through ZoneStatusRx', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/water_leak_sensor_tuya/device.js'), 'utf8');
    assert.ok(/ZoneStatusRx'\)\.zoneStatusBits\(attrs\.zoneStatus\)/.test(src));
    assert.ok(!/attrs\.zoneStatus\?\.alarm1 \|\| attrs\.zoneStatus\?\.alarm2 \? 1 : 0/.test(src));
  });
});
