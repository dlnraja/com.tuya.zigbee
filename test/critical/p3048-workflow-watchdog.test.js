'use strict';
// P3048 (t539u a): watchdog for workflows that stop running or keep failing — one finding per signature.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const W = require(path.join(__dirname, '..', '..', 'scripts', 'automation', 'workflow-watchdog.cjs'));

const NOW = Date.parse('2026-10-25T12:00:00Z');
const h = (n) => new Date(NOW - n * 3600000).toISOString();

test('cronPeriodHours: hourly, every n h, daily, weekly, weekdays, monthly', () => {
  assert.strictEqual(W.cronPeriodHours('0 * * * *'), 1);
  assert.strictEqual(W.cronPeriodHours('0 */6 * * *'), 6);
  assert.strictEqual(W.cronPeriodHours('10 5 * * *'), 24);
  assert.strictEqual(W.cronPeriodHours('0 5,17 * * *'), 12);
  assert.strictEqual(W.cronPeriodHours('0 5 * * 1'), 168);
  assert.strictEqual(W.cronPeriodHours('0 5 * * 1-5'), 72);
  assert.strictEqual(W.cronPeriodHours('0 5 1 * *'), 744);
  assert.strictEqual(W.cronPeriodHours('bad'), null);
});
test('assess: disabled, 3 failures in a row, stale schedule, healthy', () => {
  const wf = { file: 'x.yml', periodH: 24 };
  assert.strictEqual(W.assess({ wf, state: 'disabled_manually' }).kind, 'disabled');
  const fail = { status: 'completed', conclusion: 'failure' };
  assert.strictEqual(W.assess({ wf, recentRuns: [fail, fail, fail], scheduleRuns: [{ created_at: h(1) }], now: NOW }).kind, 'failing');
  assert.strictEqual(W.assess({ wf, scheduleRuns: [{ created_at: h(60) }], now: NOW }).kind, 'stale');
  assert.strictEqual(W.assess({ wf, scheduleRuns: [{ created_at: h(20) }], now: NOW }), null);
  assert.strictEqual(W.assess({ wf, scheduleRuns: [], now: NOW }), null);
  const a = W.assess({ wf, state: 'disabled_manually' }); const b = W.assess({ wf, state: 'disabled_inactivity' });
  assert.strictEqual(a.sig, b.sig);
});
test('repeatedFailures: same real signature >= 3 times, publish ignored', () => {
  const e = (sig, publish) => ({ status: 'fail', summary: 's', data: { sig, wf: 'w.yml', publish } });
  const r = W.repeatedFailures([e('a'), e('a'), e('a'), e('b'), e('p', true), e('p', true), e('p', true)]);
  assert.deepStrictEqual(r.map((x) => x.sig), ['ci-a']);
});
test('scheduledWorkflows: the repo workflows parse and none runs more often than hourly', () => {
  const list = W.scheduledWorkflows();
  assert.ok(list.length > 5);
  assert.ok(list.some((w) => w.file === 'automation-loop.yml'));
  for (const w of list.filter((x) => /^(automation-loop|ci-autofix)\.yml$/.test(x.file))) assert.ok(w.periodH >= 1, w.file);
  assert.strictEqual(W.LABEL, 'automation-watch');
});
