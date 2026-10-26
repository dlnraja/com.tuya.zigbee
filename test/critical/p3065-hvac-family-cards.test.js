'use strict';
// P3065 D24: dedicated hvac_system_mode family cards (trigger / condition / action), autocomplete fed by
// the device's own enum list (capabilitiesOptions win over the app capability), no stored value list.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const F = require('../../lib/flow/FamilyCapabilityCards');

const ROOT = path.join(__dirname, '..', '..');
const cap = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/capabilities/hvac_system_mode.json'), 'utf8'));
const read = (k, id) => JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow', k, `${id}.json`), 'utf8'));

function host() {
  const cards = {};
  const mk = (id) => cards[id] = cards[id] || {
    id, fired: [], args: [], ac: {},
    registerRunListener(fn) { this.run = fn; return this; },
    registerArgumentAutocompleteListener(a, fn) { this.ac[a] = fn; return this; },
    async trigger(tokens, state) { this.fired.push([tokens, state]); return true; },
    async getArgumentValues() { return this.args; },
    on() {},
  };
  const homey = { manifest: { capabilities: { hvac_system_mode: cap } }, flow: { getTriggerCard: mk, getConditionCard: mk, getActionCard: mk }, i18n: { getLanguage: () => 'fr' } };
  return { cards, h: { homey, _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
}
function dev(values, options) {
  const calls = [];
  return {
    calls, getData: () => ({ id: 'd1' }),
    hasCapability: (c) => c in values,
    getCapabilityValue: (c) => values[c],
    getCapabilityOptions: () => options || {},
    async triggerCapabilityListener(c, v) { calls.push([c, v]); values[c] = v; },
  };
}
const tick = () => new Promise((r) => setImmediate(r));

describe('P3065 D24 hvac_system_mode family cards', () => {
  it('declared once, filtered on the capability, autocomplete [[mode]], no stored values', () => {
    const fam = F.FAMILIES.find((f) => f.cap === 'hvac_system_mode');
    assert.ok(fam && fam.autocomplete && fam.arg === 'mode');
    for (const [k, id] of [['triggers', fam.trigger], ['conditions', fam.condition], ['actions', fam.action]]) {
      const c = read(k, id);
      assert.equal(c.args[0].filter, 'capabilities=hvac_system_mode');
      for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.title[l] && c.titleFormatted[l].includes('[[device]]'), `${id}.${l}`);}
      const m = c.args.find((a) => a.name === 'mode');
      if (k !== 'triggers') {assert.equal(m.type, 'autocomplete'); assert.ok(!m.values);}
    }
    assert.deepEqual(read('triggers', fam.trigger).tokens.map((t) => t.name), ['mode', 'previous']);
  });

  it('trigger tokens, condition, action checked against the device list, autocomplete uses device options', async () => {
    const { cards, h } = host();
    const fc = new F.FamilyCapabilityCards(h);
    const d = dev({ hvac_system_mode: 'cool' }, { values: [{ id: 'cool', title: { en: 'Cool', fr: 'Froid' } }, { id: 'heat', title: { en: 'Heat', fr: 'Chaud' } }] });
    h.homey.flow.getTriggerCard('hvac_system_mode_changed').args = [{ device: d }];
    fc.register(); await tick();
    fc.onCapabilityChanged(d, 'd1', 'hvac_system_mode', 'heat', 'cool');
    fc.onCapabilityChanged(d, 'd1', 'hvac_system_mode', 'heat', 'heat');
    await tick();
    assert.equal(cards.hvac_system_mode_changed.fired.length, 1);
    assert.deepEqual(cards.hvac_system_mode_changed.fired[0][0], { mode: 'heat', previous: 'cool' });
    assert.equal(await cards.hvac_system_mode_is.run({ device: d, mode: { id: 'cool' } }), true);
    await cards.hvac_system_mode_set.run({ device: d, mode: { id: 'heat' } });
    assert.deepEqual(d.calls, [['hvac_system_mode', 'heat']]);
    await assert.rejects(cards.hvac_system_mode_set.run({ device: d, mode: { id: 'dry' } }));
    const list = await cards.hvac_system_mode_set.ac.mode('', { device: d });
    assert.deepEqual(list.map((v) => [v.id, v.name]), [['cool', 'Froid'], ['heat', 'Chaud']]);
    await assert.rejects(cards.hvac_system_mode_is.run({ device: dev({}), mode: 'cool' }));
  });

  it('existing power_on_behavior tokens unchanged', () => {
    const fam = F.FAMILIES.find((f) => f.cap === 'power_on_behavior');
    assert.deepEqual(F.familyEvent(fam, 'on', 'off').tokens, { behavior: 'on', previous: 'off' });
  });
});
