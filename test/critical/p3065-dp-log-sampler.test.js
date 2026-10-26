'use strict';
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const ROOT = path.join(__dirname, '..', '..');
const L = require(path.join(ROOT, 'lib/utils/dp-log-sampler'));

test('P3065 DP log: first 3, value changes and every 50th repeat are logged; verbose logs all', () => {
  const stats = { count: 0 };
  let n = 0;
  for (let i = 1; i <= 200; i++) { stats.count = i; if (L.shouldLogDp(stats, i === 120 ? '"b"' : '"a"', false)) {n++;} }
  // 1 (first/change) +2 (count 2,3) +4 (50,100,150,200) +2 (change to b at 120 and back at 121)
  assert.strictEqual(n, 1 + 2 + 4 + 2);
  const s2 = { count: 0 }; let m = 0;
  for (let i = 1; i <= 200; i++) { s2.count = i; if (L.shouldLogDp(s2, '"a"', true)) {m++;} }
  assert.strictEqual(m, 200);
});

test('P3065 DP log: raw payload truncated unless verbose; never throws', () => {
  const big = 'ab'.repeat(500);
  assert.ok(L.formatRaw(big, false).length < L.MAX_RAW + 20);
  assert.strictEqual(L.formatRaw(big, true), JSON.stringify(big));
  const circ = {}; circ.self = circ;
  assert.strictEqual(typeof L.formatRaw(circ, false), 'string');
  assert.strictEqual(L.isVerbose({ homey: { app: { developerDebugMode: true } } }), true);
  assert.strictEqual(L.isVerbose(null), false);
});

test('P3065 UnifiedSensorBase uses the sampler for the per-DP receive line', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
  assert.match(src, /dpLog\.shouldLogDp\(stats, rawStr, verbose\)/);
  assert.ok(!src.includes('raw=${JSON.stringify(rawDisplay)} interval'));
});

test('P3065 compact(): Buffers as hex, one line, truncated; verbose keeps historical JSON', () => {
  const frame = { dp: 1, datatype: 0, data: Buffer.alloc(300, 0xab) };
  const c = L.compact(frame, false);
  assert.ok(c.startsWith('{"dp":1,"datatype":0,"data":"hex:abab'));
  assert.ok(c.length < L.MAX_RAW + 20);
  assert.ok(!c.includes('\n'));
  assert.strictEqual(L.compact(frame, true), JSON.stringify(frame));
  assert.strictEqual(L.compact(Buffer.from([1, 2]), false), 'hex:0102');
  assert.strictEqual(typeof L.compact(undefined, false), 'string');
});

test('P3065 TuyaEF00Manager frame logs go through compact()', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaEF00Manager.js'), 'utf8');
  assert.ok(!src.includes("response EVENT received!', JSON.stringify(data, null, 2))"));
  assert.ok(!src.includes('received: raw=${JSON.stringify(value)}'));
  assert.strictEqual((src.match(/dp-log-sampler'\)\.compact\(/g) || []).length, 4);
});

test('P3065 shouldLogDup samples per DP, bounded, verbose bypass', () => {
  const { shouldLogDup } = require('../../lib/utils/dp-log-sampler');
  const o = {};
  const r = [];
  for (let i = 0; i < 100; i += 1) {r.push(shouldLogDup(o, 1, false));}
  assert.strictEqual(r.filter(Boolean).length, 5); // 1,2,3,50,100
  assert.strictEqual(shouldLogDup(o, 2, false), true);
  assert.strictEqual(shouldLogDup(o, 1, true), true);
  for (let d = 0; d < 400; d += 1) {shouldLogDup(o, 'x' + d, false);}
  assert.ok(Object.keys(o._p3065DupLogN).length <= 256);
});

test('P3065 shouldLogSampled: per-key sampling, bounded, verbose bypass, frozen owner safe', () => {
  const { shouldLogSampled } = require('../../lib/utils/dp-log-sampler');
  const o = {};
  let n = 0;
  for (let i = 0; i < 100; i += 1) {if (shouldLogSampled(o, 'rq1', false)) {n += 1;}}
  assert.strictEqual(n, 5);
  assert.strictEqual(shouldLogSampled(o, 'rq1', true), true);
  for (let d = 0; d < 400; d += 1) {shouldLogSampled(o, 'k' + d, false);}
  assert.ok(Object.keys(o._p3065LogKeyN).length <= 256);
  assert.strictEqual(shouldLogSampled(Object.freeze({}), 'x', false), true);
});

test('P3065 repetitive EF00/DataQuery lines are sampled (source pins)', () => {
  const fs = require('fs');
  const ef = fs.readFileSync(require.resolve('../../lib/tuya/TuyaEF00Manager'), 'utf8');
  for (const k of ["'ep' + epId", "'rq' + dp", "'ac' + dp"]) {assert.ok(ef.includes('shouldLogSampled(this, ' + k), k);}
  const dq = fs.readFileSync(require.resolve('../../lib/tuya/TuyaDataQuery'), 'utf8');
  assert.ok(dq.includes("shouldLogSampled(device, 'qs'"));
});
