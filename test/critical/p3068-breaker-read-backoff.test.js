'use strict';
// P3068: the master breaker's Athom read timed out at the SDK default 10 s on every re-read (runs 40359765122 /
// 40362675998). Re-reads must back off and widen the timeout, stay bounded, and stay fail-closed when still empty.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const B = path.join(__dirname, '..', '..', '.github', 'scripts', 'master-publish-breaker.js');
const { rereadPlan } = require(B);

test('P3068 breaker re-read plan: exponential backoff, wider timeout, bounded', () => {
  assert.deepStrictEqual(rereadPlan(3), [
    { sleepS: 10, timeoutMs: 30000 }, { sleepS: 20, timeoutMs: 60000 }, { sleepS: 40, timeoutMs: 120000 }]);
  assert.ok(rereadPlan(3).every((s) => s.timeoutMs > 10000), 'every re-read must exceed the 10 s that timed out');
  assert.strictEqual(rereadPlan(99).length, 5, 'capped at 5 re-reads');
  assert.ok(rereadPlan(99).every((s) => s.timeoutMs <= 120000));
  const worst = rereadPlan(3).reduce((a, s) => a + s.sleepS * 1000 + s.timeoutMs * 2 + 60000, 0);
  assert.ok(worst < 15 * 60000, `worst case ${worst} ms must fit well inside the 55 min breaker job`);
  assert.deepStrictEqual(rereadPlan(0), []);
});

test('P3068 breaker stays fail-closed (skip) on an automatic event when Athom stays unreadable', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'p3068-brk-'));
  const out = path.join(tmp, 'out');
  fs.mkdirSync(path.join(tmp, 'data', 'status'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'data', 'status', 'homey-build-status-com.example.none.json'),
    JSON.stringify({ pat: 'invalid', builds: [], error: 'Timeout after 10000ms' }));
  try {
    const r = spawnSync(process.execPath, [B, 'com.example.none'], { cwd: tmp, encoding: 'utf8', timeout: 30000,
      env: { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_OUTPUT: out, GITHUB_STEP_SUMMARY: '' } });
    assert.match(r.stdout, /\[breaker\] SKIP/);
    assert.match(fs.readFileSync(out, 'utf8'), /skip=true/);
    assert.match(r.stdout, /re-read 1\/3 after 10s, timeout 30000ms/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
