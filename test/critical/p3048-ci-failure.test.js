'use strict';
// P3048: deterministic CI autofix — transient vs real, one re-run, caps, publish never re-run, additive learning.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const C = require(path.join(__dirname, '..', '..', 'scripts', 'automation', 'ci-failure.cjs'));

test('classify: network/runner hiccups are transient, assertion failures are real', () => {
  assert.strictEqual(C.classify('Error: socket hang up', []).cls, 'transient');
  assert.strictEqual(C.classify('npm ERR! code ECONNRESET', []).cls, 'transient');
  assert.strictEqual(C.classify('HTTP 503 Service Unavailable', []).cls, 'transient');
  const r = C.classify('AssertionError [ERR_ASSERTION]: expected 1 to equal 2', []);
  assert.deepStrictEqual(r, { cls: 'real', kind: 'code-or-test' });
  assert.strictEqual(C.classify('', []).cls, 'none');
});
test('classify: a learned literal makes a message transient', () => {
  assert.strictEqual(C.classify('weird mirror hiccup in cache restore', [{ literal: 'mirror hiccup in cache' }]).cls, 'transient');
});
test('signature: volatile parts (numbers, hashes, paths) do not change the signature', () => {
  const a = C.signature({ workflow: 'W', job: 'j', step: 's', message: '2026-10-25T10:00:00.1Z Error at /home/runner/a.js:12 abcdef1234' });
  const b = C.signature({ workflow: 'W', job: 'j', step: 's', message: 'Error at /tmp/b.js:99 0123456789ab' });
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, C.signature({ workflow: 'W', job: 'j', step: 'other', message: 'Error at /tmp/b.js:99' }));
});
test('decide: exactly one re-run, caps 3/24 h per workflow and per signature, never publish', () => {
  assert.strictEqual(C.decide({ workflow: 'Node 22 runtime tests', cls: 'transient' }).action, 'rerun');
  assert.strictEqual(C.decide({ workflow: 'Node 22 runtime tests', cls: 'transient', runAttempt: 2 }).action, 'record');
  assert.strictEqual(C.decide({ workflow: 'Node 22 runtime tests', cls: 'transient', reruns24h: 3 }).action, 'record');
  assert.strictEqual(C.decide({ workflow: 'Node 22 runtime tests', cls: 'transient', sigCount24h: 3 }).action, 'record');
  assert.strictEqual(C.decide({ workflow: 'Node 22 runtime tests', cls: 'real' }).action, 'record');
  for (const w of ['Auto Publish on Push', 'Athom publish', 'Release', 'Promote draft-to-test']) assert.strictEqual(C.decide({ workflow: w, cls: 'transient' }).action, 'record', w);
  assert.strictEqual(C.decide({ workflow: 'x', path: '.github/workflows/auto-publish-on-push.yml', cls: 'transient' }).action, 'record');
});
test('learn: >= 2 distinct recovered runs in 30 days, no code hint, additive, no duplicates', () => {
  const now = Date.parse('2026-10-25T12:00:00Z');
  const e = (run, msg, at = '2026-10-24T10:00:00Z') => ({ at, status: 'recovered', run, data: { message: msg } });
  const entries = [e('1', 'mirror flake while restoring toolchain 42'), e('2', 'mirror flake while restoring toolchain 77'),
    e('3', 'AssertionError expected thing'), e('4', 'AssertionError expected thing'), e('5', 'lonely odd message once only')];
  const out = C.learn(entries, [], { now });
  assert.strictEqual(out.length, 1);
  assert.match(out[0].literal, /mirror flake while restoring toolchain/);
  assert.strictEqual(C.learn(entries, out, { now }).length, 0);
  assert.strictEqual(C.learn([e('1', 'mirror flake while restoring toolchain', '2026-08-01T00:00:00Z'), e('2', 'mirror flake while restoring toolchain', '2026-08-01T00:00:00Z')], [], { now }).length, 0);
});
