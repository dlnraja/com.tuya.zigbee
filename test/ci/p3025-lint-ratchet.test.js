'use strict';
// P3025 — lint ratchet: total may only go down, per-file counts may not grow, new files start at 0.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { compare, inScope, SAFE_RULES } = require(path.resolve(__dirname, '..', '..', 'scripts/ci/lint-ratchet.js'));

const base = { total: 5, files: { 'lib/a.js': 3, 'drivers/x/device.js': 2 } };

test('improvement passes, total and per-file', () => {
  assert.deepStrictEqual(compare(base, { 'lib/a.js': 1, 'drivers/x/device.js': 2 }).regressions, []);
});
test('a file growing fails even if the total shrinks', () => {
  const r = compare(base, { 'lib/a.js': 0, 'drivers/x/device.js': 3 });
  assert.deepStrictEqual(r.regressions.map(x => x.file), ['drivers/x/device.js']);
});
test('new file with errors fails (baseline 0); changed-only mode ignores the total', () => {
  const r = compare(base, { 'lib/new.js': 1 }, ['lib/new.js']);
  assert.deepStrictEqual(r.regressions, [{ file: 'lib/new.js', was: 0, now: 1 }]);
});
test('scope and safe rule set are fixed', () => {
  assert.strictEqual(inScope('lib/x/y.js'), true);
  assert.strictEqual(inScope('scripts/x.js'), false);
  assert.deepStrictEqual([...SAFE_RULES].sort(), ['curly', 'no-extra-parens', 'no-extra-semi']);
});
