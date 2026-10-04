'use strict';

const assert = require('assert');
const Index = require('../lib/flow/ManifestDriverFlowIndex');

describe('ManifestDriverFlowIndex', () => {
  const manifest = {
    flow: {
      triggers: [
        { id: 'a_btn', args: [{ type: 'device', name: 'device', filter: 'driver_id=drv_a' }, { type: 'dropdown', name: 'button' }] },
        { id: 'ab_shared', args: [{ type: 'device', name: 'device', filter: 'driver_id=drv_a|drv_b' }] },
        { id: 'app_card', args: [{ type: 'device', name: 'device', filter: 'capabilities=onoff' }] },
      ],
      conditions: [],
      actions: [{ id: 'b_set_brightness', args: [{ type: 'device', name: 'device', filter: 'driver_id=drv_b' }, { type: 'number', name: 'brightness' }] }],
    },
  };
  const homey = { manifest };
  beforeEach(() => Index._resetForTests());

  it('maps root-manifest cards to drivers by driver_id filter', () => {
    assert.deepStrictEqual(Index.getDriverFlow(homey, 'drv_a').triggers.map((c) => c.id), ['a_btn', 'ab_shared']);
    assert.deepStrictEqual(Index.getDriverFlow(homey, 'drv_b').actions.map((c) => c.id), ['b_set_brightness']);
    assert.strictEqual(Index.getDriverFlow(homey, 'unknown'), null);
  });

  it('references card objects without copying', () => {
    assert.strictEqual(Index.getDriverFlow(homey, 'drv_a').triggers[0], manifest.flow.triggers[0]);
  });

  it('merges driver.manifest.flow with root cards, deduped by id', () => {
    const driver = { id: 'drv_a', homey, manifest: { flow: { triggers: [{ id: 'inline_t' }, { id: 'a_btn' }] } } };
    const flow = Index.resolveDriverFlow(homey, driver);
    assert.deepStrictEqual(flow.triggers.map((c) => c.id), ['inline_t', 'a_btn', 'ab_shared']);
  });

  it('userArgs ignores the implicit device arg', () => {
    assert.strictEqual(Index.userArgs(manifest.flow.triggers[0]).length, 1);
    assert.strictEqual(Index.userArgs(manifest.flow.triggers[1]).length, 0);
  });
});
