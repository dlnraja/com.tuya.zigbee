'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { analyse, mismatchHint } = require('../lib/tuya-local/LocalDeviceInsights');
const { suggestDriverFromDps } = require('../lib/tuya-local/TuyaPairingOrchestrator');

const Module = require('module');
const origLoad = Module._load;

describe('P2951 local insights wiring', () => {
  before(() => {
    Module._load = function (r, ...a) {
      if (r === 'homey') { class B {} return { Device: B, Driver: B, App: B, SimpleClass: B, __: (k) => k }; }
      return origLoad.call(this, r, ...a);
    };
  });
  after(() => { Module._load = origLoad; });
  it('suggests power strip for 3 boolean outlets', () => {
    assert.strictEqual(analyse({ 1: true, 2: false, 3: true }).suggestedDriver, 'wifi_power_strip');
  });
  it('suggests cover for enum DP1', () => {
    assert.strictEqual(suggestDriverFromDps({ 1: 'stop' }), 'wifi_cover');
  });
  it('returns null for plain plug and bad input', () => {
    assert.strictEqual(suggestDriverFromDps({ 1: true }), null);
    assert.strictEqual(suggestDriverFromDps(undefined), null);
  });
  it('no hint when already on the right driver', () => {
    assert.strictEqual(mismatchHint('wifi_power_strip', { 1: true, 2: true }), null);
    assert.strictEqual(mismatchHint('wifi_plug', { 1: true, 2: true }).suggested, 'wifi_power_strip');
  });
  it('device methods are advisory and never throw', () => {
    const proto = require('../lib/tuya-local/TuyaLocalDevice').prototype;
    const logs = []; const store = {};
    const fake = { driver: { id: 'wifi_plug' }, _client: { lastDps: { 1: true } }, log: (m) => logs.push(m),
      setStoreValue: async (k, v) => { store[k] = v; }, getStore: () => ({ id: 'x', local_key: 'K' }), getSettings: () => ({}) };
    proto._checkLocalInsights.call(fake, { 2: false });
    assert.strictEqual(store.local_insight.suggested, 'wifi_power_strip');
    proto._checkLocalInsights.call({}, null);
    const b = proto.getSupportBundle.call(fake);
    assert.ok(!JSON.stringify(b).includes('"K"'));
  });
});
