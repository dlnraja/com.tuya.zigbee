'use strict';
// P3036 (25/10/2026 Paris): after the P3034 bisect (status=done, 9.0.1599 #3682 -> Test) every Athom upload path
// shares one policy: green CI gate, upload spacing + one lock + no upload while busy, transient vs real
// classification with a single retry that the breaker never blocks, and bisect mode only while status=running.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..', '..');
const P = require(path.join(ROOT, '.github/scripts/athom-publish-policy.js'));
const MASTER = 'com.dlnraja.tuya.zigbee';
const STABLE = 'com.dlnraja.tuya.zigbee.stable';
const BASTIEN = 'com.dlnraja.tuya.zigbee.bastien';
const NOW = Date.parse('2026-10-25T16:00:00+01:00');
const ago = (min) => new Date(NOW - min * 60000).toISOString();

// ── rule 1: green CI gate ────────────────────────────────────────────────────────────────────
const REQ = P.appPolicy(MASTER, {}).ci;
const green = (sha, at = '2026-10-25T10:00:00Z') => ({ head_sha: sha, status: 'completed', conclusion: 'success', created_at: at });
const allRuns = (run) => Object.fromEntries(REQ.map((wf) => [wf, [run]]));

test('ci gate: master needs Syntax Check, Unified CI/CD, Node 22 tests and Homey App Validate', () => {
  assert.deepStrictEqual(REQ, ['syntax-check.yml', 'unified-ci.yml', 'node22-tests.yml', 'homey-app-validate.yml']);
  for (const id of [STABLE, BASTIEN]) assert.ok(P.appPolicy(id, {}).ci.includes('homey-app-validate.yml'), id);
});
test('ci gate: all required runs green on the SHA -> green', () => {
  const r = P.evaluateCi({ required: REQ, ancestry: ['a1'], runsByWorkflow: allRuns(green('a1')) });
  assert.strictEqual(r.state, 'green');
});
test('ci gate: one red or pending workflow blocks the upload', () => {
  const runs = allRuns(green('a1'));
  runs['unified-ci.yml'] = [{ head_sha: 'a1', status: 'completed', conclusion: 'failure' }];
  assert.strictEqual(P.evaluateCi({ required: REQ, ancestry: ['a1'], runsByWorkflow: runs }).state, 'red');
  runs['unified-ci.yml'] = [{ head_sha: 'a1', status: 'in_progress', conclusion: null }];
  assert.strictEqual(P.evaluateCi({ required: REQ, ancestry: ['a1'], runsByWorkflow: runs }).state, 'pending');
});
test('ci gate: a [skip ci] data/docs commit on top of a green SHA passes when code is identical', () => {
  const r = P.evaluateCi({ required: REQ, ancestry: ['tip', 'a1'], runsByWorkflow: allRuns(green('a1')), codeChanged: () => false });
  assert.strictEqual(r.state, 'green');
  assert.match(r.perWorkflow['node22-tests.yml'].reason, /code-identical ancestor/);
});
test('ci gate: an ancestor run is stale when code changed (or the diff is unknown)', () => {
  assert.strictEqual(P.evaluateCi({ required: REQ, ancestry: ['tip', 'a1'], runsByWorkflow: allRuns(green('a1')), codeChanged: () => true }).state, 'missing');
  assert.strictEqual(P.evaluateCi({ required: REQ, ancestry: ['tip', 'a1'], runsByWorkflow: allRuns(green('a1')), codeChanged: () => null }).state, 'missing');
});
test('ci gate: cancelled runs are ignored, the newest real run counts', () => {
  const runs = allRuns(green('a1', '2026-10-25T09:00:00Z'));
  runs['syntax-check.yml'].push({ head_sha: 'a1', status: 'completed', conclusion: 'cancelled', created_at: '2026-10-25T11:00:00Z' });
  assert.strictEqual(P.evaluateCi({ required: REQ, ancestry: ['a1'], runsByWorkflow: runs }).state, 'green');
});
test('ci gate: code files are js/cjs/mjs/ts and package manifests, not data or docs', () => {
  for (const f of ['lib/x.js', 'a.cjs', 'b.mjs', 'c.ts', 'package.json', 'package-lock.json']) assert.ok(P.isCodeFile(f), f);
  for (const f of ['docs/a.md', 'data/x.json', 'drivers/a/driver.compose.json', 'app.json']) assert.ok(!P.isCodeFile(f), f);
});

