'use strict';
// P2940: IntelligentDriverHotSwap._loadProfileDb survives process.memoryUsage ENOENT (UT v9.0.1506 crash, Homey diag 17/10).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../../lib/dynamic/IntelligentDriverHotSwap.js'), 'utf8');
test('memoryUsage call in _loadProfileDb is guarded with heapUsed fallback', () => {
  const i = src.indexOf('async _loadProfileDb()');
  const body = src.slice(i, i + 1200);
  assert.match(body, /try \{ mem = process\.memoryUsage\?\.\(\); \} catch/);
  assert.match(body, /used_heap_size/);
});
test('no unguarded process.memoryUsage in lib/ (direct const assignment)', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
  const bad = walk(path.join(__dirname, '../../lib')).filter((f) => { const L = fs.readFileSync(f, 'utf8').split('\n'); return L.some((l, i) => /const \w+ = process\.memoryUsage/.test(l) && !/try\s*\{\s*$/.test(L[i - 1] || '')); });
  assert.deepStrictEqual(bad, []);
});
test('throwing memoryUsage falls back (behaviour)', async () => {
  const orig = process.memoryUsage;
  process.memoryUsage = () => { const e = new Error('ENOENT: no such file or directory, uv_resident_set_memory'); e.code = 'ENOENT'; throw e; };
  try {
    const Mod = require('../../lib/dynamic/IntelligentDriverHotSwap.js');
    const C = Mod.IntelligentDriverHotSwap || Mod.default || Mod;
    const proto = (typeof C === 'function' ? C.prototype : Object.getPrototypeOf(C));
    const ctx = { _profileDb: null, log() {}, error() {} };
    await assert.doesNotReject(() => Promise.resolve(proto._loadProfileDb.call(ctx)));
  } finally { process.memoryUsage = orig; }
});
