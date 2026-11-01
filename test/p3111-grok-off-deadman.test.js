'use strict';
/* eslint-env mocha */
// P3111: dead-man watchdog — every listed workflow exists (or is the in-flight autoreply), windows bounded,
// stale detection correct, workflow minimal-permission + concurrency + timeout, no publish/post.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.join(__dirname, '..');
const D = require('../scripts/ci/grok-off-deadman.js');
const WF = path.join(ROOT, '.github', 'workflows', 'grok-off-deadman.yml');

describe('P3111 grok-off dead-man', () => {
  it('workflow: weekly cron, dispatch, concurrency, timeout, minimal permissions', () => {
    const doc = yaml.load(fs.readFileSync(WF, 'utf8'));
    assert.ok(doc.on.schedule && 'workflow_dispatch' in doc.on);
    assert.ok(doc.concurrency);
    assert.deepStrictEqual(doc.permissions, { contents: 'read', actions: 'read', issues: 'write' });
    assert.ok(doc.jobs.deadman['timeout-minutes'] <= 15);
    const txt = fs.readFileSync(WF, 'utf8');
    assert.ok(!/git push|homey app publish|secrets\.(?!GITHUB_TOKEN)/.test(txt));
  });
  it('duties: windows bounded 1..14 days; listed workflows exist except optional autoreply', () => {
    for (const [, wf, days] of D.DUTIES) {
      assert.ok(days >= 1 && days <= 14, wf);
      if (wf !== 'diag-autoreply-bastien.yml') assert.ok(fs.existsSync(path.join(ROOT, '.github', 'workflows', wf)), wf);
    }
  });
  it('evaluate flags stale, never-run and absent correctly', () => {
    const now = 10 * 86400000;
    const r = D.evaluate([
      { duty: 'a', wf: 'a.yml', maxDays: 3, last: now - 86400000, exists: true },
      { duty: 'b', wf: 'b.yml', maxDays: 3, last: now - 5 * 86400000, exists: true },
      { duty: 'c', wf: 'c.yml', maxDays: 3, last: null, exists: true },
      { duty: 'd', wf: 'd.yml', maxDays: 3, last: null, exists: false },
    ], now).map((x) => x.state);
    assert.deepStrictEqual(r, ['ok', 'STALE', 'STALE', 'absent']);
    assert.ok(D.render(D.evaluate([{ duty: 'a', wf: 'a.yml', maxDays: 3, last: null, exists: true }], now), now).includes('| a | a.yml | never'));
  });
  it('kill switch honoured', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-'));
    assert.strictEqual(D.paused(tmp), false);
    fs.mkdirSync(path.join(tmp, 'config')); fs.writeFileSync(path.join(tmp, 'config', 'autonomy-paused.watch'), '');
    assert.strictEqual(D.paused(tmp), true);
  });
});
