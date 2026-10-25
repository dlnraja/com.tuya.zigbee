'use strict';
// P3048 (t539u b): Dependabot PRs merge only after every gate is green (no --auto bypass).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { verdict } = require(path.join(__dirname, '..', '..', 'scripts', 'automation', 'wait-pr-checks.cjs'));

const opts = { self: ['Dependabot Auto-Merge'], required: ['Homey App Validate', 'Node 22', 'Syntax'], minRequired: 2 };
const run = (name, status, conclusion) => ({ name, status, conclusion });

test('verdict: waits while a run is pending (own run ignored)', () => {
  const r = verdict([run('Dependabot Auto-Merge', 'in_progress', null), run('Node 22 runtime tests', 'queued', null)], opts);
  assert.deepStrictEqual([r.done, r.green], [false, false]);
});
test('verdict: any failed or cancelled run blocks the merge', () => {
  const r = verdict([run('Node 22 runtime tests', 'completed', 'success'), run('Homey App Validate (all levels)', 'completed', 'failure')], opts);
  assert.deepStrictEqual([r.done, r.green], [true, false]);
  assert.strictEqual(verdict([run('x', 'completed', 'cancelled')], { ...opts, minRequired: 0 }).green, false);
});
test('verdict: needs the minimum of required green workflows', () => {
  assert.strictEqual(verdict([run('Node 22 runtime tests', 'completed', 'success')], opts).green, false);
  const ok = verdict([run('Node 22 runtime tests', 'completed', 'success'), run('Homey App Validate (all levels)', 'completed', 'success'), run('Other', 'completed', 'skipped')], opts);
  assert.deepStrictEqual([ok.done, ok.green], [true, true]);
});
test('the dependabot workflow merges only on the gates verdict, without --auto', () => {
  const y = require('fs').readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'dependabot-auto-merge.yml'), 'utf8');
  assert.match(y, /steps\.gates\.outputs\.green == 'true'/);
  assert.doesNotMatch(y, /gh pr merge[^\n]*--auto/);
  assert.match(y, /--match-head-commit/);
});
