'use strict';
// P3065 D11 (t576u): adaptive lighting Flow cards (on/off, pause N minutes, is active, kelvin changed).
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const A = require('../../lib/flow/AdaptiveLightingCards');

const ROOT = path.join(__dirname, '..', '..');
const IDS = { actions: ['adaptive_lighting_set', 'adaptive_lighting_pause'], conditions: ['adaptive_lighting_is_active'], triggers: ['adaptive_kelvin_changed'] };

function host() {
  const cards = {};
  const timers = [];
  const mk = (id) => cards[id] = cards[id] || {
    id, fired: [], args: [],
    registerRunListener(fn) { this.run = fn; return this; },
    registerArgumentAutocompleteListener() { return this; },
    async trigger(tokens, state) { this.fired.push([tokens, state]); return true; },
    async getArgumentValues() { return this.args; },
    on() {},
  };
  const homey = {
    flow: { getTriggerCard: mk, getConditionCard: mk, getActionCard: mk }, i18n: { getLanguage: () => 'en' },
    setTimeout: (fn, ms) => { const h = { fn, ms }; timers.push(h); return h; }, clearTimeout: (h) => { h.cleared = true; },
    setInterval: () => ({}), app: {},
  };
  return { cards, timers, h: { homey, _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
}
function mgr() { return { active: false, starts: 0, stops: 0, start() { this.active = true; this.starts++; }, stop() { this.active = false; this.stops++; } }; }
function dev(caps, m) { return { adaptiveLighting: m, getData: () => ({ id: 'L1' }), hasCapability: (c) => caps.includes(c) }; }
const tick = () => new Promise((r) => setImmediate(r));

describe('P3065 D11 adaptive lighting cards', () => {
  it('cards are declared, filtered on light_temperature, en/fr/nl/de with [[device]]', () => {
    for (const [k, ids] of Object.entries(IDS)) {
      for (const id of ids) {
        const c = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow', k, `${id}.json`), 'utf8'));
        assert.equal(c.id, id);
        assert.equal(c.args[0].filter, 'capabilities=light_temperature');
        for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.title[l] && c.titleFormatted[l].includes('[[device]]'), `${id}.${l}`);}
      }
    }
    const t = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow/triggers/adaptive_kelvin_changed.json'), 'utf8'));
    assert.deepEqual(t.tokens.map((x) => x.name), ['kelvin', 'previous_kelvin']);
  });

  it('on/off, pause then auto-resume, condition false while paused', async () => {
    const { cards, timers, h } = host();
    new A.AdaptiveLightingCards(h).register();
    const m = mgr();
    const d = dev(['light_temperature'], m);
    await cards.adaptive_lighting_set.run({ device: d, state: 'on' });
    assert.equal(await cards.adaptive_lighting_is_active.run({ device: d }), true);
    await cards.adaptive_lighting_pause.run({ device: d, minutes: 15 });
    assert.equal(await cards.adaptive_lighting_is_active.run({ device: d }), false);
    assert.equal(timers.at(-1).ms, 15 * 60000);
    timers.at(-1).fn();
    assert.equal(m.active, true);
    await cards.adaptive_lighting_pause.run({ device: d, minutes: 5 });
    await cards.adaptive_lighting_set.run({ device: d, state: 'off' }); // cancels the pending resume
    assert.equal(timers.at(-1).cleared, true);
    assert.equal(m.active, false);
    await assert.rejects(cards.adaptive_lighting_pause.run({ device: d, minutes: 0 }));
    await assert.rejects(cards.adaptive_lighting_is_active.run({ device: dev([], undefined) }), /light_temperature/);
  });

  it('a light without a built-in manager gets one whose writes go through the listener; teardown stops it', async () => {
    const { cards, h } = host();
    new A.AdaptiveLightingCards(h).register();
    const calls = [];
    const d = { getData: () => ({ id: 'L2' }), hasCapability: (c) => c === 'light_temperature', homey: h.homey, getSetting: () => null,
      async triggerCapabilityListener(c, v) { calls.push([c, v]); }, async setCapabilityValue() { throw new Error('plain set used'); } };
    await cards.adaptive_lighting_set.run({ device: d, state: 'on' });
    assert.ok(d.adaptiveLighting && d.adaptiveLighting.active);
    await d.adaptiveLighting.device.setCapabilityValue('light_temperature', 0.4);
    assert.deepEqual(calls, [['light_temperature', 0.4]]);
    await d.onDeleted();
    assert.equal(d.adaptiveLighting.active, false);
    assert.equal(d.adaptiveLighting._destroyed, true);
  });

  it('kelvin trigger fires on a new value only, for a Flow that uses the device', async () => {
    const { cards, h } = host();
    const d = dev(['light_temperature'], mgr());
    h.homey.flow.getTriggerCard('adaptive_kelvin_changed').args = [{ device: d }];
    const c = new A.AdaptiveLightingCards(h);
    c.register(); await tick();
    c.onKelvin(d, 2700); c.onKelvin(d, 2700); c.onKelvin(d, 3200.4);
    c.onKelvin({ getData: () => ({ id: 'other' }) }, 5000);
    assert.deepEqual(cards.adaptive_kelvin_changed.fired.map((f) => f[0]), [{ kelvin: 2700, previous_kelvin: 0 }, { kelvin: 3200, previous_kelvin: 2700 }]);
    assert.equal(await cards.adaptive_kelvin_changed.run({ device: d }, cards.adaptive_kelvin_changed.fired[0][1]), true);
  });

  it('the manager feeds the kelvin card through the app hook', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/managers/AdaptiveLightingManager.js'), 'utf8');
    assert.match(src, /featureFlowCards\?\.triggerAdaptiveKelvin\?\.\(this\.device, kelvin\)/);
    const ffc = fs.readFileSync(path.join(ROOT, 'lib/flow/FeatureFlowCards.js'), 'utf8');
    assert.match(ffc, /triggerAdaptiveKelvin\(device, kelvin\)/);
  });
});
