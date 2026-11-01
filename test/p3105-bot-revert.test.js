'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');
const r = require('../scripts/autonomy/bot-revert');
const learn = require('../scripts/ci/autonomy-learn');

const bot = { author: 'github-actions[bot]', subject: 'chore: x [skip ci]' };
const ok = { commit: bot, parentGreen: true, alreadyReverted: false, isMerge: false, paused: false, ledgerOk: true };

describe('P3105 bot revert on red', () => {
  it('reverts only a bot commit with a green parent', () => assert.strictEqual(r.shouldRevert(ok), 'revert'));
  it('never touches human commits, merges, reverted, red-parent, paused, over-budget', () => {
    assert.strictEqual(r.shouldRevert({ ...ok, commit: { author: 'dlnraja', subject: 'fix: y' } }), 'human-commit');
    assert.strictEqual(r.shouldRevert({ ...ok, isMerge: true }), 'merge');
    assert.strictEqual(r.shouldRevert({ ...ok, alreadyReverted: true }), 'already-reverted');
    assert.strictEqual(r.shouldRevert({ ...ok, parentGreen: false }), 'parent-not-green');
    assert.strictEqual(r.shouldRevert({ ...ok, paused: true }), 'paused');
    assert.strictEqual(r.shouldRevert({ ...ok, ledgerOk: false }), 'ledger-limit');
  });
  it('[auto:...] tag counts as bot commit', () => assert.ok(r.isBotCommit({ author: 'x', subject: 'a [auto:forum-ledger]' })));
  it("'revert' is a kill-switchable feature", () => {
    assert.ok(learn.FEATURES.includes('revert'));
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-'));
    fs.mkdirSync(path.join(root, 'config'));
    assert.strictEqual(learn.paused(root, 'revert'), false);
    fs.writeFileSync(path.join(root, 'config', 'autonomy-paused.revert'), '');
    assert.strictEqual(learn.paused(root, 'revert'), true);
  });
  it('workflow: master only, push-triggered runs, guard + retry helper, no force', () => {
    const src = fs.readFileSync(path.join(__dirname, '../.github/workflows/bot-revert-on-red.yml'), 'utf8');
    const y = yaml.load(src);
    assert.deepStrictEqual(y.on.workflow_run.branches, ['master']);
    assert.ok(/bot-commit-guard\.sh/.test(src) && /git-push-retry\.sh/.test(src));
    assert.ok(!/--force|push -f|--no-verify/.test(src));
    assert.ok(y.jobs.revert['timeout-minutes'] <= 10 && y.concurrency);
  });
});
