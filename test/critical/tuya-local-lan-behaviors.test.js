'use strict';

/**
 * Tuya Wi-Fi LAN behaviours: DP detection planning, reconnect pacing,
 * cover/climate/light/fan value templates, legacy bulb layout, LED strip
 * scaling fixes, cover command-set learning. Offline, no sockets.
 */
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const Module = require('module');

const T = require('../../lib/tuya-local/TuyaDeviceTemplates');
const D = require('../../lib/tuya-local/TuyaDpDetector');
const R = require('../../lib/tuya-local/TuyaReconnectPolicy');

class FakeDevice {
  constructor() {
    this._store = {}; this._caps = {}; this._sent = []; this.logs = [];
    // instance-level so the real base-class helper does not shadow it
    this.safeSetCapabilityValue = async (c, v) => { this._caps[c] = v; };
  }
  log(...a) { this.logs.push(a.join(' ')); }
  error() {}
  getStoreValue(k) { return this._store[k]; }
  async setStoreValue(k, v) { this._store[k] = v; }
  getCapabilityValue(c) { return this._caps[c]; }
  hasCapability() { return true; }
}

function loadDriver(rel) {
  const original = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === 'homey') {return { Device: FakeDevice, Driver: class {}, App: class {} };}
    return original.call(this, request, parent, isMain);
  };
  // WHY(2026-10-11): in the full mocha run lib/tuya-local/TuyaLocalDevice is already cached on the REAL
  // homey Device, so the driver bypassed FakeDevice ("this.log is not a function"). Load the base classes
  // fresh under the fake too, then put the previous cache entries back.
  const base = ['../../lib/tuya-local/TuyaLocalDevice', '../../lib/tuya-local/TuyaLocalDriver'].map((m) => require.resolve(m));
  const saved = base.map((b) => require.cache[b]);
  try {
    for (const b of base) {delete require.cache[b];}
    const p = require.resolve(rel);
    delete require.cache[p];
    return require(p);
  } finally {
    Module._load = original;
    base.forEach((b, i) => { if (saved[i]) {require.cache[b] = saved[i];} else {delete require.cache[b];} });
  }
}

describe('DP detection planner', () => {
  it('covers 1..30 and 100..110 with DP 1 in every batch and small payloads', () => {
    const plan = D.buildProbePlan();
    const all = new Set(plan.flat());
    for (let i = 1; i <= 30; i++) {assert.ok(all.has(i), `missing ${i}`);}
    for (let i = 100; i <= 110; i++) {assert.ok(all.has(i), `missing ${i}`);}
    for (const b of plan) {
      assert.strictEqual(b[0], 1);
      assert.ok(D.estimatePayloadBytes(b) <= D.MAX_PAYLOAD_BYTES);
    }
  });
  it('respects skip lists and chunk size', () => {
    const plan = D.buildProbePlan({ ranges: [[1, 12]], chunkSize: 5, skip: [3] });
    assert.deepStrictEqual(plan, [[1, 2, 4, 5, 6, 7], [1, 8, 9, 10, 11, 12]]);
  });
  it('infers DP types and merges replies ignoring nulls', () => {
    assert.strictEqual(D.inferDpType(true), 'bool');
    assert.strictEqual(D.inferDpType(42), 'value');
    assert.strictEqual(D.inferDpType('open'), 'enum');
    assert.strictEqual(D.inferDpType('00b403e803e8'), 'color');
    const m = D.mergeDetected({}, { 1: true, 2: null, x: 1, 18: 120 });
    assert.deepStrictEqual(Object.keys(m).sort(), ['1', '18']);
  });
  it('recognises the "list DPs explicitly" firmware reply', () => {
    assert.ok(D.isDpListRequiredError('json obj data unvalid'));
    assert.ok(D.isDpListRequiredError(new Error('data unvalid')));
    assert.ok(!D.isDpListRequiredError('timeout'));
  });
  it('runProbes survives failing/silent batches', async () => {
    let calls = 0;
    const res = await D.runProbes(async (batch) => {
      calls++;
      if (batch.includes(15)) {throw new Error('boom');}
      if (batch.includes(25)) {return new Promise(() => {});} // never answers
      return { dps: { 1: true, ...batch.includes(5) ? { 5: 7 } : {} } };
    }, { ranges: [[1, 30]], perProbeTimeoutMs: 20 });
    assert.strictEqual(calls, 3);
    assert.deepStrictEqual(Object.keys(res).sort(), ['1', '5']);
  });
});

