'use strict';
// P3065 D14: adaptive cards drive the shared P3067 engine (pause/resume/isActiveFor) when the light has
// the `adaptive_lighting` setting; the per-device manager stays the fallback; never two writers.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { AdaptiveLightingCards } = require('../../lib/flow/AdaptiveLightingCards');
const Engine = require('../../lib/lighting/AdaptiveLightingEngine');

function host(engine) {
  const cards = {};
  const mk = (id) => cards[id] = cards[id] || { id, fired: [], args: [], registerRunListener(fn) { this.run = fn; return this; },
    registerArgumentAutocompleteListener() { return this; }, async trigger(t, s) { this.fired.push([t, s]); }, async getArgumentValues() { return this.args; }, on() {} };
  const homey = { flow: { getTriggerCard: mk, getConditionCard: mk, getActionCard: mk }, i18n: { getLanguage: () => 'en' },
    setTimeout: () => ({}), clearTimeout() {}, setInterval: () => ({}), clearInterval() {}, settings: { get: () => undefined }, app: { adaptiveLightingEngine: engine } };
  return { cards, homey, h: { homey, _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
}
function light(settings) {
  return { getData: () => ({ id: 'L1' }), hasCapability: (c) => ['onoff', 'light_temperature', 'dim'].includes(c),
    getCapabilityValue: () => true, getSetting: (k) => settings[k], async setSettings(o) { Object.assign(settings, o); } };
}

describe('P3065 D14 adaptive cards on the shared engine', () => {
  it('off/on goes through the setting, pause and condition use the engine, no manager is created', async () => {
    let t = 1000;
    const { cards, homey, h } = host(null);
    const eng = new Engine(homey, { now: () => t });
    homey.app.adaptiveLightingEngine = eng;
    new AdaptiveLightingCards(h).register();
    const s = { adaptive_lighting: true };
    const d = light(s);
    assert.equal(await cards.adaptive_lighting_is_active.run({ device: d }), true);
    await cards.adaptive_lighting_pause.run({ device: d, minutes: 10 });
    assert.equal(await cards.adaptive_lighting_is_active.run({ device: d }), false);
    t += 10 * 60000;
    assert.equal(await cards.adaptive_lighting_is_active.run({ device: d }), true);
    await cards.adaptive_lighting_set.run({ device: d, state: 'off' });
    assert.equal(s.adaptive_lighting, false);
    assert.equal(await cards.adaptive_lighting_is_active.run({ device: d }), false);
    await cards.adaptive_lighting_pause.run({ device: d, minutes: 5 });
    await cards.adaptive_lighting_set.run({ device: d, state: 'on' });
    assert.equal(s.adaptive_lighting, true);
    assert.equal(await cards.adaptive_lighting_is_active.run({ device: d }), true, 'on lifts the pause');
    assert.equal(d.adaptiveLighting, undefined, 'no per-device manager while the engine owns the light');
  });

  it('a light without the setting keeps the per-device manager fallback', async () => {
    const { cards, h } = host({ pause() { throw new Error('engine must not be used'); }, resume() {}, isActiveFor: () => false });
    new AdaptiveLightingCards(h).register();
    const m = { active: false, start() { this.active = true; }, stop() { this.active = false; } };
    const d = { adaptiveLighting: m, getData: () => ({ id: 'L2' }), hasCapability: (c) => c === 'light_temperature', getSetting: () => undefined };
    await cards.adaptive_lighting_set.run({ device: d, state: 'on' });
    assert.equal(m.active, true);
    assert.equal(await cards.adaptive_lighting_is_active.run({ device: d }), true);
  });

  it('engine feeds the kelvin trigger; engine skips lights whose manager is active (one writer)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../lib/lighting/AdaptiveLightingEngine.js'), 'utf8');
    assert.match(src, /featureFlowCards\?\.triggerAdaptiveKelvin\?\./);
    assert.equal(Engine.isEligible({ getSetting: (k) => k === 'adaptive_lighting', hasCapability: () => true, adaptiveLighting: { active: true } }), false);
  });
});
