'use strict';
/* eslint-env mocha */
const assert = require('assert');
const { checkSource } = require('../tools/ci/runtime-safety-gate');

describe('R21 runtime-safety gate', () => {
  it('flags unbounded patterns', () => {
    assert.ok(checkSource('setInterval(() => {}, 1000);').length === 1);
    assert.ok(checkSource('const cache = new Map();\ncache.set(1, 2);')[0].includes('cache'));
    assert.ok(checkSource("this.zclNode.on('x', f);", 'drivers/a/device.js')[0].includes('listeners'));
    assert.ok(checkSource('while (true) {\n  x++;\n}').length === 1);
  });
  it('accepts bounded patterns', () => {
    assert.deepStrictEqual(checkSource('const t = setInterval(f, 1);\nclearInterval(t);'), []);
    assert.deepStrictEqual(checkSource('const cache = new Map();\nconst MAX = 50;\nif (cache.size >= MAX) cache.delete(cache.keys().next().value);'), []);
    assert.deepStrictEqual(checkSource("this.on('x', f);\nthis.removeListener('x', f);", 'drivers/a/device.js'), []);
    assert.deepStrictEqual(checkSource('while (true) {\n  if (x) break;\n}'), []);
  });
  it('treats never-mutated Sets/Maps as constants, still flags mutated ones', () => {
    assert.deepStrictEqual(checkSource("const KINDS = new Set(['a', 'b']);\nif (KINDS.has(x)) {}"), []);
    assert.strictEqual(checkSource('const seen = new Set();\nseen.add(x);').length, 1);
  });
});
