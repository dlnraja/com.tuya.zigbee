'use strict';
const assert = require('assert');
const { syncDrivers } = require('../scripts/ci/sync-root-app-json-drivers');

describe('P2975 sync root app.json drivers from built manifest', () => {
  const root = { id: 'x', version: '1.0.0', flow: { triggers: [1] }, drivers: [
    { id: 'b', zigbee: { manufacturerName: ['_TZ_OLD'] }, extra: 1 },
    { id: 'orphan', zigbee: {} },
  ] };
  const built = { id: 'x', version: '9', drivers: [
    { id: 'a', zigbee: { manufacturerName: ['_TZ_A'] } },
    { id: 'b', zigbee: { manufacturerName: ['_TZ_OLD', '_TZ_NEW'] } },
    { id: 'ghost', zigbee: {} },
  ] };
  const res = syncDrivers(root, built, ['a', 'b', 'orphan']);
  it('adds compose drivers missing from root', () => assert.deepStrictEqual(res.added, ['a']));
  it('refreshes fingerprints of existing drivers', () => {
    const b = res.app.drivers.find(d => d.id === 'b');
    assert.deepStrictEqual(b.zigbee.manufacturerName, ['_TZ_OLD', '_TZ_NEW']);
    assert.strictEqual(b.extra, 1);
    assert.deepStrictEqual(res.updated, ['b']);
  });
  it('only refreshes identity fields of existing entries', () => {
    const r = syncDrivers({ id: 'x', drivers: [{ id: 'c', settings: [1], zigbee: { endpoints: { 1: {} }, productId: ['A'] } }] },
      { id: 'x', drivers: [{ id: 'c', settings: [1, 2, 3], images: {}, zigbee: { endpoints: { 2: {} }, productId: ['A', 'B'] } }] }, ['c']);
    const c = r.app.drivers[0];
    assert.deepStrictEqual(c.settings, [1]);
    assert.strictEqual(c.images, undefined);
    assert.deepStrictEqual(c.zigbee, { endpoints: { 1: {} }, productId: ['A', 'B'] });
  });
  it('never removes a root driver (additive) and ignores built ids without compose', () => {
    const ids = res.app.drivers.map(d => d.id);
    assert.deepStrictEqual(ids, ['a', 'b', 'orphan']);
  });
  it('keeps root id/version/flow untouched', () => {
    assert.strictEqual(res.app.version, '1.0.0');
    assert.deepStrictEqual(res.app.flow, { triggers: [1] });
  });
  it('is idempotent', () => {
    const again = syncDrivers(res.app, built, ['a', 'b', 'orphan']);
    assert.strictEqual(again.added.length + again.updated.length, 0);
  });
});
