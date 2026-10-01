'use strict';

/**
 * P2777 — predictive / smart Flow cards: battery forecast, anomaly, trend, offline risk,
 * plus device matching on the existing health-prediction triggers.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const P = require('../../lib/flow/PredictiveFlowCards');

const DAY = 86400000;
const HOUR = 3600000;

describe('P2777 statistics', () => {
  it('battery forecast from a steady drain', () => {
    const t0 = 1e12;
    // 1 %/day from 50 % → empty (5 %) in 40 days from the last sample (45 %)
    const s = [[t0, 50], [t0 + 2 * DAY, 48], [t0 + 5 * DAY, 45]];
    assert.equal(P.forecastDaysRemaining(s, t0 + 5 * DAY), 40);
  });
  it('no forecast when flat, rising, too short or too few samples', () => {
    const t0 = 1e12;
    assert.equal(P.forecastDaysRemaining([[t0, 50], [t0 + 3 * DAY, 50], [t0 + 6 * DAY, 50]], t0 + 6 * DAY), null);
    assert.equal(P.forecastDaysRemaining([[t0, 40], [t0 + 3 * DAY, 60], [t0 + 6 * DAY, 80]], t0 + 6 * DAY), null);
    assert.equal(P.forecastDaysRemaining([[t0, 50], [t0 + HOUR, 49], [t0 + 2 * HOUR, 48]], t0 + 2 * HOUR), null);
    assert.equal(P.forecastDaysRemaining([[t0, 50], [t0 + 3 * DAY, 47]], t0 + 3 * DAY), null);
  });
  it('battery samples only grow on change and stay bounded', () => {
    let s = [];
    s = P.pushBatterySample(s, 80, 1);
    s = P.pushBatterySample(s, 80, 2);
    assert.equal(s.length, 1);
    for (let i = 0; i < 60; i++) {s = P.pushBatterySample(s, 79 - (i % 70), 10 + i);}
    assert.ok(s.length <= 40);
    assert.equal(P.pushBatterySample(s, 150, 100).length, s.length);
  });
  it('anomaly z-score after warm-up', () => {
    let st = null;
    for (let i = 0; i < 40; i++) {st = P.ewma(st, 100 + (i % 2 ? 5 : -5));}
    assert.equal(P.zScore({ ...st, n: 5 }, 500), null);
    assert.ok(Math.abs(P.zScore(st, 102)) < 2);
    assert.ok(P.zScore(st, 500) > 4);
  });
  it('trend per hour and label', () => {
    const t0 = 1e12;
    const s = [[t0, 50], [t0 + 20 * 60000, 55], [t0 + 40 * 60000, 60], [t0 + 60 * 60000, 65]];
    const tr = P.trend(s, t0 + 60 * 60000, HOUR + 1);
    assert.equal(tr.label, 'rising');
    assert.equal(Math.round(tr.perHour), 15);
    assert.equal(P.trend([[t0, 1]], t0).label, 'unknown');
    assert.equal(P.median([5, 1, 3]), 3);
  });
});

describe('P2777 cards with a fake Homey', () => {
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
  const dev = (id = 'd1') => {
    const store = {};
    return { getData: () => ({ id }), hasCapability: () => true, getStoreValue: (k) => store[k], setStoreValue: async (k, v) => { store[k] = v; }, store };
  };

  it('anomaly fires for a wanted capability only, after learning', async () => {
    const { cards, h } = host();
    const p = new P.PredictiveFlowCards(h);
    p.register();
    const d = dev();
    cards.capability_anomaly.args = [{ device: d, capability: { id: 'measure_power' }, sensitivity: 'medium' }];
    p._args = new Map(); p._argsFor('capability_anomaly');
    await new Promise((r) => setImmediate(r));
    for (let i = 0; i < 30; i++) {p.onCapabilityChanged(d, 'd1', 'measure_power', 100 + (i % 2 ? 3 : -3), 100);}
    assert.equal(cards.capability_anomaly.fired.length, 0);
    p.onCapabilityChanged(d, 'd1', 'measure_power', 2000, 100);
    assert.equal(cards.capability_anomaly.fired.length, 1);
    const [, state] = cards.capability_anomaly.fired[0];
    assert.equal(await cards.capability_anomaly.run({ device: d, capability: { id: 'measure_power' }, sensitivity: 'medium' }, state), true);
    assert.equal(await cards.capability_anomaly.run({ device: dev('other'), capability: { id: 'measure_power' }, sensitivity: 'medium' }, state), false);
  });

  it('battery samples are persisted in the device store and the condition reads them', async () => {
    const { cards, h } = host();
    const p = new P.PredictiveFlowCards(h);
    p.register();
    const d = dev();
    const now = Date.now();
    d.store[P.BATT_KEY] = [[now - 6 * DAY, 30], [now - 3 * DAY, 27]];
    p.onCapabilityChanged(d, 'd1', 'measure_battery', 24, 27);
    assert.equal(d.store[P.BATT_KEY].length, 3);
    assert.equal(await cards.battery_days_remaining_below.run({ device: d, days: 30 }), true);
    assert.equal(await cards.battery_days_remaining_below.run({ device: d, days: 5 }), false);
  });

  it('offline risk fires once per silence after a regular rhythm', async () => {
    const { cards, h } = host();
    const p = new P.PredictiveFlowCards(h);
    p.register();
    const d = dev();
    cards.device_offline_risk.args = [{ device: d, factor: 3 }];
    p._args = new Map(); p._argsFor('device_offline_risk');
    await new Promise((r) => setImmediate(r));
    const t0 = Date.now() - 10 * 10 * 60000;
    p._seen.set('d1', { last: t0 + 6 * 10 * 60000, intervals: [600000, 600000, 600000, 600000, 600000, 600000] });
    p._checkOfflineRisk(t0 + 6 * 10 * 60000 + 31 * 60000);
    p._checkOfflineRisk(t0 + 6 * 10 * 60000 + 40 * 60000);
    assert.equal(cards.device_offline_risk.fired.length, 1);
    assert.equal(await cards.device_silent_for.run({ device: d, minutes: 1 }), true);
  });
});

describe('P2777 manifest + wiring', () => {
  const ids = {
    triggers: ['battery_depletion_forecast', 'capability_anomaly', 'capability_trend', 'device_offline_risk'],
    conditions: ['battery_days_remaining_below', 'capability_trend_is', 'device_silent_for'],
  };
  it('cards declared with en/fr/nl/de; triggers without [[device]] titleFormatted; ranged numbers', () => {
    for (const [t, list] of Object.entries(ids)) {
      for (const id of list) {
        const c = JSON.parse(fs.readFileSync(path.join(root, `.homeycompose/flow/${t}/${id}.json`), 'utf8'));
        for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.title[l], `${id}.${l}`);}
        if (t === 'triggers') {assert.ok(!c.titleFormatted || !JSON.stringify(c.titleFormatted).includes('[[device]]'));} else {
          for (const a of c.args) {assert.ok(c.titleFormatted.en.includes(`[[${a.name}]]`), `${id} [[${a.name}]]`);}
        }
        for (const a of c.args) {if (a.type === 'number') {assert.ok(a.min !== undefined && a.max !== undefined, `${id}.${a.name}`);}}
      }
    }
  });
  it('health prediction triggers now match the device and reach the app card', () => {
    const src = fs.readFileSync(path.join(root, 'lib/flow/FeatureFlowCards.js'), 'utf8');
    assert.match(src, /state\.type === 'failure_predicted' && devMatch\(args, state\)/);
    assert.match(src, /deviceCard && !deviceCard\.__flowGuardNoop/);
    assert.match(src, /_predictiveFlowCards\?\.onCapabilityChanged/);
  });
});