// ── rule 2: spacing, busy, per-app lock ──────────────────────────────────────────────────────
const b = (id, state, createdMin, extra = {}) => ({ id, version: `9.0.${id}`, state, created: ago(createdMin), at: ago(createdMin), ...extra });
test('spacing: master waits >= 2 h between uploads', () => {
  const d = P.slotDecision({ appId: MASTER, builds: [b(10, 'test', 90)], eventName: 'push', now: NOW, env: {} });
  assert.strictEqual(d.go, false); assert.strictEqual(d.deferred, true); assert.match(d.reason, /< 120 min/);
  assert.strictEqual(P.slotDecision({ appId: MASTER, builds: [b(10, 'draft', 130)], eventName: 'push', now: NOW, env: {} }).go, true);
});
test('spacing: master allows at most one successful upload per 24 h', () => {
  const d = P.slotDecision({ appId: MASTER, builds: [b(11, 'test', 180), b(10, 'processing_failed', 400)], eventName: 'schedule', now: NOW, env: {} });
  assert.strictEqual(d.go, false); assert.match(d.reason, /successful upload/);
});
test('spacing: per-app config and env overrides', () => {
  assert.strictEqual(P.appPolicy(STABLE, {}).minIntervalMin, 60);
  assert.strictEqual(P.appPolicy(MASTER, { ATHOM_MIN_INTERVAL_MIN: '30' }).minIntervalMin, 30);
  assert.strictEqual(P.appPolicy(MASTER, { ATHOM_MAX_SUCCESS_PER_24H: '3' }).maxSuccessPer24h, 3);
  assert.strictEqual(P.slotDecision({ appId: STABLE, builds: [b(5, 'test', 70)], eventName: 'push', now: NOW, env: {} }).go, true);
});
test('spacing: a hang-up retry bypasses spacing once but waits >= 5 min', () => {
  const hang = b(12, 'processing_failed', 3, { error: 'socket hang up' });
  assert.strictEqual(P.slotDecision({ appId: MASTER, builds: [hang], eventName: 'workflow_dispatch', transientRetry: '1', now: NOW, env: {} }).go, false);
  const hang6 = b(12, 'processing_failed', 6, { error: 'socket hang up' });
  assert.strictEqual(P.slotDecision({ appId: MASTER, builds: [hang6], eventName: 'workflow_dispatch', transientRetry: '1', now: NOW, env: {} }).go, true);
  assert.strictEqual(P.slotDecision({ appId: MASTER, builds: [hang6], eventName: 'workflow_dispatch', transientRetry: '2', now: NOW, env: {} }).go, false);
});
test('busy: no upload while the previous build is still processing', () => {
  const d = P.slotDecision({ appId: MASTER, builds: [b(13, 'processing', 200)], eventName: 'workflow_dispatch', force: 'false', now: NOW, env: {} });
  assert.strictEqual(d.go, false); assert.match(d.reason, /still processing/);
  // waiting_for_files older than 5 min is a stuck upload, not busy (same rule as wait-athom-idle.js)
  assert.strictEqual(P.busyBuild([b(14, 'waiting_for_files', 200)], NOW), null);
});
test('slot: unreadable build list holds automatic runs (fail closed), manual dispatch may try', () => {
  assert.strictEqual(P.slotDecision({ appId: MASTER, snapshotOk: false, eventName: 'push', now: NOW }).go, false);
  assert.strictEqual(P.slotDecision({ appId: MASTER, snapshotOk: false, eventName: 'workflow_dispatch', now: NOW }).go, true);
  assert.strictEqual(P.slotDecision({ appId: MASTER, snapshotOk: false, eventName: 'workflow_dispatch', deferredRetry: 'true', now: NOW }).go, false,
    'a deferred self-heal dispatch counts as automatic');
});
test('slot: only an explicit manual force_publish overrides spacing', () => {
  assert.strictEqual(P.slotDecision({ appId: MASTER, builds: [b(10, 'test', 10)], eventName: 'workflow_dispatch', force: 'true', now: NOW }).go, true);
  assert.strictEqual(P.slotDecision({ appId: MASTER, builds: [b(10, 'test', 10)], eventName: 'push', force: 'true', now: NOW }).go, false);
});
test('slot: ledger rows with app/created count as uploads (fallback when the snapshot is short)', () => {
  const outcomes = [{ app_id: MASTER, created: ago(30), state: 'draft', buildId: 99 }, { app_id: STABLE, created: ago(5), state: 'test' }];
  assert.strictEqual(P.slotDecision({ appId: MASTER, builds: [], outcomes, eventName: 'push', now: NOW, env: {} }).go, false);
  assert.strictEqual(P.slotDecision({ appId: STABLE, builds: [], outcomes: outcomes.slice(0, 1), eventName: 'push', now: NOW, env: {} }).go, true);
});
test('lock: one concurrency group per app shared by every publish workflow', () => {
  const W = (f) => (fs.existsSync(path.join(ROOT, '.github/workflows', f)) ? fs.readFileSync(path.join(ROOT, '.github/workflows', f), 'utf8') : null);
  const lockOf = { [MASTER]: 'athom-publish-master', [STABLE]: 'athom-publish-stable', [BASTIEN]: 'athom-publish-bastien' };
  for (const [id, lock] of Object.entries(lockOf)) assert.strictEqual(P.APPS[id].lock, lock);
  const expect = {
    'auto-publish-on-push.yml': 'athom-publish-master', 'publish.yml': 'athom-publish-', 'auto-fix-and-publish.yml': 'athom-publish-',
    'verified-publish-and-diagnostics.yml': 'athom-publish-', 'draft-to-test-fleet.yml': 'athom-publish-', 'draft-to-test.yml': 'athom-publish-',
    'publish-stable.yml': 'athom-publish-stable', 'bastien-publish.yml': 'athom-publish-bastien',
  };
  for (const [f, g] of Object.entries(expect)) { const src = W(f); if (src) assert.ok(src.includes(`group: ${g}`) || src.includes(`'${g}`), `${f} lacks ${g}`); }
});

