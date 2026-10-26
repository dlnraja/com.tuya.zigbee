'use strict';
// P3065 D10 (b): dedicated family cards for alarm_human, frost_protection, power_on_behavior.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const F = require('../../lib/flow/FamilyCapabilityCards');

const ROOT = path.join(__dirname, '..', '..');
const KIND = { trigger: 'triggers', condition: 'conditions', action: 'actions' };
const capsManifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/capabilities/power_on_behavior.json'), 'utf8'));

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
  const homey = { manifest: { capabilities: { power_on_behavior: capsManifest } }, flow: { getTriggerCard: mk, getConditionCard: mk, getActionCard: mk }, i18n: { getLanguage: () => 'fr' } };
  return { cards, h: { homey, _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
}
function dev(values) {
  const calls = [];
  return {
    calls, getData: () => ({ id: 'd1' }),
    hasCapability: (c) => c in values,
    getCapabilityValue: (c) => values[c],
    async triggerCapabilityListener(c, v) { calls.push([c, v]); values[c] = v; },
  };
}
const tick = () => new Promise((r) => setImmediate(r));

describe('P3065 D10 family cards', () => {
  it('every family card is declared, filtered on its capability, en/fr/nl/de', () => {
    for (const fam of F.FAMILIES) {
      for (const k of ['trigger', 'condition', 'action']) {
        if (!fam[k]) {continue;}
        const c = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow', KIND[k], `${fam[k]}.json`), 'utf8'));
        assert.equal(c.id, fam[k]);
        assert.equal(c.args.find((a) => a.type === 'device').filter, `capabilities=${fam.cap}`);
        for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.title[l] && c.titleFormatted[l].includes('[[device]]'), `${fam[k]}.${l}`);}
      }
    }
  });

  it('triggers fire on real changes only, filtered by state arg', async () => {
    const { cards, h } = host();
    const fc = new F.FamilyCapabilityCards(h);
    const d = dev({});
    h.homey.flow.getTriggerCard('human_presence_changed').args = [{ device: d, state: 'present' }];
    h.homey.flow.getTriggerCard('power_on_behavior_changed').args = [{ device: d }];
    fc.register(); await tick();
    fc.onCapabilityChanged(d, 'd1', 'alarm_human', true, false);
    fc.onCapabilityChanged(d, 'd1', 'alarm_human', true, true);
    fc.onCapabilityChanged(d, 'd1', 'power_on_behavior', 'previous', 'off');
    fc.onCapabilityChanged(d, 'd1', 'frost_protection', true, false); // no Flow uses it: not fired
    assert.deepEqual(cards.human_presence_changed.fired.map((f) => f[0]), [{ state: 'present' }]);
    assert.deepEqual(cards.power_on_behavior_changed.fired[0][0], { behavior: 'previous', previous: 'off' });
    assert.equal(cards.frost_protection_changed.fired.length, 0);
    const [, st] = cards.human_presence_changed.fired[0];
    assert.equal(await cards.human_presence_changed.run({ device: d, state: 'present' }, st), true);
    assert.equal(await cards.human_presence_changed.run({ device: d, state: 'absent' }, st), false);
    assert.equal(await cards.human_presence_changed.run({ device: d, state: 'any' }, st), true);
  });

  it('conditions and actions check the capability and the value list', async () => {
    const { cards, h } = host();
    new F.FamilyCapabilityCards(h).register();
    const d = dev({ alarm_human: true, frost_protection: false, power_on_behavior: 'off' });
    assert.equal(await cards.human_presence_is_detected.run({ device: d }), true);
    assert.equal(await cards.frost_protection_is_on.run({ device: d }), false);
    assert.equal(await cards.power_on_behavior_is.run({ device: d, behavior: 'off' }), true);
    await cards.frost_protection_set.run({ device: d, state: 'on' });
    await cards.power_on_behavior_set.run({ device: d, behavior: 'previous' });
    assert.deepEqual(d.calls, [['frost_protection', true], ['power_on_behavior', 'previous']]);
    await assert.rejects(cards.power_on_behavior_set.run({ device: d, behavior: 'sideways' }));
    await assert.rejects(cards.frost_protection_is_on.run({ device: dev({}) }), /frost_protection/);
  });
});
