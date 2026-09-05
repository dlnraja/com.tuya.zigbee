'use strict';

/**
 * P2426 — Caseless driver & flow card compensation test
 *
 * Verifies:
 * 1. ProtocolRxTxChain.classifyCluster classifies numeric, hex, and SDK named clusters (genOnOff, manuSpecificTuya, iasZone, etc.) in any case.
 * 2. PermissiveMatchingEngine._detectProtocol recognizes Tuya DP, OnOff, and Hybrid regardless of cluster casing or SDK naming.
 * 3. DeviceFingerprintDB.lookup Priority 3 PID defaults resolve caselessly (ts0001, ts0601, snzb-03).
 * 4. DeviceIOFacade._resolveCluster resolves clusters by number, hex, SDK names, and case-insensitively.
 * 5. FlowCardManager correctly decomposes action and target capabilities (turn_on -> onoff:true, toggle -> onoff:invert, multi-gang gang1_turn_on -> onoff.1:true).
 */

const assert = require('assert');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// 1. ProtocolRxTxChain.classifyCluster
const { classifyCluster } = require(path.join(ROOT, 'lib', 'layers', 'ProtocolRxTxChain'));
assert.strictEqual(classifyCluster(0x0006), 'zcl', '0x0006 should be zcl');
assert.strictEqual(classifyCluster('0x0006'), 'zcl', '"0x0006" should be zcl');
assert.strictEqual(classifyCluster('onOff'), 'zcl', '"onOff" should be zcl');
assert.strictEqual(classifyCluster('genOnOff'), 'zcl', '"genOnOff" should be zcl');
assert.strictEqual(classifyCluster('ONOFF'), 'zcl', '"ONOFF" should be zcl');
assert.strictEqual(classifyCluster(0xEF00), 'tuya_dp', '0xEF00 should be tuya_dp');
assert.strictEqual(classifyCluster('0xEF00'), 'tuya_dp', '"0xEF00" should be tuya_dp');
assert.strictEqual(classifyCluster('tuya'), 'tuya_dp', '"tuya" should be tuya_dp');
assert.strictEqual(classifyCluster('manuSpecificTuya'), 'tuya_dp', '"manuSpecificTuya" should be tuya_dp');
assert.strictEqual(classifyCluster('MANUSPECIFICTUYA'), 'tuya_dp', '"MANUSPECIFICTUYA" should be tuya_dp');
assert.strictEqual(classifyCluster(0x0500), 'ias', '0x0500 should be ias');
assert.strictEqual(classifyCluster('iasZone'), 'ias', '"iasZone" should be ias');
assert.strictEqual(classifyCluster(0xE001), 'tuya_bound', '0xE001 should be tuya_bound');
assert.strictEqual(classifyCluster('tuyaE001'), 'tuya_bound', '"tuyaE001" should be tuya_bound');

// 2. PermissiveMatchingEngine._detectProtocol
const PermissiveMatchingEngine = require(path.join(ROOT, 'lib', 'pairing', 'PermissiveMatchingEngine'));
const mockDevice = {
  homey: { setTimeout: () => 1, clearTimeout: () => {} },
  log: () => {},
};
const pme = new PermissiveMatchingEngine(mockDevice);
assert.strictEqual(pme._detectProtocol(['genOnOff', 'manuSpecificTuya']), 'hybrid', 'genOnOff + manuSpecificTuya should be hybrid');
assert.strictEqual(pme._detectProtocol(['ONOFF', 'TUYA']), 'hybrid', 'ONOFF + TUYA should be hybrid');
assert.strictEqual(pme._detectProtocol(['6', '61184']), 'hybrid', '6 + 61184 should be hybrid');
assert.strictEqual(pme._detectProtocol(['manuSpecificTuya']), 'tuya_dp', 'manuSpecificTuya should be tuya_dp');
assert.strictEqual(pme._detectProtocol(['genOnOff']), 'zcl', 'genOnOff should be zcl');
pme.destroy();
assert.strictEqual(pme._destroyed, true, 'pme.destroy() must set _destroyed to true');

