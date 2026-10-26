'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const C = require(path.join(__dirname, '..', '..', 'lib/utils/memwarn-cleaners'));

test('P3065 memwarn cleaner trims per-device diagnostic rings to the newest 20 and never throws', () => {
  const mk = (n) => Array.from({ length: n }, (_, i) => i);
  const dev = { receptionManager: { _received: mk(200), _buffer: mk(100) }, _buttonDiagLogger: { _buffer: mk(100) }, _diagLogger: { _buffer: mk(5) }, _dpDedup: { a: 1, b: 2 } };
  const weird = { get receptionManager() { throw new Error('x'); } };
  const dropped = C.trimDiagRings([dev, weird, null]);
  assert.strictEqual(dev.receptionManager._received.length, 20);
  assert.strictEqual(dev.receptionManager._received[19], 199);
  assert.strictEqual(dev.receptionManager._buffer.length, 20);
  assert.strictEqual(dev._buttonDiagLogger._buffer.length, 20);
  assert.strictEqual(dev._diagLogger._buffer.length, 5);
  assert.deepStrictEqual(dev._dpDedup, {});
  assert.strictEqual(dropped, 180 + 80 + 80 + 2);
});

test('P3065 cleaner is registered with MemwarnGuard', () => {
  const names = [];
  const guard = { register: (n) => { names.push(n); return guard; } };
  const homey = { drivers: { getDrivers: () => ({ d: { getDevices: () => [{ receptionManager: { _received: Array(50).fill(0) } }] } }) } };
  C.registerAppCleaners(guard, homey);
  assert.ok(names.includes('p3065-diag-rings'));
});

test('P3065 UnifiedSensorBase DP dedup map has a hard cap and a guarded purge', () => {
  const src = require('fs').readFileSync(path.join(__dirname, '..', '..', 'lib/devices/UnifiedSensorBase.js'), 'utf8');
  assert.match(src, /this\._dpDedupN = \(this\._dpDedupN \|\| 0\) \+ 1\) > 256\) \{ this\._dpDedup = \{\};/);
  assert.ok(!src.includes('if (this._protocolStats.tuyaDP.received % 100 === 0)'));
});
