'use strict';

/**
 * P3365 - Bastien diags 2026-10-18..11-07: seven HOBEIAN + ZG-301Z relays
 * (switch_1gang, EP1 in 0000/0004/0005/0006, no 0xEF00, dps=none) log
 * "protocol=DP" on every Homey command. The driver profile already says
 * noEf00Tx / protocol zcl_onoff, but the command router ignored it and raced
 * a Tuya DP against ZCL, waiting for both before answering.
 * Contre quoi:
 * - profile.noEf00Tx => no tuya-dp step, ZCL answers alone.
 * - forceDp still sends the DP (explicit caller intent).
 * - A device without noEf00Tx keeps the DP fallback (TS0601-style).
 */

const assert = require('assert');
const test = require('node:test');
const { writeCapabilityWithFallbacks } = require('../../lib/zigbee/CapabilityCommandRouter');

function device({ noEf00Tx }) {
  const sent = { zcl: 0, dp: 0 };
  const store = {};
  const onOff = {
    setOn: async () => { sent.zcl++; },
    setOff: async () => { sent.zcl++; },
    writeAttributes: async () => { sent.zcl++; },
  };
  return {
    sent,
    gangCount: 1,
    _isPureTuyaDP: true,
    zclNode: { endpoints: { 1: { clusters: { onOff } } } },
    tuyaEF00Manager: { sendDP: async () => { sent.dp++; return true; } },
    getDeviceProfile: () => (noEf00Tx ? { noEf00Tx: true, protocol: 'zcl_onoff' } : {}),
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    getSetting: () => null,
    getData: () => ({}),
    log() {},
  };
}

test('noEf00Tx profile: no Tuya DP is sent, ZCL alone answers', async () => {
  const d = device({ noEf00Tx: true });
  const r = await writeCapabilityWithFallbacks(d, 'onoff', true, { endpoint: 1, dpId: 1, dpType: 'bool', parallelDiscover: true });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(d.sent.dp, 0, 'DP must not be sent to a noEf00Tx couple');
  assert.ok(d.sent.zcl >= 1);
});

test('forceDp still sends the DP on a noEf00Tx couple', async () => {
  const d = device({ noEf00Tx: true });
  d.zclNode = { endpoints: { 1: { clusters: {} } } };
  const r = await writeCapabilityWithFallbacks(d, 'onoff', true, { endpoint: 1, dpId: 1, dpType: 'bool', forceDp: true });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(d.sent.dp, 1);
});

test('without noEf00Tx the DP fallback stays available', async () => {
  const d = device({ noEf00Tx: false });
  d.zclNode = { endpoints: { 1: { clusters: {} } } };
  const r = await writeCapabilityWithFallbacks(d, 'onoff', true, { endpoint: 1, dpId: 1, dpType: 'bool' });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(d.sent.dp, 1);
});