describe('reconnect policy', () => {
  const noJitter = { jitterRatio: 0 };
  it('keeps legacy pacing: 5 s base, x1.5, 60 s cap', () => {
    assert.strictEqual(R.computeReconnectDelay({ attempt: 1, ...noJitter }), 5000);
    assert.strictEqual(R.computeReconnectDelay({ attempt: 2, ...noJitter }), 7500);
    assert.strictEqual(R.computeReconnectDelay({ attempt: 50, ...noJitter }), 60000);
  });
  it('optional steady window then backoff after long outages', () => {
    const o = { steadyWindowMs: 300000, ...noJitter };
    assert.strictEqual(R.computeReconnectDelay({ attempt: 30, offlineForMs: 60000, ...o }), 5000);
    assert.ok(R.computeReconnectDelay({ attempt: 1, offlineForMs: 400000, ...o }) >= 10000);
  });
  it('jitter stays bounded', () => {
    const lo = R.computeReconnectDelay({ attempt: 1, random: () => 0 });
    const hi = R.computeReconnectDelay({ attempt: 1, random: () => 1 });
    assert.strictEqual(lo, 4500);
    assert.strictEqual(hi, 5500);
  });
  it('sleepy grace and heartbeat health', () => {
    assert.ok(R.isWithinSleepGrace(1000, 5000, 3000));
    assert.ok(!R.isWithinSleepGrace(1000, 5000, 9000));
    assert.ok(!R.isWithinSleepGrace(0, 5000, 1));
    assert.ok(!R.isHeartbeatDead(1));
    assert.ok(R.isHeartbeatDead(2));
  });
});

describe('device templates', () => {
  it('cover command sets round-trip and detection', () => {
    for (const name of Object.keys(T.COVER_COMMAND_SETS)) {
      for (const st of ['up', 'down', 'idle']) {
        assert.strictEqual(T.coverStateFromValue(T.coverValueFromState(st, name), name), st);
      }
    }
    assert.strictEqual(T.detectCoverCommandSet('fz'), 'fz_zz_stop');
    assert.strictEqual(T.detectCoverCommandSet('continue'), 'open_close_continue');
    assert.strictEqual(T.detectCoverCommandSet('open', 'open_close_continue'), 'open_close_continue');
    assert.strictEqual(T.detectCoverCommandSet('on'), 'on_off_stop');
    assert.strictEqual(T.detectCoverCommandSet('stop'), null);
    assert.strictEqual(T.coverPositionToHomey(30, true), 0.7);
    assert.strictEqual(T.coverPositionToDevice(0.7, true), 30);
  });
  it('climate modes, actions and precision', () => {
    assert.strictEqual(T.climateValueFromMode('cool'), 'cold');
    assert.strictEqual(T.climateModeFromValue('wind'), 'fan_only');
    assert.strictEqual(T.climateValueFromMode('nope'), null);
    assert.strictEqual(T.climateActionFromValue('opened'), 'heating');
    assert.strictEqual(T.climateActionFromValue('closed'), 'idle');
    assert.strictEqual(T.scaleTemperature(215, 0.1), 21.5);
    assert.strictEqual(T.unscaleTemperature(21.5, 0.5), 43);
    assert.strictEqual(T.guessTemperaturePrecision(215), 0.1);
    assert.strictEqual(T.guessTemperaturePrecision(21), 1);
  });
  it('light colour encodings round-trip (12-char and 14-char)', () => {
    for (const fmt of ['v1', 'v2']) {
      const enc = T.encodeColor({ hue: 0.25, saturation: 0.5, value: 1 }, fmt);
      assert.strictEqual(T.detectColorFormat(enc), fmt);
      const dec = T.decodeColor(enc);
      assert.ok(Math.abs(dec.hue - 0.25) < 0.01 && Math.abs(dec.saturation - 0.5) < 0.01);
    }
    assert.strictEqual(T.encodeColor({ hue: 0.5, saturation: 1, value: 1 }, 'v2'), '00b403e803e8');
    assert.strictEqual(T.decodeColor('zz'), null);
  });
  it('brightness / colour temperature scaling', () => {
    assert.strictEqual(T.brightnessToDevice(1), 1000);
    assert.strictEqual(T.brightnessToDevice(0, T.BRIGHTNESS_RANGES.v1), 25);
    assert.strictEqual(T.brightnessToHomey(255, T.BRIGHTNESS_RANGES.v1), 1);
    assert.strictEqual(T.colorTempToHomey(0), 1);
    assert.strictEqual(T.colorTempToHomey(0, 1000, true), 0);
    assert.strictEqual(T.colorTempToDevice(1), 0);
    assert.strictEqual(T.rawToKelvin(1000), 6500);
  });
  it('fan speed list/range <-> percentage', () => {
    const list = ['low', 'middle', 'high'];
    assert.strictEqual(T.fanSpeedToPercent('middle', list), 67);
    assert.strictEqual(T.percentToFanSpeed(67, list), 'middle');
    assert.strictEqual(T.percentToFanSpeed(0, list), null);
    assert.strictEqual(T.fanSpeedToPercent(6, { min: 1, max: 6 }), 100);
    assert.strictEqual(T.percentToFanSpeed(50, { min: 1, max: 6 }), 3);
  });
  it('legacy light layout detection and translation', () => {
    assert.strictEqual(T.detectLightSchema({ 1: true, 2: 'white', 3: 200 }), 'legacy');
    assert.strictEqual(T.detectLightSchema({ 20: true }), 'modern');
    assert.strictEqual(T.detectLightSchema({ 1: true }), null);
    assert.strictEqual(T.detectLightSchema({ 1: true, 2: 'auto' }), null);
    const m = T.legacyLightToModern({ 1: true, 3: 255, 4: 255, 5: T.encodeColor({ hue: 0.5 }, 'v1') });
    assert.deepStrictEqual(m, { 20: true, 22: 1000, 23: 1000, 24: '00b403e803e8' });
    const l = T.modernLightToLegacy({ 20: false, 22: 10, 24: '00b403e803e8' });
    assert.strictEqual(l['3'], 25);
    assert.strictEqual(T.detectColorFormat(l['5']), 'v1');
  });
});

