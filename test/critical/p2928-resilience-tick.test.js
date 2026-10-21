'use strict';
// P2928: the shared resilience timer wakes every 30 s; rebind detection stays well under its threshold.
const test = require('node:test');
const assert = require('node:assert');
const R = require('../../lib/reliability/ZigbeeResilience');
test('tick period is at most a quarter of the smallest report interval', () => {
  assert.strictEqual(R.TICK_MS, 30000);
  assert.ok(R.TICK_MS * 2 <= R.MIN_INTERVAL);
});
test('learned interval comes from device RX timestamps, not from the tick rate', async () => {
  let t = 1e9; const dev = { _lastRxTimestamp: 0, hasCapability: () => false };
  const z = new R.ZigbeeResilience(dev, { now: () => t });
  z.now = () => t;
  for (const at of [1e9, 1e9 + 120000, 1e9 + 240000, 1e9 + 360000]) { dev._lastRxTimestamp = at; t = at + 29000; await z.tick(); }
  assert.ok(Math.abs(z.reportIntervalMs() - 120000) < 1, String(z.reportIntervalMs()));
});