// ── rule 3: classification + single retry ────────────────────────────────────────────────────
test('classify: transient = socket hang up, ECONNRESET, ETIMEDOUT, 5xx, timeouts, invalid_state', () => {
  for (const t of ['Error: socket hang up', 'read ECONNRESET', 'connect ETIMEDOUT', 'HTTP 503', 'HTTP 500 Internal Server Error', 'Timeout after 180000ms', 'Gateway Timeout', 'invalid_state']) {
    assert.strictEqual(P.classify(t).cls, 'transient', t);
  }
});
test('classify: real = AggregateError (even with a hang-up), processing_failed, validation, unknown', () => {
  assert.deepStrictEqual(P.classify('AggregateError: socket hang up'), { kind: 'AggregateError', cls: 'real' });
  assert.strictEqual(P.classify({ state: 'processing_failed' }).kind, 'processing_failed');
  assert.strictEqual(P.classify('✖ App did not validate against level `publish`: validation failed').cls, 'real');
  assert.strictEqual(P.classify('something new').cls, 'real');
  assert.strictEqual(P.classify({ state: 'processing_failed', error: 'socket hang up' }).cls, 'transient');
  assert.strictEqual(P.classify({ state: 'test' }).cls, 'none');
});
test('retry: transient gets exactly one retry, backoff >= 5 min, breaker untouched', () => {
  const r = P.retryDecision({ text: 'socket hang up', retriesDone: 0, rnd: 0 });
  assert.deepStrictEqual([r.retry, r.backoffS, r.tripBreaker], [true, 300, false]);
  assert.ok(P.retryDecision({ text: 'ECONNRESET', rnd: 0.999 }).backoffS <= 360);
  assert.strictEqual(P.retryDecision({ text: 'socket hang up', retriesDone: 1 }).retry, false);
  assert.strictEqual(P.retryDecision({ text: 'invalid_state', idleWaited: false }).retry, false);
});
test('retry: real failure never retries, trips the breaker, asks for a diagnostic', () => {
  for (const t of ['AggregateError', 'processing_failed', 'validation failed']) {
    const r = P.retryDecision({ text: t });
    assert.deepStrictEqual([r.retry, r.tripBreaker, r.diagnose], [false, true, true], t);
  }
});

