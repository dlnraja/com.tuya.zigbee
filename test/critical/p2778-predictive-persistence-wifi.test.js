'use strict';

/**
 * P2778 — predictive learning persisted per device (compact, throttled), restored after a
 * restart without false offline alerts; WiFi devices reach the generic/predictive cards.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const P = require('../../lib/flow/PredictiveFlowCards');

const MIN = 60000;

function host() {
  const cards = {};
  const mk = (id) => cards[id] = cards[id] || {
    id, fired: [], args: [],
    registerRunListener(fn) { this.run = fn; return this; },
    registerArgumentAutocompleteListener() { return this; },
    async trigger(tokens, state) { this.fired.push([tokens, state]); return true; },
    async getArgumentValues() { return this.args; },
    on() {},
  };
  const homey = { flow: { getTriggerCard: mk, getConditionCard: mk, getActionCard: mk }, i18n: { getLanguage: () => 'en' }, setInterval() { return 1; }, clearInterval() {} };
  return { cards, h: { homey, _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
}
function dev(id = 'd1', store = {}) {
  const writes = [];
  return { writes, store, getData: () => ({ id }), hasCapability: () => true, getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = JSON.parse(JSON.stringify(v)); writes.push(k); } };
}
async function boot(argsByCard = {}) {
  const { cards, h } = host();
  const p = new P.PredictiveFlowCards(h);
  p.register();
  for (const [id, a] of Object.entries(argsByCard)) {cards[id].args = a;}
  p._args = new Map();
  for (const id of Object.keys(argsByCard)) {p._argsFor(id);}
  await new Promise((r) => setImmediate(r));
  return { p, cards };
}

describe('P2778 encode/decode', () => {
  it('round-trips compactly and bounds sizes', () => {
    const now = Date.now();
    const series = { measure_power: Array.from({ length: 300 }, (_x, i) => [now - (300 - i) * 20000, i]) };
    const seen = { last: now, intervals: Array.from({ length: 50 }, () => 600000) };
    const enc = P.encodeLearned({ stats: { measure_power: { mean: 100.123456, variance: 9.87654, n: 42 } }, seen, series }, now);
    assert.ok(enc.tr.measure_power.length <= 31);
    assert.equal(enc.r.i.length, 20);
    assert.ok(JSON.stringify(enc).length < 1500);
    const dec = P.decodeLearned(JSON.parse(JSON.stringify(enc)), now);
    assert.deepEqual(dec.stats.measure_power, { mean: 100.123, variance: 9.877, n: 42 });
    assert.equal(dec.seen.intervals[0], 600000);
    assert.ok(dec.series.measure_power.length > 2);
  });
  it('ignores garbage and expired series', () => {
    assert.deepEqual(P.decodeLearned('x'), { stats: {}, seen: null, series: {} });
    assert.deepEqual(P.decodeLearned({ v: 2 }).stats, {});
    const now = Date.now();
    const d = P.decodeLearned({ v: 1, s: { a: [1, 'x', 3] }, tr: { a: [[Math.round((now - 3 * 3600000) / 1000), 1]] } }, now);
    assert.deepEqual(d.stats, {});
    assert.deepEqual(d.series, {});
  });
});

describe('P2778 throttled persistence', () => {
  it('writes at most once per 15 min, only for devices used by a learning card', async () => {
    const d = dev('d1');
    const other = dev('d2');
    const { p } = await boot({ capability_anomaly: [{ device: d, capability: { id: 'measure_power' }, sensitivity: 'medium' }] });
    for (let i = 0; i < 25; i++) {p.onCapabilityChanged(d, 'd1', 'measure_power', 100 + (i % 2));}
    for (let i = 0; i < 5; i++) {p.onCapabilityChanged(other, 'd2', 'measure_power', i);}
    assert.equal(d.writes.filter((k) => k === P.LEARN_KEY).length, 1);
    assert.equal(other.writes.length, 0);
    assert.equal(p._maybePersist(d, 'd1', Date.now() + P.LEARN_SAVE_EVERY_MS - 1000), false);
    assert.equal(p._maybePersist(d, 'd1', Date.now() + P.LEARN_SAVE_EVERY_MS + 1000), true);
    assert.equal(p._maybePersist(d, 'd1', Date.now() + 2 * P.LEARN_SAVE_EVERY_MS + 2000), false, 'not dirty');
    p.onCapabilityChanged(d, 'd1', 'measure_power', 100);
    p.destroy();
    assert.equal(d.writes.filter((k) => k === P.LEARN_KEY).length, 3, 'destroy flushes dirty state');
    assert.equal(d.store[P.LEARN_KEY].s.measure_power[2], 26);
  });

  it('learned anomaly baseline survives a restart', async () => {
    const d = dev('d1');
    const args = { capability_anomaly: [{ device: d, capability: { id: 'measure_power' }, sensitivity: 'medium' }] };
    const a = await boot(args);
    for (let i = 0; i < 30; i++) {a.p.onCapabilityChanged(d, 'd1', 'measure_power', 100 + (i % 2 ? 3 : -3));}
    a.p.destroy();
    const b = await boot(args); // "restart": new instance, same store
    b.p.onCapabilityChanged(d, 'd1', 'measure_power', 2000);
    assert.equal(b.cards.capability_anomaly.fired.length, 1);
  });

  it('restored rhythm never counts silence from before the restart', async () => {
    const now = Date.now();
    const store = { [P.LEARN_KEY]: { v: 1, t: Math.round((now - 120 * MIN) / 1000), r: { l: Math.round((now - 120 * MIN) / 1000), i: [600, 600, 600, 600, 600, 600] } } };
    const d = dev('d1', store);
    const { p, cards } = await boot({ device_offline_risk: [{ device: d, factor: 3 }] });
    p._checkOfflineRisk(now + MIN);
    assert.equal(cards.device_offline_risk.fired.length, 0, 'no alert right after restart');
    p._checkOfflineRisk(now + 31 * MIN);
    assert.equal(cards.device_offline_risk.fired.length, 1, 'alert once the learned rhythm is exceeded after start');
  });
});

describe('P2778 WiFi + device index', () => {
  it('WiFi devices feed the shared capability observer and cards have no driver filter', () => {
    const wifi = fs.readFileSync(path.join(root, 'lib/tuya-local/TuyaLocalDevice.js'), 'utf8');
    assert.match(wifi, /featureFlowCards\.triggerCapabilityChanged\(/);
    for (const f of ['triggers/capability_anomaly', 'triggers/device_offline_risk', 'triggers/capability_crossed_threshold', 'actions/gang_set', 'conditions/device_silent_for']) {
      const c = JSON.parse(fs.readFileSync(path.join(root, `.homeycompose/flow/${f}.json`), 'utf8'));
      assert.ok(!c.args.find((a) => a.type === 'device').filter, f);
    }
  });
  it('device index is rebuilt on a miss (devices paired later)', () => {
    const FFC = require('../../lib/flow/FeatureFlowCards');
    const Klass = FFC.FeatureFlowCards || FFC;
    const devices = [{ getData: () => ({ id: 'a' }) }];
    const self = { homey: { drivers: { getDrivers: () => ({ x: { getDevices: () => devices } }) } } };
    const resolve = Klass.prototype._resolveDevice.bind(self);
    assert.ok(resolve('a'));
    devices.push({ getData: () => ({ id: 'wifi1' }) });
    self._deviceIndexAt = Date.now() - 61000;
    assert.ok(resolve('wifi1'));
  });
});
