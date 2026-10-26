'use strict';
// P3065 D12: raw Scenes-cluster recall trigger (scene number + endpoint), deduplicated, all detectors hooked.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { SceneRecallCards } = require('../../lib/flow/SceneRecallCards');

const ROOT = path.join(__dirname, '..', '..');
function host(args) {
  const cards = {};
  const mk = (id) => cards[id] = cards[id] || { id, fired: [], args,
    registerRunListener(fn) { this.run = fn; return this; }, registerArgumentAutocompleteListener() { return this; },
    async trigger(t, s) { this.fired.push([t, s]); }, async getArgumentValues() { return this.args; }, on() {} };
  return { cards, h: { homey: { flow: { getTriggerCard: mk }, i18n: { getLanguage: () => 'en' } }, _registered: { triggers: new Set(), conditions: new Set(), actions: new Set() } } };
}
const dev = (id) => ({ getData: () => ({ id }) });

describe('P3065 D12 scene_recalled', () => {
  it('declared with device arg, 4 languages and scene/endpoint tokens', () => {
    const c = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow/triggers/scene_recalled.json'), 'utf8'));
    assert.equal(c.args[0].type, 'device');
    for (const l of ['en', 'fr', 'nl', 'de']) {assert.ok(c.titleFormatted[l].includes('[[device]]'));}
    assert.deepEqual(c.tokens.map((t) => t.name), ['scene', 'endpoint']);
  });

  it('fires once per recall within 500 ms, only for devices used in a Flow, bad scene ignored', async () => {
    const r = dev('R1');
    const { cards, h } = host([{ device: r }]);
    const c = new SceneRecallCards(h);
    c.register(); await new Promise((x) => setImmediate(x));
    assert.equal(c.onSceneRecalled(r, { scene: 3, endpoint: 2 }, 1000), true);
    assert.equal(c.onSceneRecalled(r, { scene: 3, endpoint: 2 }, 1200), false); // second detector, same frame
    assert.equal(c.onSceneRecalled(r, { scene: 3, endpoint: 2 }, 1700), true);
    assert.equal(c.onSceneRecalled(r, { scene: 300 }, 2000), false);
    assert.equal(c.onSceneRecalled(dev('X'), { scene: 1 }, 2000), false);
    assert.deepEqual(cards.scene_recalled.fired[0][0], { scene: 3, endpoint: 2 });
    assert.equal(await cards.scene_recalled.run({ device: r }, cards.scene_recalled.fired[0][1]), true);
    assert.equal(await cards.scene_recalled.run({ device: dev('X') }, cards.scene_recalled.fired[0][1]), false);
  });

  it('the three scene detectors call the app hook after their own dedup', () => {
    for (const f of ['lib/mixins/PhysicalButtonMixin.js', 'lib/mixins/UnifiedButtonEngine.js', 'lib/mixins/LegacyButtonDetectionMixin.js']) {
      assert.match(fs.readFileSync(path.join(ROOT, f), 'utf8'), /featureFlowCards\?\.triggerSceneRecalled\?\.\(this, \{ scene: /, f);
    }
  });
});
