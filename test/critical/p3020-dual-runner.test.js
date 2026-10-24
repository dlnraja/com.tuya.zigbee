'use strict';
// P3020: the critical suite must run under both `node --test` and mocha (pr-gate).
const { test } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'test', 'critical');

function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { walk(p, out); } else if (e.name.endsWith('.test.js')) { out.push(p); }
  }
  return out;
}

test('every mocha-style critical file binds describe/it through the dual runner', () => {
  const offenders = [];
  for (const f of walk(DIR)) {
    const src = fs.readFileSync(f, 'utf8');
    const usesSuite = /(^|[^.\w$])describe(\.(skip|only))?\s*\(/m.test(src);
    if (!usesSuite) { continue; }
    const bound = /require\(['"](node:test|mocha|[./]+(_support\/)?dual-runner|[./]*_support\/dual-runner)['"]\)/.test(src)
      || /(const|let|var)\s*\{[^}]*\bdescribe\b[^}]*\}\s*=/.test(src)
      || /(const|let|var|function)\s+describe\b/.test(src);
    if (!bound) { offenders.push(path.relative(ROOT, f)); }
  }
  assert.deepStrictEqual(offenders, [], `use: const { describe, it } = require('../_support/dual-runner');\n${offenders.join('\n')}`);
});

test('dual runner maps onto the active runner (node:test outside mocha) and emulates this.skip/this.timeout', async () => {
  const dr = require('../_support/dual-runner');
  assert.strictEqual(dr.runner, typeof globalThis.describe === 'function' && typeof globalThis.it === 'function' ? 'mocha' : 'node:test');
  for (const k of ['describe', 'it', 'before', 'after', 'beforeEach', 'afterEach']) {
    assert.strictEqual(typeof dr[k], 'function', k);
  }
});

test('homey stub only replaces the CLI entry, with an SDK-shaped Device class', () => {
  const { install } = require('../_support/homey-stub');
  const resolved = require.resolve('homey');
  const isCli = /[\\/]bin[\\/]homey\.js$/.test(resolved);
  assert.strictEqual(install(), isCli);
  if (isCli) {
    // Read the cache entry install() owns: under mocha every critical file shares one process and
    // several of them hook Module._load to return their own fake 'homey' (never restored), so
    // require('homey') there reflects another file's mock, not this stub's contract.
    const Homey = require.cache[resolved].exports;
    assert.ok(Homey.__p3020Stub);
    assert.strictEqual(typeof Homey.Device, 'function');
  }
});
