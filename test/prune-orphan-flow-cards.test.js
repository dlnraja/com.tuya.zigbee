'use strict';
/* eslint-env mocha */
// P2798: publish manifest must not carry device Flow cards for drivers pruned by the Zigbee compactor.
const assert = require('assert');
const { pruneOrphanFlowCards, filterDriverIds } = require('../scripts/maintenance/prune-orphan-flow-cards.cjs');

const dev = (filter) => ({ type: 'device', name: 'device', filter });

describe('P2798 prune orphan Flow cards', () => {
  it('parses only pure driver_id filters', () => {
    assert.deepStrictEqual(filterDriverIds('driver_id=a|driver_id=b'), ['a', 'b']);
    assert.strictEqual(filterDriverIds('driver_id=*'), null);
    assert.strictEqual(filterDriverIds('capabilities=onoff'), null);
    assert.strictEqual(filterDriverIds('driver_id!=none'), null);
    assert.strictEqual(filterDriverIds(''), null);
  });

  it('removes cards whose drivers are all absent and keeps everything else', () => {
    const m = {
      drivers: [{ id: 'kept' }],
      flow: {
        triggers: [
          { id: 'gone_t', args: [dev('driver_id=gone')] },
          { id: 'kept_t', args: [dev('driver_id=kept')] },
          { id: 'mixed_t', args: [dev('driver_id=gone|driver_id=kept')] },
          { id: 'cap_t', args: [dev('capabilities=onoff')] },
          { id: 'wild_t', args: [dev('driver_id=*')] },
          { id: 'app_t', args: [] },
        ],
        conditions: [{ id: 'gone_c', args: [dev('driver_id=gone')] }],
        actions: [{ id: 'kept_a', args: [dev('driver_id=kept')] }],
      },
    };
    const res = pruneOrphanFlowCards(m);
    assert.strictEqual(res.removed, 2);
    assert.strictEqual(res.drivers, 1);
    assert.deepStrictEqual(m.flow.triggers.map((c) => c.id), ['kept_t', 'mixed_t', 'cap_t', 'wild_t', 'app_t']);
    assert.deepStrictEqual(m.flow.conditions, []);
    assert.strictEqual(m.flow.actions.length, 1);
  });

  it('is a no-op without drivers', () => {
    const m = { drivers: [], flow: { triggers: [{ id: 'x', args: [dev('driver_id=a')] }] } };
    assert.strictEqual(pruneOrphanFlowCards(m).removed, 0);
  });
});
