'use strict';
// P3229: zero lost couples at release too — every held continuation, once released, loses 0 couples
// versus the held payload view (fold-before-compaction + split-after), and its makers carry no sourced
// couple (any source, mfs_db included) outside the continuation pids.
require('../_support/homey-stub');
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const DC = require('../../lib/drivers/DriverContinuations');
const { effectiveHoldIds, foldContinuations, splitContinuations } = require('../../scripts/publish-hold-release');
const { sourceToPayload, payloadCouples } = require('../../scripts/maintenance/publish-baseline-gate.cjs');
const { loadSourcedCouples } = require('../../scripts/maintenance/publish-sourced-restore.cjs');

const app = () => JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const lc = (s) => String(s).toLowerCase();

describe('P3229 continuation release zero-loss', function () {
  if (this && this.timeout) this.timeout(600000);
  DC.clearCache();
  const reg = DC.load(ROOT);
  const { ids } = effectiveHoldIds(JSON.parse(fs.readFileSync(path.join(ROOT, 'config/publish-hold-drivers.json'), 'utf8')), '');
  const heldConts = [...ids].filter((id) => reg.isContinuation(id));

  it('there is at least one held continuation to check', () => assert.ok(heldConts.length >= 1));

  it('split restores a released continuation exactly (unit)', () => {
    const m = { drivers: [{ id: 'r', zigbee: { manufacturerName: ['A'], productId: ['P1', 'P2'] } }, { id: 'c', zigbee: { manufacturerName: ['B'], productId: ['P1'] } }] };
    const r = foldContinuations(m, { entry: (id) => (id === 'c' ? { continuationOf: 'r' } : {}) }, new Set());
    assert.strictEqual(m.drivers.length, 1);
    assert.deepStrictEqual(m.drivers[0].zigbee.manufacturerName, ['A', 'B']);
    splitContinuations(m, r.splits);
    assert.deepStrictEqual(m.drivers.map((d) => [d.id, d.zigbee.manufacturerName, d.zigbee.productId]), [['r', ['A'], ['P1', 'P2']], ['c', ['B'], ['P1']]]);
  });

  it('continuation makers have no sourced couple (within the root pids) outside the continuation pids', () => {
    const src = [...loadSourcedCouples(ROOT).keys()].map(lc);
    it('size-gate projection folds/splits continuations like prepare-publish', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/ci/publish-size-gate.cjs'), 'utf8');
    assert.ok(src.includes('foldContinuations') && src.includes('splitContinuations'));
  });

  for (const id of heldConts) {
      const c = require(path.join(ROOT, 'drivers', id, 'driver.compose.json')).zigbee;
      const r = require(path.join(ROOT, 'drivers', reg.rootOf(id), 'driver.compose.json')).zigbee;
      const ms = new Set(c.manufacturerName.map(lc)); const ps = new Set(c.productId.map(lc));
      const rootPids = new Set(r.productId.map(lc)); // a pid outside the logical driver is another driver's couple
      const bad = src.filter((k) => { const [m, p] = k.split('|'); return ms.has(m) && rootPids.has(p) && !ps.has(p); });
      assert.deepStrictEqual(bad, [], `${id}: sourced couples outside its pids`);
    }
  });

  for (const id of heldConts) {
    it(`releasing ${id} loses 0 couples vs the held view`, () => {
      const held = payloadCouples(sourceToPayload(app(), ROOT, { holdIds: ids }));
      const rel = new Set(ids); rel.delete(id);
      const after = payloadCouples(sourceToPayload(app(), ROOT, { holdIds: rel }));
      const lost = [...held].filter((k) => !after.has(k));
      assert.deepStrictEqual(lost.slice(0, 20), [], `${id}: ${lost.length} couple(s) lost at release`);
    });
  }
});