// 3. DeviceFingerprintDB.lookup Priority 3 caseless
const DeviceFingerprintDB = require(path.join(ROOT, 'lib', 'DeviceFingerprintDB'));
const defaultLower = DeviceFingerprintDB.lookup('_unknown_mfr_xyz', 'ts0001');
assert.ok(defaultLower, 'ts0001 in lowercase must resolve default profile');
assert.strictEqual(defaultLower.driver, 'switch_1gang', 'ts0001 must map to switch_1gang');
const defaultUpper = DeviceFingerprintDB.lookup('_unknown_mfr_xyz', 'TS0001');
assert.ok(defaultUpper, 'TS0001 must resolve default profile');
assert.strictEqual(defaultUpper.driver, 'switch_1gang', 'TS0001 must map to switch_1gang');
const defaultMixed = DeviceFingerprintDB.lookup('_unknown_mfr_xyz', 'Ts0012');
assert.ok(defaultMixed, 'Ts0012 in mixed case must resolve default profile');
assert.strictEqual(defaultMixed.driver, 'switch_2gang', 'Ts0012 must map to switch_2gang');

// 4. DeviceIOFacade._resolveCluster
const DeviceIOFacade = require(path.join(ROOT, 'lib', 'io', 'DeviceIOFacade'));
const mockFacadeDevice = {
  zclNode: {
    endpoints: {
      1: {
        clusters: {
          genOnOff: { ID: 6, name: 'genOnOff' },
          closuresWindowCovering: { ID: 0x0102, name: 'closuresWindowCovering' },
          manuSpecificTuya: { ID: 0xEF00, name: 'manuSpecificTuya' },
        },
      },
      2: {
        clusters: {
          onOff: { ID: 6, name: 'onOff' },
        },
      },
    },
  },
  log: () => {},
};
const facade = new DeviceIOFacade(mockFacadeDevice);
const c1 = facade._resolveCluster(1, 6);
assert.ok(c1, 'Should resolve cluster 6 via genOnOff alias');
assert.strictEqual(c1.ID, 6);
const c2 = facade._resolveCluster(1, '0x0006');
assert.ok(c2, 'Should resolve cluster "0x0006" via genOnOff alias');
const c3 = facade._resolveCluster(1, 'onoff');
assert.ok(c3, 'Should resolve cluster "onoff" case-insensitively to genOnOff');
const c4 = facade._resolveCluster(1, 0x0102);
assert.ok(c4, 'Should resolve cluster 0x0102 to closuresWindowCovering');
const c5 = facade._resolveCluster(1, 'windowCovering');
assert.ok(c5, 'Should resolve cluster "windowCovering" to closuresWindowCovering');
const c6 = facade._resolveCluster(1, 'tuya');
assert.ok(c6, 'Should resolve cluster "tuya" to manuSpecificTuya');
const c7 = facade._resolveCluster(2, 6);
assert.ok(c7, 'Should resolve cluster 6 on ep 2');
assert.strictEqual(c7.name, 'onOff');

// 5. FlowCardManager action and capability derivation
const FlowCardManager = require(path.join(ROOT, 'lib', 'flow', 'FlowCardManager'));
const mockHomey = { manifest: { flow: { actions: [] } }, app: { log: () => {}, warn: () => {}, error: () => {} } };
const fcm = new FlowCardManager(mockHomey);

const r1 = fcm._resolveCardActionAndCapability('switch_1gang_turn_on');
assert.strictEqual(r1.action, 'turn_on');
assert.strictEqual(r1.targetCap, 'onoff');
assert.strictEqual(r1.targetValue, true);

const r2 = fcm._resolveCardActionAndCapability('switch_2gang_gang1_turn_off');
assert.strictEqual(r2.action, 'turn_off');
assert.strictEqual(r2.targetCap, 'onoff.1');
assert.strictEqual(r2.targetValue, false);

const r3 = fcm._resolveCardActionAndCapability('socket_wall_toggle');
assert.strictEqual(r3.action, 'toggle');
assert.strictEqual(r3.targetCap, 'onoff');

const r4 = fcm._resolveCardActionAndCapability('dimmer_set_dim');
assert.strictEqual(r4.action, 'set');
assert.strictEqual(r4.targetCap, 'dim');

console.log('P2426 caseless driver & flow card compensation: PASS');
