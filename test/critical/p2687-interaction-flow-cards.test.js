'use strict';

/**
 * P2687 — Interaction flow cards (partout)
 * Contre quoi:
 *  - capability_historical_value filter=onoff hides sensors/remotes/TRV
 *  - missing list/history cards or FeatureFlowCards register
 *  - classifyInteractionKind / formatInteractionList regressions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  classifyInteractionKind,
  formatInteractionList,
  pushInteraction,
  interactedRecently,
  listActionableCapabilities,
} = require('../../lib/flow/InteractionHistory');

const CARD_IDS = [
  'list_device_capabilities',
  'list_device_actions',
  'list_recent_interactions',
  'list_fleet_recent_interactions',
  'device_interaction',
  'device_interacted_recently',
];

describe('P2687 interaction flow cards', () => {
  it('compose cards exist without onoff-only device filter', () => {
    const hist = JSON.parse(fs.readFileSync(
      path.join(ROOT, '.homeycompose/flow/actions/capability_historical_value.json'), 'utf8'));
    const histDev = (hist.args || []).find((a) => a.type === 'device');
    assert.ok(histDev, 'historical device arg');
    assert.ok(!histDev.filter || !/capabilities=onoff/i.test(histDev.filter),
      'historical must not filter onoff-only');
    assert.ok((hist.tokens || []).some((t) => t.name === 'value'), 'historical value token');

    const files = {
      list_device_capabilities: 'actions/list_device_capabilities.json',
      list_device_actions: 'actions/list_device_actions.json',
      list_recent_interactions: 'actions/list_recent_interactions.json',
      list_fleet_recent_interactions: 'actions/list_fleet_recent_interactions.json',
      device_interaction: 'triggers/device_interaction.json',
      device_interacted_recently: 'conditions/device_interacted_recently.json',
    };
    for (const [id, rel] of Object.entries(files)) {
      const j = JSON.parse(fs.readFileSync(path.join(ROOT, '.homeycompose/flow', rel), 'utf8'));
      assert.strictEqual(j.id, id);
      for (const arg of j.args || []) {
        if (arg.type === 'device' && arg.filter) {
          assert.ok(!/capabilities=onoff/i.test(arg.filter), `${id} must not filter onoff-only`);
        }
      }
    }
  });

  it('app.json carries the same card ids without onoff filter on historical', () => {
    const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
    const hist = (app.flow.actions || []).find((c) => c.id === 'capability_historical_value');
    assert.ok(hist, 'app.json historical');
    const histDev = (hist.args || []).find((a) => a.type === 'device');
    assert.ok(!histDev?.filter || !/capabilities=onoff/i.test(histDev.filter));

    for (const id of CARD_IDS) {
      const kind = id.startsWith('device_interacted') ? 'conditions'
        : id === 'device_interaction' ? 'triggers' : 'actions';
      const card = (app.flow[kind] || []).find((c) => c.id === id);
      assert.ok(card, `app.json missing ${kind}/${id}`);
    }
  });

  it('FeatureFlowCards registers P2687 cards + interaction ring', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/flow/FeatureFlowCards.js'), 'utf8');
    assert.match(src, /P2687/);
    assert.match(src, /InteractionHistory/);
    for (const id of CARD_IDS) {
      assert.match(src, new RegExp(`['"]${id}['"]`));
    }
    assert.match(src, /_interactionRing/);
    assert.match(src, /classifyInteractionKind/);
  });

  it('classifyInteractionKind marks actions vs sensors', () => {
    assert.strictEqual(classifyInteractionKind('onoff'), 'action');
    assert.strictEqual(classifyInteractionKind('dim'), 'action');
    assert.strictEqual(classifyInteractionKind('button.1'), 'action');
    assert.strictEqual(classifyInteractionKind('windowcoverings_set'), 'action');
    assert.strictEqual(classifyInteractionKind('target_temperature'), 'action');
    assert.strictEqual(classifyInteractionKind('measure_temperature'), 'sensor');
    assert.strictEqual(classifyInteractionKind('measure_battery'), 'sensor');
    assert.strictEqual(classifyInteractionKind('alarm_motion'), 'sensor');
    assert.strictEqual(classifyInteractionKind('custom_cap', { setable: true }), 'action');
  });

  it('formatInteractionList + ring helpers', () => {
    const ring = [];
    pushInteraction(ring, { ts: Date.now() - 1000, deviceName: 'Lamp', capability: 'onoff', value: true });
    pushInteraction(ring, { ts: Date.now(), deviceName: 'Lamp', capability: 'dim', value: 0.5 });
    const { list, count } = formatInteractionList(ring, 10);
    assert.strictEqual(count, 2);
    assert.match(list, /onoff=true/);
    assert.match(list, /dim=0\.5/);
    assert.ok(interactedRecently(ring, 'dev1', 5) === false);
    ring[0].deviceId = 'dev1';
    assert.ok(interactedRecently(ring, 'dev1', 5) === true);
  });

  it('listActionableCapabilities filters action-like', () => {
    const device = {
      getCapabilities: () => ['onoff', 'measure_temperature', 'button.1', 'dim'],
      getCapabilityOptions: (c) => (c === 'dim' ? { setable: true } : {}),
    };
    const actions = listActionableCapabilities(device);
    assert.ok(actions.includes('onoff'));
    assert.ok(actions.includes('dim'));
    assert.ok(actions.includes('button.1'));
    assert.ok(!actions.includes('measure_temperature'));
  });
});
