'use strict';

/**
 * P2775 — generic app-level device Flow cards + P2776 flow-card quality pass.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const G = require('../../lib/flow/GenericDeviceCards');

const NEW = {
  triggers: ['capability_crossed_threshold', 'gang_switched', 'child_lock_changed', 'motion_absent_for'],
  conditions: ['capability_is_between', 'gang_is_on', 'child_lock_is_on'],
  actions: ['gang_set', 'child_lock_set', 'backlight_set'],
};

function dev(caps = {}, settings = [], values = {}) {
  const v = { ...caps };
  const s = { ...values };
  const calls = [];
  return {
    calls,
    getData: () => ({ id: 'd1' }),
    hasCapability: (c) => c in v,
    getCapabilities: () => Object.keys(v),
    getCapabilityValue: (c) => v[c],
    triggerCapabilityListener: async (c, x) => { calls.push([c, x]); v[c] = x; },
    driver: { manifest: { settings } },
    getSettings: () => s,
    setSettings: async (o) => { Object.assign(s, o); calls.push(['settings', o]); },
  };
}

describe('P2775 pure helpers', () => {
  it('threshold crossing is edge-triggered', () => {
    assert.equal(G.crossed(24, 26, 25, 'above'), true);
    assert.equal(G.crossed(26, 27, 25, 'above'), false);
    assert.equal(G.crossed(26, 24, 25, 'below'), true);
    assert.equal(G.crossed(24, 23, 25, 'below'), false);
    assert.equal(G.crossed(null, 30, 25, 'above'), false);
  });
  it('between is inclusive', () => {
    assert.equal(G.isBetween(5, 5, 10), true);
    assert.equal(G.isBetween(11, 5, 10), false);
  });
  it('gang capability resolution covers the naming variants', () => {
    assert.equal(G.gangCapability(dev({ onoff: true, 'onoff.gang2': false }), 1), 'onoff');
    assert.equal(G.gangCapability(dev({ onoff: true, 'onoff.gang2': false }), 2), 'onoff.gang2');
    assert.equal(G.gangCapability(dev({ 'onoff.3': false }), 3), 'onoff.3');
    assert.equal(G.gangCapability(dev({ onoff: true }), 4), null);
    assert.equal(G.gangOf('onoff'), 1);
    assert.equal(G.gangOf('onoff.gang3'), 3);
    assert.equal(G.gangOf('onoff.usb2'), null);
  });
  it('backlight plan maps to the device setting type', () => {
    const dd = [{ id: 'backlight_mode', type: 'dropdown', values: [{ id: 'off' }, { id: 'normal' }, { id: 'inverted' }] }];
    assert.deepEqual(G.backlightPlan(dev({}, dd), 'on'), { id: 'backlight_mode', value: 'normal' });
    assert.deepEqual(G.backlightPlan(dev({}, dd), 'inverted'), { id: 'backlight_mode', value: 'inverted' });
    assert.deepEqual(G.backlightPlan(dev({}, [{ id: 'backlight', type: 'checkbox' }]), 'off'), { id: 'backlight', value: 'false' });
    assert.equal(G.backlightPlan(dev({}, []), 'on'), null);
  });
  it('error messages exist in en, fr, nl, de', () => {
    for (const [k, m] of Object.entries(G.MSG)) {for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(m[l], `${k}.${l}`);}}
  });
});

describe('P2775 card wiring with a fake Homey', () => {
  function host() {
    const cards = {};
    const mk = (id) => cards[id] = cards[id] || {
      id, listeners: {}, fired: [], args: [],
      registerRunListener(fn) { this.run = fn; return this; },
      registerArgumentAutocompleteListener(a, fn) { this.listeners[a] = fn; return this; },
      async trigger(tokens, state) { this.fired.push([tokens, state]); return true; },
      async getArgumentValues() { return this.args; },
      on() {},
    };
    const homey = { flow: { getTriggerCard: mk, getConditionCard: mk, getActionCard: mk }, i18n: { getLanguage: () => 'fr' }, setTimeout, clearTimeout };
    return { cards, h: { homey, _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
  }

  it('registers all cards and the actions work', async () => {
    const { cards, h } = host();
    const g = new G.GenericDeviceCards(h);
    g.register();
    for (const list of Object.values(NEW)) {for (const id of list) {assert.ok(cards[id] && cards[id].run, id);}}
    const d = dev({ onoff: false, 'onoff.gang2': false, child_lock: false });
    await cards.gang_set.run({ device: d, gang: 2, action: 'toggle' });
    assert.deepEqual(d.calls.at(-1), ['onoff.gang2', true]);
    assert.equal(await cards.gang_is_on.run({ device: d, gang: 2 }), true);
    await cards.child_lock_set.run({ device: d, state: 'on' });
    assert.equal(await cards.child_lock_is_on.run({ device: d }), true);
    await assert.rejects(cards.gang_set.run({ device: d, gang: 5, action: 'on' }), /pas de voie 5/);
    await assert.rejects(cards.backlight_set.run({ device: d, mode: 'on' }), /rétroéclairage/);
  });

  it('fires the threshold trigger only for Flows that want it', async () => {
    const { cards, h } = host();
    const g = new G.GenericDeviceCards(h);
    const d = dev({ measure_temperature: 24 });
    cards.capability_crossed_threshold = undefined;
    g.register();
    cards.capability_crossed_threshold.args = [{ device: d, capability: { id: 'measure_temperature' }, threshold: 25, direction: 'above' }];
    g._args = new Map();
    g._argsFor('capability_crossed_threshold');
    await new Promise((r) => setImmediate(r));
    g.onCapabilityChanged(d, 'd1', 'measure_temperature', 26, 24);
    g.onCapabilityChanged(d, 'd1', 'measure_humidity', 60, 40);
    assert.equal(cards.capability_crossed_threshold.fired.length, 1);
    const [tokens, state] = cards.capability_crossed_threshold.fired[0];
    assert.equal(tokens.value, 26);
    assert.equal(await cards.capability_crossed_threshold.run({ device: d, capability: { id: 'measure_temperature' }, threshold: 25, direction: 'above' }, state), true);
  });
});

describe('P2775/P2776 manifest quality', () => {
  const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  it('new cards are declared with en/fr/nl/de titles and titleFormatted', () => {
    for (const [t, ids] of Object.entries(NEW)) {
      for (const id of ids) {
        const c = read(`.homeycompose/flow/${t}/${id}.json`);
        for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.title[l], `${id} title.${l}`);}
        // Repo rule (manual-select bug): triggers never carry [[device]] in titleFormatted.
        if (t === 'triggers') {
          assert.ok(!c.titleFormatted || !JSON.stringify(c.titleFormatted).includes('[[device]]'), `${id} trigger without [[device]]`);
        } else {
          for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.titleFormatted[l], `${id} titleFormatted.${l}`);}
        }
        for (const a of c.args) {
          if (c.titleFormatted) {assert.ok(c.titleFormatted.en.includes(`[[${a.name}]]`), `${id} references [[${a.name}]]`);}
          if (a.type === 'number') {assert.ok(a.min !== undefined && a.max !== undefined, `${id}.${a.name} range`);}
        }
      }
    }
  });
  it('every card with arguments has a titleFormatted; app cards have fr/nl/de titles', () => {
    const missing = [];
    for (const t of ['triggers', 'conditions', 'actions']) {
      for (const f of fs.readdirSync(path.join(root, '.homeycompose/flow', t))) {
        const c = read(`.homeycompose/flow/${t}/${f}`);
        const devArg = (c.args || []).some((a) => a.type === 'device');
        const exempt = (t === 'triggers' && devArg) || c.id === 'soft_ambient_sync_apply';
        if (!exempt && (c.args || []).some((a) => a.type !== 'device') && !c.titleFormatted) {missing.push(c.id);}
        for (const l of ['fr', 'nl', 'de']) {if (!c.title[l]) {missing.push(`${c.id}.${l}`);}}
      }
    }
    for (const d of fs.readdirSync(path.join(root, 'drivers'))) {
      const p = `drivers/${d}/driver.flow.compose.json`;
      if (!fs.existsSync(path.join(root, p))) {continue;}
      const j = read(p);
      for (const t of ['triggers', 'conditions', 'actions']) {
        for (const c of j[t] || []) {
          const explicitDev = (c.args || []).some((a) => a.type === 'device');
          // IR remotes / clear-presence must omit titleFormatted (repo rule, see regression-lessons-gate)
          const policyOmit = /(^|_)ir_remote_|_clear_presence$/.test(c.id);
          if (!explicitDev && !policyOmit && (c.args || []).some((a) => a.type !== 'device') && !c.titleFormatted) {missing.push(c.id);}
        }
      }
    }
    assert.deepEqual(missing, []);
  });
});
