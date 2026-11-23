'use strict';
// P3397 (forum 140352 #2275): IAS motion sensor paired, PIR works standalone, Homey never shows motion.
// zigbee-clusters decodes zoneStatus as a map16 Bitmap object: `bitmap & 0x03` is 0 and
// `bitmap.data` is undefined, so several handlers always computed "no motion".
require('../_support/homey-stub'); // stub the SDK before homey-zigbeedriver loads
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

function fakeDevice(caps) {
  const values = {};
  return {
    values,
    log() {},
    error() {},
    hasCapability: (c) => caps.includes(c),
    safeSetCapabilityValue(c, v) { values[c] = v; return Promise.resolve(); },
  };
}

function fakeIas() {
  const c = new EventEmitter();
  c.zoneEnrollResponse = async () => {};
  c.readAttributes = async () => ({});
  return c;
}

describe('P3397 IAS zoneStatus Bitmap decoding', () => {
  it('the real zigbee-clusters zoneStatus value is a Bitmap, not a number', () => {
    const b = bitmap(1);
    assert.strictEqual(typeof b, 'object');
    assert.strictEqual(b & 0x03, 0); // the bug: bit math on the object is always 0
  });

  it('zoneStatusBits decodes Bitmap, number, Buffer and notification payloads', () => {
    const { zoneStatusBits, zoneStatusMotion } = require('../../lib/zigbee/ZoneStatusRx');
    assert.deepStrictEqual(zoneStatusBits(bitmap(5)), { value: 5, alarm1: true, alarm2: false, tamper: true, battery: false });
    assert.strictEqual(zoneStatusMotion({ zoneStatus: bitmap(1), extendedStatus: 0, zoneId: 10, delay: 0 }), true);
    assert.strictEqual(zoneStatusMotion(bitmap(2)), true);
    assert.strictEqual(zoneStatusMotion(bitmap(0)), false);
    assert.strictEqual(zoneStatusMotion(1), true);
    assert.strictEqual(zoneStatusMotion(Buffer.from([1, 0])), true);
    assert.strictEqual(zoneStatusMotion({}), null); // undecodable: never forced to false
  });

  it('sensor_presence_radar IAS listeners turn a Bitmap alarm1 into alarm_motion=true', () => {
    const Radar = require('../../drivers/sensor_presence_radar/device');
    const dev = fakeDevice(['alarm_motion']);
    Object.assign(dev, {
      _getSensorConfig: () => ({}),
      _applyPresenceInversion: (v) => v,
      _triggerPresenceFlows() {},
      _reEnrollIASZone: async () => {},
      homey: { setTimeout: () => 0 },
    });
    const ias = fakeIas();
    Radar.prototype._setupIASZoneListeners.call(dev, ias);
    ias.emit('attr.zoneStatus', bitmap(1));
    assert.strictEqual(dev.values.alarm_motion, true, 'attr 0x0002 report');
    ias.onZoneStatusChangeNotification({ zoneStatus: bitmap(0), extendedStatus: 0, zoneId: 10, delay: 0 });
    assert.strictEqual(dev.values.alarm_motion, false);
    ias.onZoneStatusChangeNotification({ zoneStatus: bitmap(1), extendedStatus: 0, zoneId: 10, delay: 0 });
    assert.strictEqual(dev.values.alarm_motion, true, 'zoneStatusChangeNotification');
  });

  it('attachMotionRx feeds alarm_motion/alarm_tamper from notification, attr report and occupancy', () => {
    const { attachMotionRx } = require('../../lib/zigbee/ZoneStatusRx');
    const dev = fakeDevice(['alarm_motion', 'alarm_tamper']);
    const ias = fakeIas();
    const occ = new EventEmitter();
    const r = attachMotionRx(dev, { endpoints: { 1: { clusters: { iasZone: ias, occupancySensing: occ } } } });
    assert.deepStrictEqual(r, { ias: true, occupancy: true });
    ias.onZoneStatusChangeNotification({ zoneStatus: bitmap(1) });
    assert.strictEqual(dev.values.alarm_motion, true);
    ias.emit('attr.zoneStatus', bitmap(4));
    assert.strictEqual(dev.values.alarm_motion, false);
    assert.strictEqual(dev.values.alarm_tamper, true);
    occ.emit('attr.occupancy', ZCLDataTypes.map8('occupied').fromBuffer(Buffer.from([1]), 0));
    assert.strictEqual(dev.values.alarm_motion, true);
  });

  it('attachMotionRx does not throw when endpoint 1 has no iasZone (TS0601 variants)', () => {
    const { attachMotionRx } = require('../../lib/zigbee/ZoneStatusRx');
    const r = attachMotionRx(fakeDevice(['alarm_motion']), { endpoints: { 1: { clusters: { tuya: {} } } } });
    assert.deepStrictEqual(r, { ias: false, occupancy: false });
  });

  it('motion drivers no longer do bit math on a raw zoneStatus or access iasZone unguarded', () => {
    const files = ['motion_sensor', 'sensor_contact_motion', 'sensor_presence_radar', 'pirsensor',
      'slim_motion_sensor', 'pir_sensor_2', 'motion_sensor_2', 'smart_motion_sensor', 'pir_mmwave_sensor']
      .map((d) => path.join(ROOT, 'drivers', d, 'device.js'));
    files.push(path.join(ROOT, 'lib/utils/SleepyDeviceInit.js'));
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      assert.ok(!/\(status & 0x0[13]\)/.test(src), `${f}: (status & 0x01/0x03) on a Bitmap`);
      assert.ok(!/status\?\.data\?\.\[0\]|payload\?\.data\?\.\[0\]|p\?\.data\?\.\[0\]/.test(src), `${f}: .data[0] on a Bitmap`);
      assert.ok(!/endpoints\[1\]\.clusters\[CLUSTER\.IAS_ZONE\.NAME\]/.test(src), `${f}: unguarded iasZone access`);
    }
  });

  it('no IAS CIE write uses the invalid attribute name or a placeholder IEEE', () => {
    const offenders = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === 'node_modules' || e.name === '_quarantine' || e.name.startsWith('.')) continue;
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.js')) {
          const src = fs.readFileSync(p, 'utf8');
          if (/writeAttributes\(\s*\{\s*iasCieAddress\s*:/.test(src)) offenders.push(path.relative(ROOT, p));
        }
      }
    };
    walk(path.join(ROOT, 'drivers'));
    walk(path.join(ROOT, 'lib'));
    assert.deepStrictEqual(offenders, []);
    const radar = fs.readFileSync(path.join(ROOT, 'drivers/sensor_presence_radar/device.js'), 'utf8');
    assert.ok(!radar.includes('0x00124b0000000000'));
  });

  it('writeCieAddress refuses placeholder addresses and writes iasCIEAddress for a real one', async () => {
    const { writeCieAddress } = require('../../lib/zigbee/ZoneStatusRx');
    const writes = [];
    const ias = { writeAttributes: async (a) => { writes.push(a); }, readAttributes: async () => ({}) };
    const bad = { log() {}, homey: { zigbee: { ieeeAddress: '0000000000000000' } }, getStoreValue: () => null, setStoreValue: async () => {} };
    assert.strictEqual(await writeCieAddress(bad, ias).catch(() => false), false);
    const good = { log() {}, homey: { zigbee: { ieeeAddress: '00:17:88:01:02:03:04:05' } }, getStoreValue: () => null, setStoreValue: async () => {} };
    assert.strictEqual(await writeCieAddress(good, ias), true);
    assert.deepStrictEqual(Object.keys(writes[writes.length - 1]), ['iasCIEAddress']);
  });
});
