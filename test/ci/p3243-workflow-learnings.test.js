'use strict';
// P3243 (02/11/2026 Paris): lessons of 02/11 encoded in CI (full suite incl. test/critical, chain routing,
// dup gate wiring, manifest budget + Athom size-limit hypothesis, parasite report, stale build clean, flaky retry).
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

describe('P3243 workflow learnings', () => {
  it('manifest budget gate refuses growth and only ratchets down', () => {
    const mb = require('../../scripts/ci/manifest-budget.js');
    assert.deepStrictEqual(mb.gate({ appBytes: 10, combos: 5 }, { max: { appBytes: 10, combos: 5 } }), []);
    assert.strictEqual(mb.gate({ appDrivers: 478 }, { max: { appDrivers: 477 } }).length, 1);
    const r = mb.ratchet({ appBytes: 100, combos: 10, parasites: 5, appDrivers: 3 }, { max: { appBytes: 50 } });
    assert.strictEqual(r.max.appBytes, 50);
    assert.strictEqual(mb.ratchet({ appBytes: 100 }, { max: { appBytes: 50 } }, true).max.appBytes, 20100);
    const m = mb.measure(ROOT);
    assert.ok(m.appBytes > 0 && m.combos > 0);
    assert.deepStrictEqual(mb.gate(m, JSON.parse(read('config/ci/manifest-budget.json'))), [], 'repo is within its manifest budget');
  });

  it('hold bisect records the manifest-size-limit hypothesis after 2 distinct single refusals', () => {
    const { hypothesis } = require('../../.github/scripts/publish-hold-bisect.js');
    const h = [{ kind: 'AggregateError', p3095: { released: ['a'] } }];
    assert.strictEqual(hypothesis({ outcome: 'AggregateError', released: ['a'], history: h }), null);
    assert.match(hypothesis({ outcome: 'AggregateError', released: ['b'], history: h }), /manifest-size-limit/);
    assert.strictEqual(hypothesis({ outcome: 'test', released: ['b'], history: h }), null);
  });

  it('new couples on a full root are routed to the chain, old couples never move', () => {
    const { planRoute } = require('../../scripts/ci/chain-route-new-couples.js');
    const r = planRoute({ base: { mfrs: ['_TZ_old'], pids: ['TS0201'] }, now: { mfrs: ['_TZ_old', '_TZ_new', '_tz_new'], pids: ['TS0201', 'TS0601'] } });
    assert.deepStrictEqual(r.moves, [{ mfr: '_tz_new', forms: ['_TZ_new', '_tz_new'], pids: ['TS0601'] }]);
    const s = planRoute({ base: { mfrs: ['a'], pids: ['P'] }, now: { mfrs: ['a', 'x'], pids: ['P'] } });
    assert.deepStrictEqual(s.stay, ['x'], 'unknown pids: never guessed, stays on root');
    assert.match(read('scripts/ci/safe-auto-commit.js'), /chain-route-new-couples\.js/);
  });

  it('flaky retry only for the heap-flake allowlist', () => {
    const { flakyRetryFiles } = require('../../tools/ci/node-test-strict.js');
    assert.deepStrictEqual(flakyRetryFiles(['test/critical/p3065-flow-storm-soak.test.js::x']), ['test/critical/p3065-flow-storm-soak.test.js']);
    assert.strictEqual(flakyRetryFiles(['test/critical/p3065-flow-storm-soak.test.js::x', 'test/other.test.js::y']), null);
    const m = require('../../tools/ci/mocha-flaky-retry.js');
    assert.deepStrictEqual(m.failingTitles('  1 passing\n  2 failing\n\n  1) P2914 memory: a\n       x\n  2) P2914 memory: a\n'), ['P2914 memory: a']);
    assert.strictEqual(m.flakyFilesFor(['Other'], { 'test/p2914-memory-leak.test.js': ['P2914 memory'] }), null);
    assert.ok(m.STALE.includes('.homeybuild'));
    for (const f of ['tools/ci/mocha-flaky-retry.js', 'tools/ci/node-test-strict.js']) assert.match(read(f), /P3243b[\s\S]*delete process\.env\[k\]/, `${f} strips hook GIT_* env`);
  });

  it('CI, pre-push and publish workflows are wired', () => {
    const self = read('.github/workflows/ci-self-check.yml');
    for (const s of ['driver-signature-dup-gate.js', 'driver-continuations-check.js', 'manifest-budget.js --gate', 'zero-parasite-plan.js']) {assert.ok(self.includes(s), s);}
    assert.match(read('.github/workflows/node22-tests.yml'), /mocha-flaky-retry\.js/);
    assert.match(read('.githooks/pre-push'), /mocha-flaky-retry\.js --timeout=20000/);
    assert.match(read('.githooks/pre-push'), /manifest-budget\.js --gate/);
    for (const w of ['auto-publish-on-push.yml', 'publish-stable.yml', 'bastien-publish.yml']) {assert.match(read(`.github/workflows/${w}`), /manifest-budget\.js/, w);}
    assert.match(read('.github/workflows/publish-hold-bisect.yml'), /manifest-trend\.jsonl/);
  });
});
