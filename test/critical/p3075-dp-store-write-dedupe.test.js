'use strict';
// P3075 (t613u, Bastien OOM 17-18/10): DP frame bursts (HOBEIAN ZG-301Z repeats) rewrote the whole
// device store twice per frame. triggerDPReceived now writes lastDPValues / lastDPTypes only on change.
const { describe, it } = require('../_support/dual-runner');
const assert = require('node:assert');
const Loader = require('../../lib/flow/UniversalFlowCardLoader');

function fakeDevice() {
  const store = {};
  let writes = 0;
  return {
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { writes++; store[k] = JSON.parse(JSON.stringify(v)); },
    writes: () => writes,
    store,
  };
}

describe('P3075 DP store write dedupe', () => {
  it('a burst of identical DP frames writes the store once, a change writes again', async () => {
  const self = { _fireDPReceivedCard: async () => {}, log: () => {} };
  const dev = fakeDevice();
  for (let i = 0; i < 50; i++) { await Loader.prototype.triggerDPReceived.call(self, dev, 1, true); }
  assert.strictEqual(dev.writes(), 2); // lastDPValues + lastDPTypes, once
  await Loader.prototype.triggerDPReceived.call(self, dev, 1, false);
  assert.strictEqual(dev.writes(), 3); // value changed, type unchanged
  assert.strictEqual(dev.store.lastDPValues[1], false);
  assert.strictEqual(dev.store.lastDPTypes['1'], 'bool');
});

  it('sameDpValue compares primitives and Buffers by content', () => {
  assert.ok(Loader.sameDpValue(3, 3));
  assert.ok(Loader.sameDpValue(Buffer.from('ab'), Buffer.from('ab')));
  assert.ok(!Loader.sameDpValue(Buffer.from('ab'), Buffer.from('ac')));
  assert.ok(!Loader.sameDpValue(undefined, 0));
});
});
