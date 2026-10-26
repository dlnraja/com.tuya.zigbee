'use strict';
// P3065 D13 memory part (port): bounded shared Flow guard module + device-list invalidation.
// The trigger dedup itself is a behaviour change and stays on master until soak.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { FlowStormGuard, guardOf } = require('../../lib/flow/FlowStormGuard');
const ROOT = path.join(__dirname, '../..');

test('guard maps stay at their caps whatever the device count', () => {
  const g = new FlowStormGuard({ keys: 1024, acMax: 64 });
  for (let i = 0; i < 5000; i++) { g.allow('c', `d${i}`, { v: i }); g.acSet(`k${i}`, [i]); }
  const s = g.stats();
  assert.ok(s.fireKeys <= 1024 && s.acKeys <= 64, JSON.stringify(s));
  g.invalidate();
  assert.strictEqual(g.stats().acKeys, 0);
  const host = {};
  assert.strictEqual(guardOf(host), guardOf(host));
});

test('onDeviceListChanged drops the cached device index and the guard caches', () => {
  const FeatureFlowCards = require('../../lib/flow/FeatureFlowCards');
  const g = new FlowStormGuard();
  g.acSet('x', [1]);
  const host = { _deviceIndex: new Map([['a', {}]]), _flowStormGuard: g };
  FeatureFlowCards.prototype.onDeviceListChanged.call(host);
  assert.strictEqual(host._deviceIndex, null);
  assert.strictEqual(g.stats().acKeys, 0);
  FeatureFlowCards.prototype.onDeviceListChanged.call({}); // no guard: no throw
});

test('BaseUnifiedDevice calls it softly from onAdded and onDeleted', () => {
  const s = fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8');
  const n = s.split('featureFlowCards?.onDeviceListChanged?.()').length - 1;
  assert.strictEqual(n, 2);
});
