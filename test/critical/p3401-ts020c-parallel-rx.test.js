'use strict';
// P3401 (forum 140352 #2277, TFD_Home): TS020C PIR paired, motion still silent on 9.0.1639.
// Z2M tuya.ts TS020C: occupancy also as Tuya DP1 (trueFalse0, 0 = presence), illuminance as
// manuSpecificTuya2 (0xE002) attribute 57345. pir_sensor_2 listened to IAS only.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const EventEmitter = require('events');

const flush = () => new Promise((r) => setImmediate(r));

function fakePir(pid, clusters) {
  const Dev = require('../../drivers/pir_sensor_2/device');
  const d = Object.create(Dev.prototype);
  const caps = { alarm_motion: null, measure_battery: null, 'button.1': null, measure_voltage: null };
  const values = {};
  d.log = () => {}; d.error = () => {}; d.printNode = () => {};
  d.getData = () => ({ productId: pid });
  d.getSetting = (k) => k === 'zb_model_id' ? pid : undefined;
  d.getStoreValue = () => undefined;
  d.hasCapability = (c) => Object.prototype.hasOwnProperty.call(caps, c);
  d.addCapability = async (c) => { caps[c] = null; };
  d.safeSetCapabilityValue = async (c, v) => { values[c] = v; };
  d.zclNode = { endpoints: { 1: { clusters } } };
  return { d, caps, values };
}

async function init(d) {
  const Parent = Object.getPrototypeOf(Object.getPrototypeOf(d));
  const orig = Parent.onNodeInit;
  Parent.onNodeInit = async () => {};
  try { await d.onNodeInit({ zclNode: d.zclNode }); } finally { Parent.onNodeInit = orig; }
}

function tuyaFrame(dp, byte) {
  return { status: 0, transid: 1, dp, datatype: 4, length: 1, data: Buffer.from([byte]) };
}

describe('P3401 TS020C parallel RX in pir_sensor_2', () => {
  it('Tuya DP1 = 0 sets alarm_motion true, DP1 = 1 clears it (IAS kept)', async () => {
    const tuya = new EventEmitter();
    const ias = new EventEmitter();
    ias.zoneEnrollResponse = async () => {};
    const { d, values } = fakePir('TS020C', { tuya, iasZone: ias });
    await init(d);
    tuya.emit('dataReport', tuyaFrame(1, 0));
    await flush();
    assert.strictEqual(values.alarm_motion, true, 'DP1 0 = presence (trueFalse0)');
    tuya.emit('dataReport', tuyaFrame(1, 1));
    await flush();
    assert.strictEqual(values.alarm_motion, false);
    assert.strictEqual(typeof ias.onZoneStatusChangeNotification, 'function', 'IAS path still attached');
  });

  it('0xE002 attribute 0xE001 fills measure_luminance (added on first real value)', async () => {
    const tuyaE002 = new EventEmitter();
    const { d, caps, values } = fakePir('TS020C', { tuyaE002 });
    await init(d);
    tuyaE002.emit('attr.presenceKeepTime', 321);
    await flush(); await flush();
    assert.ok(Object.prototype.hasOwnProperty.call(caps, 'measure_luminance'));
    assert.strictEqual(values.measure_luminance, 321);
  });

  it('other pir_sensor_2 couples are untouched (TS0601 radars use DP1 the other way round)', async () => {
    const tuya = new EventEmitter();
    const tuyaE002 = new EventEmitter();
    const { d, caps, values } = fakePir('TS0601', { tuya, tuyaE002 });
    await init(d);
    tuya.emit('dataReport', tuyaFrame(1, 0));
    tuyaE002.emit('attr.presenceKeepTime', 321);
    await flush(); await flush();
    assert.strictEqual(values.alarm_motion, undefined);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(caps, 'measure_luminance'), false);
  });

  it('decodeDp: battery DP4, unknown DP ignored', () => {
    const { decodeDp } = require('../../lib/zigbee/Ts020cRx');
    assert.deepStrictEqual(decodeDp(4, 87), { capability: 'measure_battery', value: 87 });
    assert.strictEqual(decodeDp(101, 1), null);
    assert.strictEqual(decodeDp(1, 'x'), null);
  });
});
