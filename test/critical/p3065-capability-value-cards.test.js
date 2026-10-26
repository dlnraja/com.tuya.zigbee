'use strict';

/**
 * P3065 (t569u/t570u) — every capability of every driver has Flow coverage.
 * Static: completeness diag (custom caps need trigger / condition (bool+enum) / action (setable);
 * Homey system caps are skipped because Homey generates their cards). Runtime: the three generic
 * cards with a fake Homey — autocomplete, bounded set, old/new/delta tokens, per-gang sub-caps.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const { audit } = require('../../scripts/diag/flow-capability-completeness');
const V = require('../../lib/flow/CapabilityValueCards');

const GENERIC_ONLY_CEIL = 194; // 2026-10-26: (driver, custom cap, kind) rows with no dedicated card

const capsManifest = {};
for (const f of fs.readdirSync(path.join(root, '.homeycompose/capabilities'))) {
  capsManifest[f.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(root, '.homeycompose/capabilities', f), 'utf8'));
}

describe('P3065 flow completeness (static)', () => {
  const r = audit(root);
  it('every custom capability of every driver has trigger/condition/action coverage', () => {
    assert.ok(r.rows.length > 300, `scan saw ${r.rows.length} rows`);
    assert.deepEqual(r.missing.map((m) => `${m.driver}:${m.cap}:${m.kind}`), []);
  });
  it('rows only covered by the generic cards do not grow (add dedicated cards, not more gaps)', () => {
    assert.ok(r.genericOnly.length <= GENERIC_ONLY_CEIL, `genericOnly ${r.genericOnly.length}`);
  });
  it('generic cards have no device filter, autocomplete args and 4 languages', () => {
    for (const [kind, id] of [['triggers', 'capability_value_delta'], ['conditions', 'capability_value_is'], ['actions', 'capability_value_set']]) {
      const c = JSON.parse(fs.readFileSync(path.join(root, '.homeycompose/flow', kind, `${id}.json`), 'utf8'));
      assert.equal(c.id, id);
      assert.ok(!c.args[0].filter, `${id} filtered`);
      assert.equal(c.args.find((a) => a.name === 'capability').type, 'autocomplete');
      for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.title[l] && c.titleFormatted[l] && c.hint[l], `${id}.${l}`);}
    }
  });
});

function dev(values, opts = {}) {
  const calls = [];
  return {
    calls,
    getData: () => ({ id: 'd1' }),
    getCapabilities: () => Object.keys(values),
    hasCapability: (c) => c in values,
    getCapabilityValue: (c) => values[c],
    getCapabilityOptions: (c) => opts[c] || {},
    async triggerCapabilityListener(c, v) { calls.push([c, v]); values[c] = v; },
  };
}

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
  const homey = { manifest: { capabilities: capsManifest }, flow: { getTriggerCard: mk, getConditionCard: mk, getActionCard: mk }, i18n: { getLanguage: () => 'fr' }, setTimeout, clearTimeout };
  return { cards, h: { homey, _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
}

describe('P3065 generic value cards (runtime)', () => {
  const values = () => ({ onoff: true, 'onoff.gang2': false, power_on_behavior: 'off', 'measure_power.l1': 120, measure_voc: 3, child_lock: false, target_temperature: 20 });

  it('autocomplete lists sub-caps and custom caps; set list excludes measurements', async () => {
    const { cards, h } = host();
    new V.CapabilityValueCards(h).register();
    const d = dev(values(), { target_temperature: { min: 5, max: 30 } });
    const all = (await cards.capability_value_delta.listeners.capability('', { device: d })).map((x) => x.id);
    for (const c of ['onoff.gang2', 'measure_power.l1', 'power_on_behavior', 'measure_voc']) {assert.ok(all.includes(c), c);}
    const set = (await cards.capability_value_set.listeners.capability('', { device: d })).map((x) => x.id);
    assert.ok(set.includes('onoff.gang2') && set.includes('power_on_behavior') && set.includes('child_lock'));
    assert.ok(!set.includes('measure_power.l1') && !set.includes('measure_voc'));
    const enumVals = (await cards.capability_value_is.listeners.value('', { device: d, capability: { id: 'power_on_behavior' } })).map((x) => x.id);
    assert.ok(enumVals.includes('on') && enumVals.includes('off'));
    assert.equal((await cards.capability_value_is.listeners.value('', { device: d, capability: 'onoff.gang2' })).length, 2);
  });

  it('set action is bounded and error-safe; condition compares', async () => {
    const { cards, h } = host();
    new V.CapabilityValueCards(h).register();
    const d = dev(values(), { target_temperature: { min: 5, max: 30 } });
    await cards.capability_value_set.run({ device: d, capability: { id: 'onoff.gang2' }, value: { id: 'true' } });
    assert.deepEqual(d.calls.at(-1), ['onoff.gang2', true]);
    await cards.capability_value_set.run({ device: d, capability: 'power_on_behavior', value: 'on' });
    assert.equal(await cards.capability_value_is.run({ device: d, capability: 'power_on_behavior', value: 'on' }), true);
    await assert.rejects(cards.capability_value_set.run({ device: d, capability: 'power_on_behavior', value: 'bogus' }), /valeur valide/);
    await assert.rejects(cards.capability_value_set.run({ device: d, capability: 'target_temperature', value: '45' }), /hors de 5–30/);
    await assert.rejects(cards.capability_value_set.run({ device: d, capability: 'measure_voc', value: '1' }), /ne peut pas être réglé/);
    await assert.rejects(cards.capability_value_set.run({ device: d, capability: 'nope', value: '1' }), /pas la capacité/);
    assert.equal(d.calls.length, 2);
  });

  it('trigger fires only for wanted cap and min delta, with old/new/delta tokens', async () => {
    const { cards, h } = host();
    const g = new V.CapabilityValueCards(h);
    g.register();
    const d = dev(values());
    cards.capability_value_delta.args = [{ device: d, capability: { id: 'measure_power.l1' }, min_delta: 50 }];
    g._args = undefined; g._argsFor('capability_value_delta');
    await new Promise((res) => setImmediate(res));
    g.onCapabilityChanged(d, 'd1', 'measure_power.l1', 140, 120); // below min delta
    g.onCapabilityChanged(d, 'd1', 'onoff.gang2', true, false); // not wanted
    g.onCapabilityChanged(d, 'd1', 'measure_power.l1', 200, 120);
    assert.equal(cards.capability_value_delta.fired.length, 1);
    const [tok, st] = cards.capability_value_delta.fired[0];
    assert.deepEqual(tok, { value: 200, previous: 120, delta: 80, text: '200', capability: 'measure_power.l1' });
    assert.equal(await cards.capability_value_delta.run({ device: d, capability: { id: 'measure_power.l1' }, min_delta: 50 }, st), true);
    assert.equal(await cards.capability_value_delta.run({ device: d, capability: { id: 'measure_power.l1' }, min_delta: 100 }, st), false);
  });

  it('error messages exist in en, fr, nl, de', () => {
    for (const [k, m] of Object.entries(V.MSG)) {for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(m[l], `${k}.${l}`);}}
  });
});
