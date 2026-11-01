'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const d = require('../scripts/autonomy/autonomy-digest');

describe('P3103 autonomy weekly digest', () => {
  it('counts only the last 7 days, red first', () => {
    const since = new Date('2026-10-25T00:00:00Z');
    const rows = d.summarize([
      { workflowName: 'A', conclusion: 'success', createdAt: '2026-10-30T00:00:00Z' },
      { workflowName: 'B', conclusion: 'failure', createdAt: '2026-10-30T00:00:00Z' },
      { workflowName: 'B', conclusion: 'failure', createdAt: '2026-10-01T00:00:00Z' },
    ], since);
    assert.deepStrictEqual(rows[0], ['B', { ok: 0, red: 1 }]);
  });
  it('body escapes table pipes and lists kill switches', () => {
    const b = d.body({ rows: [['x|y', { ok: 1, red: 2 }]], crash: 1, reverts: 0, ledger: { total: 3, promoted: 1 }, paused: ['autonomy-paused.revert'], week: '2026-11-02' });
    assert.ok(b.includes('| x/y | 1 | 2 |') && b.includes('autonomy-paused.revert'));
  });
  it('workflow is weekly, least-privilege, bounded, edits one issue', () => {
    const y = yaml.load(fs.readFileSync(path.join(__dirname, '../.github/workflows/autonomy-digest.yml'), 'utf8'));
    assert.deepStrictEqual(y.permissions, { contents: 'read', actions: 'read', issues: 'write' });
    assert.ok(y.jobs.digest['timeout-minutes'] <= 10 && y.concurrency);
    assert.strictEqual(y.env.AI_ALLOW_REMOTE, 'false');
  });
});
