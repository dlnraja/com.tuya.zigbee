'use strict';

/**
 * P3050 — Fingerbot Plus sendData path (PR #577 by iassael, Z2M TS0001_fingerbot).
 * 1. DP command args follow the live cluster schema ({status,...} or {seq,dpValues}), same bytes.
 * 2. Exact TS0001 sendData couples write one 0x04 frame without waiting for a ZCL reply,
 *    fall back to the inherited cascade only on failure; other couples keep the old path.
 * 3. Settings replay is deferred, skipped once confirmed or after a user command.
 * 4. genPowerCfg reporting is optional and never awaited; touch is bool, ranges clamped (Z2M).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const Module = require('module');

const cacheBefore = new Set(Object.keys(require.cache));
const originalLoad = Module._load;
Module._load = function loadWithHomeyMock(request, parent, isMain) {
  if (request === 'homey') {
    class SimpleClass { log() {} error() {} }
    return { Device: class extends SimpleClass {}, Driver: class extends SimpleClass {}, App: class extends SimpleClass {}, SimpleClass };
  }
  return originalLoad.call(this, request, parent, isMain);
};
let FingerBotDevice; let TuyaSpecificClusterDevice; let helper; let LibTuyaCluster; let CanonicalCluster;
try {
  helper = require('../../lib/tuya/TuyaDpCommandArgs');
  LibTuyaCluster = require('../../lib/tuya/TuyaSpecificCluster');
  CanonicalCluster = require('../../lib/clusters/TuyaSpecificCluster');
  TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');
  FingerBotDevice = require('../../drivers/fingerbot/device');
} finally {
  Module._load = originalLoad;
  for (const k of Object.keys(require.cache)) { if (!cacheBefore.has(k)) {delete require.cache[k];} }
}

function fakeHomey() {
  const timers = [];
  return {
    timers,
    setTimeout: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; },
    clearTimeout: (t) => { const i = timers.indexOf(t); if (i >= 0) {timers.splice(i, 1);} },
  };
}

function makeDevice({ mfr, pid, cluster, store = {} }) {
  const d = Object.create(FingerBotDevice.prototype);
  d._transactionID = 7;
  d.homey = fakeHomey();
  d.log = () => {};
  d.error = () => {};
  d.debug = () => {};
  d._store = { ...store };
  d.getStoreValue = k => d._store[k];
  d.setStoreValue = async (k, v) => { d._store[k] = v; };
  d.getSetting = k => ({ zb_manufacturer_name: mfr, zb_model_id: pid })[k];
  d.zclNode = { endpoints: { 1: { clusters: cluster ? { tuya: cluster } : {} } } };
  return d;
}

function captureCluster(Klass) {
  const frames = [];
  const endpoint = {
    ID: 1,
    sendFrame: async (clusterId, frame) => { frames.push({ clusterId, frame: Buffer.from(frame) }); },
    getZCLNode: () => ({}),
  };
  return { cluster: new Klass(endpoint), frames };
}

describe('P3050 fingerbot sendData (PR #577)', () => {
  it('builds {seq,dpValues} for lib/tuya and {status,...} for the canonical class', () => {
    const seqCluster = { constructor: { COMMANDS: { sendData: { args: { seq: 1, dpValues: 1 } } } } };
    const stCluster = { constructor: { COMMANDS: { sendData: { args: { status: 1, transid: 1, dp: 1, datatype: 1, length: 1, data: 1 } } } } };
    const a = helper.buildDpCommandArgs(seqCluster, 'sendData', { dp: 101, datatype: 4, data: Buffer.from([0]), transid: 5 });
    assert.equal(a.seq, 5);
    assert.deepEqual([...a.dpValues], [101, 4, 0, 1, 0]);
    const b = helper.buildDpCommandArgs(stCluster, 'sendData', { dp: 101, datatype: 4, data: Buffer.from([0]), transid: 5 });
    assert.deepEqual({ ...b, data: [...b.data] }, { status: 0, transid: 5, dp: 101, datatype: 4, length: 1, data: [0] });
    const c = helper.buildDpCommandArgs({}, 'sendData', { dp: 1, datatype: 1, data: [1] });
    assert.equal(c.status, 0, 'unknown schema keeps the classic shape');
  });

  it('both real cluster classes accept the helper args and emit the same DP record bytes', async () => {
    const payloads = [];
    for (const K of [LibTuyaCluster, CanonicalCluster]) {
      if (typeof K?.prototype?.sendData !== 'function') {continue;}
      const { cluster, frames } = captureCluster(K);
      const args = helper.buildDpCommandArgs(cluster, 'sendData', { dp: 101, datatype: 4, data: Buffer.from([0]), transid: 5 });
      await cluster.sendData(args, { waitForResponse: false });
      assert.equal(frames.length, 1);
      const f = frames[0].frame;
      payloads.push([...f.subarray(f.length - 7)]);
    }
    assert.ok(payloads.length >= 1);
    // seq is opaque to the MCU: lib/tuya encodes it uint16 LE (like zigbee-herdsman), the
    // canonical class as status|transid. The DP record itself must be byte-identical.
    for (const p of payloads) {
      assert.deepEqual(p.slice(2), [101, 4, 0, 1, 0]);
      assert.deepEqual([...p.slice(0, 2)].sort(), [0, 5]);
    }
  });

  it('exact couple check uses mfr + productId', () => {
    assert.equal(makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001' })._isSendDataCouple(), true);
    assert.equal(makeDevice({ mfr: '_TZ3210_cm9mbpr1', pid: 'TS0001' })._isSendDataCouple(), true);
    assert.equal(makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS011F' })._isSendDataCouple(), false);
    assert.equal(makeDevice({ mfr: '_TZ3210_232nryqh', pid: 'TS0001' })._isSendDataCouple(), false);
    assert.equal(makeDevice({ mfr: '_TZ3210_cm9mbpr1', pid: 'TS0001' }).getTuyaCommandName(101), 'sendData');
  });

  it('sendData couple: one direct 0x04 frame with live-schema args, no cascade', async () => {
    const calls = [];
    const cluster = { constructor: { COMMANDS: { sendData: { args: { seq: 1, dpValues: 1 } } } }, sendData: async (args, opts) => { calls.push({ args, opts }); } };
    const d = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001', cluster });
    let superCalled = 0;
    const orig = TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint;
    TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = async () => { superCalled++; return true; };
    try {
      assert.equal(await d._sendTuyaDatapoint(101, 4, 1, Buffer.from([1])), true);
    } finally { TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = orig; }
    assert.equal(calls.length, 1);
    assert.deepEqual([...calls[0].args.dpValues], [101, 4, 0, 1, 1]);
    assert.equal(superCalled, 0);
  });

  it('sendData couple falls back to the inherited path only when nothing was sent', async () => {
    const cluster = { sendData: async () => { throw new Error('tuya.sendData: seq is an unexpected property'); } };
    const d = makeDevice({ mfr: '_TZ3210_dse8ogfy', pid: 'TS0001', cluster });
    let superArgs = null;
    const orig = TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint;
    TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = async (...a) => { superArgs = a; return 'fallback'; };
    try {
      assert.equal(await d._sendTuyaDatapoint(104, 4, 1, Buffer.from([1])), 'fallback');
    } finally { TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = orig; }
    assert.equal(superArgs[4], 1, 'fallback is bounded to one attempt');
  });

  it('a direct-send timeout is not re-sent through the cascade (no double press)', async () => {
    const cluster = { sendData: () => new Promise(() => {}) };
    const d = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001', cluster });
    d.homey = { setTimeout: (fn) => { setImmediate(fn); return 1; }, clearTimeout: () => {} };
    let superCalled = 0;
    const orig = TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint;
    TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = async () => { superCalled++; return true; };
    try {
      await assert.rejects(d._sendTuyaDatapoint(101, 4, 1, Buffer.from([0])), e => e.code === 'P3050_TIMEOUT');
    } finally { TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = orig; }
    assert.equal(superCalled, 0);
  });

  it('a response error after the frame left is not re-sent (no double press)', async () => {
    const cluster = { sendData: async () => { throw new Error('Timeout: Expected Response'); } };
    const d = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001', cluster });
    let superCalled = 0;
    const orig = TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint;
    TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = async () => { superCalled++; return true; };
    try {
      await assert.rejects(d._sendTuyaDatapoint(101, 4, 1, Buffer.from([0])), /Expected Response/);
    } finally { TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = orig; }
    assert.equal(superCalled, 0);
  });

  it('every fingerbot Flow card handler calls a method that exists on the device', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const dir = path.join(__dirname, '..', '..', 'drivers', 'fingerbot');
    const src = fs.readFileSync(path.join(dir, 'driver.js'), 'utf8');
    const called = [...src.matchAll(/device\.([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
    assert.ok(called.includes('triggerFingerBotPress'), 'Push card must call triggerFingerBotPress (274111e)');
    const proto = FingerBotDevice.prototype;
    const homeyDeviceApi = new Set(['setCapabilityValue', 'getCapabilityValue', 'hasCapability', 'getSetting', 'getSettings', 'setSettings', 'getStoreValue', 'setStoreValue', 'getData', 'triggerCapabilityListener']);
    const missing = [...new Set(called)].filter(n => !homeyDeviceApi.has(n) && typeof proto[n] !== 'function');
    assert.deepEqual(missing, []);
  });

  it('turn on/off Flow cards drive the onoff capability path', async () => {
    const d = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001' });
    const seen = [];
    d.hasCapability = c => c === 'onoff';
    d.triggerCapabilityListener = async (c, v) => { seen.push([c, v]); };
    await d.flowSetOnOff(true);
    await d.flowSetOnOff(0);
    assert.deepEqual(seen, [['onoff', true], ['onoff', false]]);
  });

  it('other couples keep the inherited path untouched', async () => {
    const cluster = { sendData: async () => { throw new Error('must not be called'); } };
    const d = makeDevice({ mfr: '_TZ3210_232nryqh', pid: 'TS0001', cluster });
    let superArgs = null;
    const orig = TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint;
    TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = async (...a) => { superArgs = a; return 'legacy'; };
    try {
      assert.equal(await d._sendTuyaDatapoint(101, 4, 1, Buffer.from([0])), 'legacy');
    } finally { TuyaSpecificClusterDevice.prototype._sendTuyaDatapoint = orig; }
    assert.equal(superArgs.length, 4);
  });

  it('touch is bool and limits are clamped only on the Z2M couples', async () => {
    const z = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001' });
    const o = makeDevice({ mfr: '_TZ3210_232nryqh', pid: 'TS0001' });
    const seen = [];
    for (const d of [z, o]) {
      d.writeBool = async (dp, v) => seen.push(['bool', dp, v]);
      d.writeEnum = async (dp, v) => seen.push(['enum', dp, v]);
      await d._writeTouch(true);
    }
    assert.deepEqual(seen, [['bool', 107, true], ['enum', 107, 1]]);
    assert.equal(z._clampForCouple('upper', 100), 50);
    assert.equal(z._clampForCouple('lower', 10), 50);
    assert.equal(z._clampForCouple('delay', 30), 10);
    assert.equal(o._clampForCouple('upper', 100), 100);
  });

  it('settings replay is deferred, runs on first frame, and is skipped once confirmed', () => {
    const d = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001' });
    let replays = 0;
    d.applyConfiguredSettings = async () => { replays++; };
    d._scheduleSettingsReplay();
    assert.equal(replays, 0, 'not run synchronously at init');
    assert.equal(d.homey.timers.length, 1);
    d._onDeviceFrame(105);
    assert.equal(replays, 1, 'device awake: replay runs now');
    assert.equal(d.homey.timers.length, 0);

    const c = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001', store: { fingerbot_settings_confirmed: true } });
    c.applyConfiguredSettings = async () => { replays++; };
    c._scheduleSettingsReplay();
    assert.equal(c.homey.timers.length, 0);

    const u = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001' });
    u.applyConfiguredSettings = async () => { replays++; };
    u._scheduleSettingsReplay();
    u._lastUserTxAt = Date.now() + 1;
    u.homey.timers[0].fn();
    assert.equal(replays, 1, 'user command went first: no replay');

    const r = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001' });
    r._onDeviceFrame(102);
    r._onDeviceFrame(106);
    assert.equal(r._store.fingerbot_settings_confirmed, true);
  });

  it('genPowerCfg reporting is optional and never awaited', () => {
    const d = makeDevice({ mfr: '_TZ3210_j4pdtz9v', pid: 'TS0001' });
    let configured = 0;
    d.configureAttributeReporting = () => { configured++; return new Promise(() => {}); };
    assert.equal(d._configureBatteryReportingOptional({ endpoints: { 1: { clusters: {} } } }), undefined);
    assert.equal(configured, 0);
    d._configureBatteryReportingOptional({ endpoints: { 1: { clusters: { powerConfiguration: {} } } } });
    return Promise.resolve().then(() => assert.equal(configured, 1));
  });
});
