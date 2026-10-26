'use strict';
// P3073 §3: DpScaleLearner — bounded, confirms at >=20 votes and >=90 %, persists at most daily,
// re-seeds SmartDivisor only through rememberLearnedDivisor, never touches capabilities.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const L = require(path.join(__dirname, '..', '..', 'lib', 'learning', 'DpScaleLearner.js'));

test('inferDivisor picks the nearest power of ten, or -1', () => {
  assert.strictEqual(L.inferDivisor(215, 21.5), 1);
  assert.strictEqual(L.inferDivisor(2301, 2.3), 3);
  assert.strictEqual(L.inferDivisor(50, 50), 0);
  assert.strictEqual(L.inferDivisor(0, 0), -1);
  assert.strictEqual(L.inferDivisor(30, 1), -1);
});

test('confirmed only at >= 20 votes and >= 90 % share', () => {
  const l = new L.DpScaleLearner();
  for (let i = 0; i < 19; i++) {l.learn(1, 'measure_temperature', 200 + i, (200 + i) / 10, i * 1000);}
  assert.strictEqual(l.confirmed(1), null);
  l.learn(1, 'measure_temperature', 230, 23, 20000);
  assert.strictEqual(l.confirmed(1), 10);
  for (let i = 0; i < 5; i++) {l.learn(1, 'measure_temperature', 23, 23, 30000 + i);}
  assert.strictEqual(l.confirmed(1), null, '20/25 = 80 % is not enough');
  assert.strictEqual(l.anomalies().length, 1);
});

test('bounded: 100k samples over 40 DPs keep 16 slots and capped counters', () => {
  const l = new L.DpScaleLearner();
  for (let i = 0; i < 100000; i++) {l.learn(i % 40, 'measure_power', 1000, 100, i);}
  assert.strictEqual(l.slots.size, L.MAX_SLOTS);
  const c = l.toCompact();
  assert.strictEqual(c.length, L.MAX_SLOTS);
  assert.ok(JSON.stringify(c).length < 2000);
  const back = new L.DpScaleLearner(c);
  assert.strictEqual(back.confirmed(0), 10);
});

test('observe: lazy, store write at most once a day, re-seed through remember, no capability calls', () => {
  const writes = []; const forbidden = [];
  const device = {
    getStoreValue: () => [['5', 'measure_temperature', 0, 30, 0, 0, 100, 300, 60, 30]],
    setStoreValue: (k, v) => { writes.push([k, v]); return Promise.resolve(); },
    addCapability: () => forbidden.push('add'), removeCapability: () => forbidden.push('remove'),
  };
  const owner = {};
  const sd = require(path.join(__dirname, '..', '..', 'lib', 'managers', 'SmartDivisorManager.js'));
  const t0 = 1_800_000_000_000;
  for (let i = 0; i < 200; i++) {
    L.observe(owner, device, { dp: 5, capability: 'measure_temperature', raw: 215, value: 21.5, manufacturerName: '_TZE200_p3073tst', now: t0 + i * 60000 });
  }
  assert.ok(owner._p3073Learner);
  assert.strictEqual(writes.length, 0, 'no write within the first day');
  L.observe(owner, device, { dp: 5, capability: 'measure_temperature', raw: 215, value: 21.5, manufacturerName: '_TZE200_p3073tst', now: t0 + L.PERSIST_MS + 1 });
  L.observe(owner, device, { dp: 5, capability: 'measure_temperature', raw: 215, value: 21.5, manufacturerName: '_TZE200_p3073tst', now: t0 + L.PERSIST_MS + 2 });
  assert.strictEqual(writes.length, 1);
  assert.strictEqual(writes[0][0], L.STORE_KEY);
  assert.deepStrictEqual(forbidden, []);
  if (typeof sd.getLearnedDivisor === 'function') {
    assert.strictEqual(sd.getLearnedDivisor('_TZE200_p3073tst', 5, 'measure_temperature'), 10);
  }
  assert.doesNotThrow(() => L.observe(null, null, {}));
  assert.doesNotThrow(() => L.observe({}, { getStoreValue: () => { throw new Error('x'); } }, { dp: 1 }));
});
