'use strict';
// P3068: PredictiveFlowCards is app-level and keys its maps by device (or device:capability), so
// deleted devices used to leave entries forever. They are now FIFO-bounded Map/Set subclasses.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { PredictiveFlowCards } = require('../../lib/flow/PredictiveFlowCards');
const { scanSource } = require('../../scripts/ci/memory-hazard-ratchet');

test('P3068 PredictiveFlowCards per-device maps are bounded, Map-identical below the ceiling', () => {
  const p = new PredictiveFlowCards({ homey: {} });
  for (const k of ['_stats', '_series', '_seen', '_batt', '_lastForecast', '_riskFired', '_crossedTrend', '_lastSave']) {
    assert.ok(p[k] instanceof Map, k);
    assert.ok(p[k].max >= 1024, k);
  }
  assert.ok(p._hydrated instanceof Set && p._hydrated.max >= 1024);
  p._seen.set('d1', { last: 1 }); p._seen.set('d1', { last: 2 });
  assert.deepStrictEqual([...p._seen], [['d1', { last: 2 }]]);
  for (let i = 0; i < p._seen.max + 5; i++) { p._seen.set(`x${i}`, i); }
  assert.strictEqual(p._seen.size, p._seen.max);
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'flow', 'PredictiveFlowCards.js'), 'utf8');
  assert.deepStrictEqual(scanSource(src).hits['unbounded-collection'], []);
});
