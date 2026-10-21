'use strict';
// P2930: orphan flow cards (device filter naming only drivers absent from the payload) are pruned.
const assert = require('assert');
const { pruneOrphanCards, findOrphanCards } = require('../scripts/maintenance/prune-orphan-flow-cards.cjs');

const dev = (f) => ({ type: 'device', name: 'device', filter: f });
function manifest() {
  return {
    drivers: [{ id: 'a' }, { id: 'b' }],
    flow: {
      triggers: [
        { id: 'keep_a', args: [dev('driver_id=a')] },
        { id: 'orphan_x', args: [dev('driver_id=x')] },
        { id: 'mixed', args: [dev('driver_id=b|x')] },
        { id: 'app_level', args: [] },
        { id: 'wild', args: [dev('driver_id=*')] },
      ],
      conditions: [{ id: 'orphan_y', args: [dev('driver_id=y|z')] }],
      actions: [],
    },
  };
}

describe('P2930 orphan flow card prune', () => {
  it('finds orphans only', () => {
    assert.deepStrictEqual(findOrphanCards(manifest()), ['triggers.orphan_x', 'conditions.orphan_y']);
  });
  it('removes orphans, narrows mixed filters, keeps app-level and wildcard cards', () => {
    const m = manifest();
    const r = pruneOrphanCards(m);
    assert.strictEqual(r.removed, 2);
    assert.strictEqual(r.narrowed, 1);
    assert.deepStrictEqual(m.flow.triggers.map((c) => c.id), ['keep_a', 'mixed', 'app_level', 'wild']);
    assert.strictEqual(m.flow.triggers[1].args[0].filter, 'driver_id=b');
    assert.deepStrictEqual(findOrphanCards(m), []);
  });
  it('prepare-publish runs the prune fail-closed', () => {
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'scripts', 'prepare-publish.js'), 'utf8');
    assert.ok(src.includes("require('./maintenance/prune-orphan-flow-cards.cjs')"));
    assert.ok(src.includes('FATAL: orphan flow card prune failed'));
  });
});