// ── rule 4: the single retry never trips / is never blocked by the breaker ───────────────────
test('breaker: the single automatic retry after a hang-up is exempt (run 40194918949)', () => {
  const builds = [b(3, 'processing_failed', 10, { error: 'socket hang up' }), b(2, 'processing_failed', 200, { error: 'socket hang up' }), b(1, 'processing_failed', 400, { error: 'socket hang up' })];
  assert.strictEqual(P.singleRetryExempt({ builds, transientRetry: '1' }).exempt, true);
  assert.strictEqual(P.singleRetryExempt({ builds, transientRetry: '2' }).exempt, false);
  assert.strictEqual(P.singleRetryExempt({ builds: [b(3, 'processing_failed', 10, { error: 'AggregateError' })], transientRetry: '1' }).exempt, false);
  const brk = require(path.join(ROOT, '.github/scripts/master-publish-breaker.js'));
  assert.strictEqual(brk.decide({ builds, event: 'workflow_dispatch', transientRetry: '1', snapshotOk: true }).skip, false);
});
test('breaker: a transient failure alone does not trip, a real one does', () => {
  assert.strictEqual(P.breakerAssess({ builds: [b(3, 'processing_failed', 10, { error: 'ECONNRESET' }), b(2, 'test', 300)] }).tripped, false);
  assert.strictEqual(P.breakerAssess({ builds: [b(3, 'processing_failed', 10, { error: 'AggregateError' }), b(2, 'test', 300)] }).tripped, true);
});
test('fallback CLI: in-run re-upload only for a transient failure, after >= 300 s, once', () => {
  const { spawnSync } = require('child_process');
  const run = (text, env = {}) => spawnSync(process.execPath, [path.join(ROOT, '.github/scripts/athom-publish-policy.js'), 'fallback'],
    { input: text, encoding: 'utf8', env: { ...process.env, ATHOM_RETRY_USED: '', ...env } }).stdout.trim();
  assert.match(run('Error: socket hang up'), /^RETRY (3\d\d)$/);
  assert.match(run('AggregateError'), /^STOP AggregateError/);
  assert.match(run('socket hang up', { ATHOM_RETRY_USED: '1' }), /^STOP/);
});

// ── rule 5: bisect exit ──────────────────────────────────────────────────────────────────────
test('bisect exit: status=done never forces drafts or bisect_trial; status=running re-arms the hold', () => {
  const { decide, MASTER_APP } = require(path.join(ROOT, '.github/scripts/bisect-hold.js'));
  const now = new Date(NOW);
  for (const eventName of ['push', 'schedule', 'workflow_dispatch']) {
    const d = decide({ state: { status: 'done', app_id: MASTER_APP }, appId: MASTER_APP, eventName, bisectTrial: '', now });
    assert.deepStrictEqual([d.hold_upload, d.hold_promote], [false, false], eventName);
  }
  const r = decide({ state: { status: 'running', app_id: MASTER_APP, current_trial: 1 }, appId: MASTER_APP, eventName: 'push', bisectTrial: '', now });
  assert.deepStrictEqual([r.hold_upload, r.hold_promote], [true, true]);
});
test('bisect exit: state file and docs describe the normal flow (draft -> Test, Live never automatic)', () => {
  const st = path.join(ROOT, 'docs/knowledge/athom-bisect-state.json');
  if (!fs.existsSync(st)) return;
  const j = JSON.parse(fs.readFileSync(st, 'utf8'));
  if (j.status !== 'done') return;
  const txt = JSON.stringify(j);
  assert.doesNotMatch(String(j.conclusion || ''), /drafts only until/i);
  assert.match(txt, /rerun the bisect/i);
  assert.match(txt, /Live (is )?never automatic/i);
});