describe('driver wiring', () => {
  it('wifi_light learns the legacy layout and writes legacy DPs', async () => {
    const Light = loadDriver('../../drivers/wifi_light/device.js');
    const dev = new Light();
    const sent = [];
    dev._client = { connected: true, setDPs: async (d) => sent.push(d), setDP: async (k, v) => sent.push({ [k]: v }) };
    let forwarded = null;
    Object.getPrototypeOf(Light.prototype)._onData = async function (data) { forwarded = data; };
    await dev._onData({ dps: { 1: true, 2: 'colour', 3: 255, 5: T.encodeColor({ hue: 0.5, saturation: 1, value: 1 }, 'v1') } });
    assert.strictEqual(dev._lightSchema, 'legacy');
    assert.strictEqual(dev._store.light_schema, 'legacy');
    assert.strictEqual(forwarded.dps['20'], true);
    assert.ok(Math.abs(dev._caps.light_hue - 0.5) < 0.01);
    dev._caps.dim = 1;
    await dev._sendColor();
    assert.strictEqual(sent[0]['2'], 'colour');
    assert.strictEqual(T.detectColorFormat(sent[0]['5']), 'v1');
    await dev._setDP(22, 1000);
    assert.deepStrictEqual(sent[1], { 3: 255 });
  });
  it('wifi_light modern layout keeps 12-char colour on DP 24', async () => {
    const Light = loadDriver('../../drivers/wifi_light/device.js');
    const dev = new Light();
    const sent = [];
    dev._client = { connected: true, setDPs: async (d) => sent.push(d) };
    Object.getPrototypeOf(Light.prototype)._onData = async function () {};
    await dev._onData({ dps: { 20: true, 24: '007803e803e8' } });
    assert.strictEqual(dev._lightSchema, 'modern');
    dev._caps = { light_hue: 0.5, light_saturation: 0, dim: 0.5 };
    await dev._sendColor();
    assert.deepStrictEqual(sent[0], { 21: 'colour', 24: '00b4000001f4' });
  });
  it('wifi_led_strip scales dim / temperature / colour correctly', () => {
    const Strip = loadDriver('../../drivers/wifi_led_strip/device.js');
    const dev = new Strip();
    const map = dev.dpMappings;
    assert.strictEqual(map['22'].transform(1000), 1);
    assert.strictEqual(map['22'].reverseTransform(0.5), 505);
    assert.strictEqual(map['23'].transform(500), 0.5);
    assert.strictEqual(map['23'].reverseTransform(0.5), 500);
    const sent = [];
    dev._client = { connected: true, setDPs: async (d) => sent.push(d) };
    dev._caps = { light_hue: 0.5, light_saturation: 1, dim: 1 };
    return dev._sendColor().then(() => {
      assert.deepStrictEqual(sent[0], { 21: 'colour', 24: '00b403e803e8' });
      Object.getPrototypeOf(Strip.prototype)._processDPUpdate = () => {};
      dev._processDPUpdate({ 24: '00b401f403e8' });
      assert.strictEqual(dev._caps.light_hue, 0.5);
      assert.strictEqual(dev._caps.light_saturation, 0.5);
    });
  });
  it('wifi_cover learns fz/zz vocabulary and answers with it', async () => {
    const Cover = loadDriver('../../drivers/wifi_cover/device.js');
    const dev = new Cover();
    const map = dev.dpMappings;
    assert.strictEqual(map['1'].reverseTransform('up'), 'open');
    assert.strictEqual(await map['1'].transform('zz'), 'down');
    assert.strictEqual(dev._store.cover_command_set, 'fz_zz_stop');
    assert.strictEqual(map['1'].reverseTransform('up'), 'fz');
    assert.strictEqual(map['1'].reverseTransform('idle'), 'stop');
  });
});
