'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const L = require(path.join(ROOT, 'lib/utils/dp-log-sampler'));

test('P3065 change-aware sampler: every change logged, repeats first 3 + every 50th, verbose all, bounded', () => {
  const o = {};
  let n = 0;
  for (let i = 1; i <= 200; i++) { if (L.shouldLogChange(o, 'rx:1', i === 120 ? 'b' : 'a', false)) {n++;} }
  // a: 1 + 2 (n=2,3) + n=50,100 (i 50,100) = 5 ; b at 120 = 1 ; back to a at 121 (n restarts): 1 + 2 + n=50 (i=170) = 4
  assert.strictEqual(n, 5 + 1 + 4);
  let m = 0;
  for (let i = 0; i < 100; i++) { if (L.shouldLogChange(o, 'rx:1', 'a', true)) {m++;} }
  assert.strictEqual(m, 100);
  for (let i = 0; i < 1000; i++) { L.shouldLogChange(o, `k${i}`, 'x', false); }
  assert.ok(Object.keys(o._p3065LogChg).length <= 256);
  assert.strictEqual(L.shouldLogChange(null, 'a', 'b', false), true);
  assert.strictEqual(L.shouldLogChange(Object.freeze({}), 'a', 'b', false), true);
});

test('P3065 hot receive lines go through the change-aware sampler', () => {
  const ef = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
  for (const k of ["'evt:'", "'dresp:'", "'drep:'", "'rx:'"]) {assert.ok(ef.includes(`shouldLogChange(this, ${k}`), k);}
  assert.ok(fs.readFileSync(path.join(ROOT, 'lib/devices/BaseUnifiedDevice.js'), 'utf8').includes("shouldLogChange(this, 'bud:'"));
  assert.ok(fs.readFileSync(path.join(ROOT, 'lib/dynamic/AutoAdaptiveDevice.js'), 'utf8').includes("shouldLogChange(this, 'aa:'"));
});

test('P3065 frameSig ignores the sequence number so repeated reports are sampled', () => {
  const a = L.frameSig({ dp: 1, datatype: 1, data: Buffer.from([1]), seq: 1 });
  const b = L.frameSig({ dp: 1, datatype: 1, data: Buffer.from([1]), seq: 2 });
  const c = L.frameSig({ dp: 1, datatype: 1, data: Buffer.from([0]), seq: 3 });
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  const o = {}; let n = 0;
  for (let i = 0; i < 100; i++) { if (L.shouldLogChange(o, 'evt:1', L.frameSig({ dp: 1, datatype: 1, data: Buffer.from([1]), seq: i }), false)) {n++;} }
  assert.strictEqual(n, 5); // 1,2,3,50,100
  assert.strictEqual(typeof L.frameSig(undefined), 'string');
});