test('policy file is byte-identical on master, stable-v5 and bastien-home', () => {
  const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, '.github/scripts/athom-publish-policy.js'))).digest('hex');
  assert.strictEqual(h, 'bbe8a72e2e425231a75ae58846b07e5eb8e44bc529119761c41deb2be54c0391', 'edit athom-publish-policy.js on all three branches together and update this hash');
});
test('ci gate: a version-only package.json bump is not a code change', () => {
  assert.strictEqual(P.versionOnlyDiff('--- a/package.json\n+++ b/package.json\n@@ -3 +3 @@\n-  "version": "9.0.1599",\n+  "version": "9.0.1600",'), true);
  assert.strictEqual(P.versionOnlyDiff('@@ -9 +9 @@\n-    "homey": "^3.0.0"\n+    "homey": "^3.1.0"'), false);
});

// ── next slot: deferred dispatch ─────────────────────────────────────────────────────────────
const D = require('../../.github/scripts/athom-deferred-dispatch');
test('next slot: a held upload is re-dispatched once, never twice, never while a run is active', () => {
  const now = Date.parse('2026-10-25T16:00:00Z');
  const arts = [{ name: 'athom-deferred-master-111', created_at: '2026-10-25T14:00:00Z' }];
  assert.strictEqual(D.deferredDecision({ key: 'master', artifacts: arts, runs: [{ created_at: '2026-10-25T13:50:00Z', status: 'completed' }], now }).dispatch, true);
  assert.strictEqual(D.deferredDecision({ key: 'master', artifacts: arts, runs: [{ created_at: '2026-10-25T15:00:00Z', status: 'completed' }], now }).dispatch, false);
  assert.strictEqual(D.deferredDecision({ key: 'master', artifacts: arts, runs: [{ created_at: '2026-10-25T13:50:00Z', status: 'in_progress' }], now }).dispatch, false);
  assert.strictEqual(D.deferredDecision({ key: 'stable', artifacts: arts, runs: [], now }).dispatch, false);
  assert.strictEqual(D.deferredDecision({ key: 'master', artifacts: arts, runs: [], now: now + 3 * 86400e3 }).dispatch, false);
  assert.deepStrictEqual(Object.keys(D.TARGETS), ['master', 'stable', 'bastien']);
});

test('in-run fallbacks: every direct-api fallback asks the shared policy first', () => {
  const fs = require('fs'); const path = require('path');
  const root = path.join(__dirname, '..', '..');
  for (const f of ['.github/actions/homey-app-publish/action.yml', '.github/actions/homey-publish/action.yml', '.github/workflows/auto-fix-and-publish.yml']) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    const s = fs.readFileSync(p, 'utf8');
    if (!/direct-api-publish\.js/.test(s)) continue;
    assert.match(s, /athom-publish-policy\.js" fallback/, `${f}: direct-api fallback must use the P3036 policy`);
    assert.match(s, /ATHOM_RETRY_USED=1/, `${f}: must record the single retry`);
  }
});

// P3075 (t613u): 26/10 15:04 staged send held 40 min on "CI missing" for a SHA that was no longer the tip
test('ci gate: missing CI on a superseded SHA holds at once instead of dispatching CI on the newer tip', () => {
  assert.strictEqual(P.missingCiAction({ state: 'missing', sha: 'a1', tip: 'b2' }), 'superseded');
  assert.strictEqual(P.missingCiAction({ state: 'missing', sha: 'a1', tip: 'a1' }), 'dispatch');
  assert.strictEqual(P.missingCiAction({ state: 'missing', sha: 'a1', tip: null }), 'dispatch');
  assert.strictEqual(P.missingCiAction({ state: 'pending', sha: 'a1', tip: 'b2' }), 'wait');
  assert.strictEqual(P.missingCiAction({ state: 'green', sha: 'a1', tip: 'b2' }), 'wait');
});
