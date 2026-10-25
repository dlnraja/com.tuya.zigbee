'use strict';
// P3048: public replies are never posted — only candidates (fix pushed, CI green, reporter spoke last, open, < 60 days).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const R = require(path.join(__dirname, '..', '..', 'scripts', 'automation', 'reply-candidates.cjs'));

const NOW = Date.parse('2026-10-25T12:00:00Z');
const issue = (o = {}) => ({ number: 5, state: 'open', updated_at: '2026-10-20T00:00:00Z', user: { login: 'reporter' }, ...o });

test('issueRefs: #n, (fixes #n), GH-n; no false hit inside words', () => {
  assert.deepStrictEqual(R.issueRefs('fix(x): sensor (fixes #123) see #45, GH-7'), [123, 45, 7]);
  assert.deepStrictEqual(R.issueRefs('color#123 and abc'), []);
});
test('ciState: any failure red, success green, else pending', () => {
  assert.strictEqual(R.ciState([{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'failure' }]), 'red');
  assert.strictEqual(R.ciState([{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'cancelled' }]), 'green');
  assert.strictEqual(R.ciState([{ status: 'in_progress' }]), 'pending');
});
test('evaluate: only open, recent, green, reporter-last threads, not listed twice', () => {
  assert.strictEqual(R.evaluate({ issue: issue(), lastComment: { user: { login: 'reporter' } }, ci: 'green', now: NOW }).candidate, true);
  assert.strictEqual(R.evaluate({ issue: issue({ state: 'closed' }), ci: 'green', now: NOW }).candidate, false);
  assert.strictEqual(R.evaluate({ issue: issue({ updated_at: '2026-07-01T00:00:00Z' }), ci: 'green', now: NOW }).candidate, false);
  assert.strictEqual(R.evaluate({ issue: issue(), ci: 'red', now: NOW }).candidate, false);
  assert.strictEqual(R.evaluate({ issue: issue(), lastComment: { user: { login: 'dlnraja' } }, ci: 'green', now: NOW }).candidate, false);
  assert.strictEqual(R.evaluate({ issue: issue(), lastComment: { user: { login: 'github-actions[bot]' } }, ci: 'green', now: NOW }).candidate, false);
  assert.strictEqual(R.evaluate({ issue: issue({ pull_request: {} }), ci: 'green', now: NOW }).candidate, false);
  assert.strictEqual(R.evaluate({ issue: issue(), ci: 'green', now: NOW, recentlyListed: true }).candidate, false);
});
test('limits: no auto-post, anti-flood caps documented in code', () => {
  assert.strictEqual(R.LIMITS.autoPost, false);
  assert.strictEqual(R.LIMITS.maxRepliesPerRun, 1);
  assert.strictEqual(R.LIMITS.maxRepliesPer7Days, 3);
  assert.ok(R.LIMITS.stopOn.includes('429'));
});
test('the script source never posts, comments or reacts', () => {
  const src = require('fs').readFileSync(path.join(__dirname, '..', '..', 'scripts', 'automation', 'reply-candidates.cjs'), 'utf8');
  assert.doesNotMatch(src, /method:\s*'(POST|PATCH|PUT|DELETE)'/);
});
