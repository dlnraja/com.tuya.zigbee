'use strict';
// P2976: Switcher-style timer cards (idea credit: iBush, Switcher app, community.homey.app/t/160624;
// own implementation, soaked on master since 11/10 in 56dfb92607 / 13c4ff2eef).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const FFC = require('../lib/flow/FeatureFlowCards.js');
const Router = require('../lib/managers/FeatureFallbackRouter.js');

const ROOT = path.join(__dirname, '..');
const CARDS = {
  actions: ['device_countdown_off', 'device_on_for_minutes', 'device_auto_shutdown_set'],
  triggers: ['device_timer_changed'],
  conditions: ['device_timer_running'],
};

function fakeHomey() {
  const cards = {};
  const triggered = [];
  const mk = (id) => {
    if (!cards[id]) {
      cards[id] = {
        id,
        registerRunListener(fn) { this.run = fn; return this; },
        registerArgumentAutocompleteListener() { return this; },
        trigger(tokens, state) { triggered.push({ id, tokens, state }); return Promise.resolve(); },
      };
    }
    return cards[id];
  };
  const store = {};
  return {
    cards, triggered,
    homey: {
      log() {}, error() {},
      settings: { get: (k) => store[k], set: (k, v) => { store[k] = v; } },
      flow: { getTriggerCard: mk, getDeviceTriggerCard: mk, getConditionCard: mk, getActionCard: mk },
      setTimeout: (fn, ms) => setTimeout(fn, ms),
    },
  };
}

function makeFfc(h) {
  const ctx = Object.create(FFC.prototype);
  ctx.homey = h.homey;
  ctx.log = () => {};
  ctx.error = () => {};
  ctx._registered = { triggers: new Set(), conditions: new Set(), actions: new Set() };
  return ctx;
}

describe('P2976 Switcher timer cards (t/160624 idea)', () => {
  it('compose and root app.json declare every timer card', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    for (const [type, ids] of Object.entries(CARDS)) {
      for (const id of ids) {
        const c = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow', type, `${id}.json`), 'utf8'));
        assert.strictEqual(c.id, id);
        assert.ok((app.flow[type] || []).some((x) => x.id === id), `${type}/${id} missing from app.json`);
      }
    }
  });

  it('router tracks time left and notifies start/end without extra commands', () => {
    const r = new Router({ setTimeout: () => 0 });
    const events = [];
    r.onCountdownChange = (d, g, running, s) => events.push([g, running, s]);
    const dev = { id: 'd1' };
    r._trackCountdown(dev, 1, 120, true);
    const left = r.getCountdownLeft(dev, 1);
    assert.ok(left > 110 && left <= 120);
    r._endCountdown(dev, 1);
    assert.strictEqual(r.getCountdownLeft(dev, 1), 0);
    r._endCountdown(dev, 1); // idempotent: no second notification
    assert.deepStrictEqual(events, [[1, true, 120], [1, false, 0]]);
  });

  it('on_for_minutes turns on then arms a countdown; trigger/condition follow the router', async () => {
    const h = fakeHomey();
    const ffc = makeFfc(h);
    const router = new Router(h.homey);
    ffc.setFeatureFallbackRouter(router);
    ffc._registerLightAlertCards();
    for (const id of ['device_on_for_minutes', 'device_timer_changed', 'device_timer_running', 'device_countdown_off']) {
      assert.strictEqual(typeof h.cards[id]?.run, 'function', `${id} not registered`);
    }
    const caps = [];
    const dev = {
      id: 'dev1', getData: () => ({ id: 'dev1' }), getName: () => 'plug',
      hasCapability: (c) => c === 'onoff',
      setCapabilityValue: async (c, v) => { caps.push([c, v]); },
    };
    // No Tuya DP sender -> software timer path
    assert.strictEqual(await h.cards.device_on_for_minutes.run({ device: dev, minutes: 2 }), true);
    assert.deepStrictEqual(caps, [['onoff', true]]);
    assert.ok(router.getCountdownLeft(dev, 1) > 100);
    assert.strictEqual(await h.cards.device_timer_running.run({ device: dev }), true);
    const t = h.triggered.find((x) => x.id === 'device_timer_changed');
    assert.ok(t && t.tokens.running === true && t.tokens.minutes_left === 2 && t.tokens.gang === 1);
    assert.strictEqual(t.state.deviceId, 'dev1');
    assert.strictEqual(await h.cards.device_timer_changed.run({ device: dev }, { deviceId: 'dev1' }), true);
    assert.strictEqual(await h.cards.device_timer_changed.run({ device: dev }, { deviceId: 'other' }), false);
    router._endCountdown(dev, 1);
    assert.strictEqual(await h.cards.device_timer_running.run({ device: dev }), false);
    assert.ok(h.triggered.some((x) => x.id === 'device_timer_changed' && x.tokens.running === false));
  });

  it('minutes are clamped (1..1440) and a missing device is refused', async () => {
    const h = fakeHomey();
    const ffc = makeFfc(h);
    const calls = [];
    ffc.setFeatureFallbackRouter({ countdown: async (d, s, g) => { calls.push([s, g]); return { ok: true }; } });
    ffc._registerLightAlertCards();
    const dev = { id: 'x', setCapabilityValue: async () => {} };
    assert.strictEqual(await h.cards.device_on_for_minutes.run({ device: null, minutes: 5 }), false);
    await h.cards.device_on_for_minutes.run({ device: dev, minutes: 99999 });
    await h.cards.device_on_for_minutes.run({ device: dev, minutes: 'abc' });
    assert.deepStrictEqual(calls, [[1440 * 60, 1], [15 * 60, 1]]);
  });
});
