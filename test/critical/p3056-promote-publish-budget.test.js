'use strict';

/**
 * P3056 — the Bastien promote never pushes a target over its publish compaction budget.
 * 2026-10-25: a [skip ci] promote of P3038c sacred pins put master at 16216 and stable-v5 at
 * 15834 combos (> 15500, P3024b). guardPublishBudget restores the sacred-keep file (then the
 * promoted composes) when a lock test turns red, and leaves pre-existing failures alone.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const P = require('../../tools/ci/bastien-promote-upstream');

const SACRED = 'config/architecture/publish-sacred-keep-couples.json';
const COMPOSE = 'drivers/x/driver.compose.json';
const LOCK = 'test/critical/lock.test.js';

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3056-'));
  for (const [rel, body] of [[SACRED, 'new-sacred'], [COMPOSE, 'new-compose'], [LOCK, '//'], ['lib/a.js', 'new-lib']]) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body);
  }
  const originals = new Map([[SACRED, 'old-sacred'], [COMPOSE, 'old-compose'], ['lib/a.js', 'old-lib']]);
  const applied = [{ rel: SACRED }, { rel: COMPOSE }, { rel: 'lib/a.js' }];
  const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
  return { root, originals, applied, read };
}

describe('P3056 promote publish-budget lock', () => {
  it('locks the real P3024b budget test', () => {
    assert.ok(P.PUBLISH_BUDGET_LOCKS.includes('test/critical/p3024b-publish-baseline-couples.test.js'));
    assert.ok(fs.existsSync(path.join(__dirname, 'p3024b-publish-baseline-couples.test.js')));
  });

  it('reverts only the sacred-keep file when that alone restores the budget', () => {
    const { root, originals, applied, read } = setup();
    const run = (r) => fs.readFileSync(path.join(r, SACRED), 'utf8') === 'old-sacred';
    const g = P.guardPublishBudget(root, applied, originals, run, [LOCK]);
    assert.deepEqual(g.reverted.map((x) => [x.rel, x.reason]), [[SACRED, 'publish_budget_lock']]);
    assert.deepEqual(g.kept.map((x) => x.rel), [COMPOSE, 'lib/a.js']);
    assert.equal(read(SACRED), 'old-sacred');
    assert.equal(read(COMPOSE), 'new-compose');
    assert.equal(read('lib/a.js'), 'new-lib');
  });

  it('falls back to reverting promoted composes too, never other files', () => {
    const { root, originals, applied, read } = setup();
    const run = (r) => fs.readFileSync(path.join(r, COMPOSE), 'utf8') === 'old-compose'
      && fs.readFileSync(path.join(r, SACRED), 'utf8') === 'old-sacred';
    const g = P.guardPublishBudget(root, applied, originals, run, [LOCK]);
    assert.deepEqual(g.reverted.map((x) => x.rel).sort(), [COMPOSE, SACRED].sort());
    assert.equal(read('lib/a.js'), 'new-lib');
  });

  it('keeps everything when the budget test already fails without the promote', () => {
    const { root, originals, applied, read } = setup();
    const g = P.guardPublishBudget(root, applied, originals, () => false, [LOCK]);
    assert.equal(g.reverted.length, 0);
    assert.equal(g.kept.length, 3);
    assert.equal(read(SACRED), 'new-sacred');
    assert.equal(read(COMPOSE), 'new-compose');
  });

  it('keeps everything when the budget holds', () => {
    const { root, originals, applied } = setup();
    const g = P.guardPublishBudget(root, applied, originals, () => true, [LOCK]);
    assert.equal(g.reverted.length, 0);
  });
});
