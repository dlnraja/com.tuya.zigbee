'use strict';
// P3065 D17 — onDeviceListChanged also drops the cached device index, so a deleted device is not
// kept alive by FeatureFlowCards until the next 60 s rebuild (memory fix, same as stable/bastien port).
const test = require('node:test');
const assert = require('node:assert');
const FeatureFlowCards = require('../../lib/flow/FeatureFlowCards');

const Cls = FeatureFlowCards.FeatureFlowCards || FeatureFlowCards;

test('onDeviceListChanged releases _deviceIndex and still invalidates the storm guard', () => {
  let invalidated = 0;
  const self = { _deviceIndex: new Map([['dead', { id: 'dead' }]]), _deviceIndexAt: Date.now(),
    _flowStormGuard: { invalidate: () => { invalidated++; } } };
  Cls.prototype.onDeviceListChanged.call(self);
  assert.strictEqual(self._deviceIndex, null);
  assert.strictEqual(invalidated, 1);
});

test('onDeviceListChanged is soft without a storm guard', () => {
  const self = { _deviceIndex: new Map() };
  assert.doesNotThrow(() => Cls.prototype.onDeviceListChanged.call(self));
  assert.strictEqual(self._deviceIndex, null);
});
