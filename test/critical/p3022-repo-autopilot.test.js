'use strict';
// P3022: repo autopilot selection + classification rules (scripts/lib/repo-autopilot-rules.js) and the
// workflow contract (no comment, no issue close, GITHUB_TOKEN only, dry_run, bounded).
const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const R = require('../../scripts/lib/repo-autopilot-rules');

const ROOT = path.join(__dirname, '..', '..');
const OWNER = 'dlnraja';
const NOW = Date.parse('2026-10-25T00:00:00Z');
const d = (days) => new Date(NOW - days * 864e5).toISOString();
const botPr = (o = {}) => ({ number: 573, headRef: 'bot/homey-knowledge-20261019', author: 'app/github-actions', authorType: 'Bot', baseRef: 'master', createdAt: d(6), state: 'open', labels: [], ...o });
const green = [{ status: 'completed', conclusion: 'success' }];

describe('P3022 PR origin and kind', () => {
  it('derives the automation kind from the branch', () => {
    assert.strictEqual(R.prKind('bot/homey-knowledge-20261019'), 'bot/homey-knowledge');
    assert.strictEqual(R.prKind('bot/homey-knowledge-20261026'), 'bot/homey-knowledge');
    assert.strictEqual(R.prKind('ai/monthly-audit-2026-10'), 'ai/monthly-audit');
    assert.strictEqual(R.prKind('auto/driver-maintenance'), 'auto/driver-maintenance');
  });
  it('separates bot, owner and external PRs', () => {
    assert.strictEqual(R.prOrigin(botPr(), OWNER), 'bot');
    assert.strictEqual(R.prOrigin(botPr({ author: OWNER, authorType: 'User', headRef: 'auto/driver-maintenance' }), OWNER), 'bot');
    assert.strictEqual(R.prOrigin(botPr({ author: OWNER, authorType: 'User', headRef: 'fix/stable-soil' }), OWNER), 'human');
    assert.strictEqual(R.prOrigin(botPr({ author: OWNER, authorType: 'User', headRef: 'codex/x' }), OWNER), 'human');
    assert.strictEqual(R.prOrigin(botPr({ author: 'martinheie-ui', authorType: 'User', headRef: 'feat/mc101z', isCrossRepository: true }), OWNER), 'external');
    // A fork branch named bot/* is still an external contribution.
    assert.strictEqual(R.prOrigin(botPr({ author: 'someone', authorType: 'User', isCrossRepository: true }), OWNER), 'external');
    assert.strictEqual(R.prOrigin(botPr({ author: 'someone', authorType: 'User', headRef: 'patch-1' }), OWNER), 'external');
  });
});

describe('P3022 decidePr', () => {
  const base = { owner: OWNER, now: NOW };
  it('never closes human or external PRs, whatever their age', () => {
    const human = botPr({ author: OWNER, authorType: 'User', headRef: 'fix/old', createdAt: d(400) });
    assert.strictEqual(R.decidePr(human, { ...base, behindBy: 5000 }).action, 'skip');
    const ext = botPr({ author: 'contrib', authorType: 'User', headRef: 'feat/x', isCrossRepository: true, createdAt: d(400) });
    assert.strictEqual(R.decidePr(ext, { ...base, behindBy: 5000 }).action, 'analyse');
  });
  it('keep/pinned labels freeze bot PRs too', () => {
    assert.strictEqual(R.decidePr(botPr({ labels: [{ name: 'Pinned' }] }), { ...base, behindBy: 9999, all: [] }).action, 'skip');
    assert.strictEqual(R.decidePr(botPr({ labels: ['keep'] }), { ...base, behindBy: 9999 }).action, 'skip');
  });
  it('closes a bot PR superseded by a newer open or merged one of the same kind', () => {
    const old = botPr();
    const all = [old, botPr({ number: 580, headRef: 'bot/homey-knowledge-20261026', createdAt: d(0) })];
    const r = R.decidePr(old, { ...base, all, behindBy: 3, checks: green });
    assert.strictEqual(r.action, 'close');
    assert.strictEqual(r.supersededBy, 580);
    // A newer one that was closed unmerged does not supersede.
    all[1].state = 'closed';
    assert.notStrictEqual(R.decidePr(old, { ...base, all, behindBy: 3, checks: green }).action, 'close');
    // Another kind never supersedes.
    assert.strictEqual(R.supersededBy(old, [old, botPr({ number: 581, headRef: 'bot/other-20261026', createdAt: d(0) })]), null);
  });
  it('closes a stale bot PR only when both behind and old', () => {
    assert.strictEqual(R.decidePr(botPr({ createdAt: d(10) }), { ...base, behindBy: 408 }).action, 'close');
    assert.notStrictEqual(R.decidePr(botPr({ createdAt: d(3) }), { ...base, behindBy: 408 }).action, 'close');
    assert.notStrictEqual(R.decidePr(botPr({ createdAt: d(30) }), { ...base, behindBy: 100 }).action, 'close');
    assert.strictEqual(R.decidePr(botPr({ createdAt: d(30) }), { ...base, behindBy: 100, maxBehind: 50 }).action, 'close');
  });
  it('merges a current bot PR only with green gates and no workflow file', () => {
    assert.strictEqual(R.decidePr(botPr(), { ...base, behindBy: 2, checks: green, files: ['docs/knowledge/X.md'] }).action, 'merge');
    assert.strictEqual(R.decidePr(botPr(), { ...base, behindBy: 2, checks: green, files: ['.github/workflows/a.yml'] }).action, 'hold');
    assert.strictEqual(R.decidePr(botPr(), { ...base, behindBy: 2, checks: [{ status: 'completed', conclusion: 'failure' }] }).action, 'hold');
    assert.strictEqual(R.decidePr(botPr(), { ...base, behindBy: 2, checks: [{ status: 'in_progress' }] }).action, 'hold');
    assert.strictEqual(R.decidePr(botPr({ mergeable: false }), { ...base, behindBy: 2, checks: green }).action, 'hold');
    const none = R.decidePr(botPr(), { ...base, behindBy: 2, checks: [] });
    assert.strictEqual(none.action, 'hold');
    assert.strictEqual(none.needsLocalGate, true);
    assert.strictEqual(R.decidePr(botPr(), { ...base, behindBy: 2, checks: [], localGate: 'green' }).action, 'merge');
    assert.strictEqual(R.decidePr(botPr(), { ...base, behindBy: 2, checks: green, localGate: 'red' }).action, 'hold');
    assert.strictEqual(R.decidePr(botPr({ baseRef: 'gh-pages' }), { ...base, behindBy: 2, checks: green }).action, 'hold');
  });
});

describe('P3022 branchDeletable', () => {
  const bot = [{ author: 'github-actions[bot]', committer: 'web-flow' }];
  it('never deletes protected or non-bot branches', () => {
    for (const ref of ['master', 'stable-v5', 'bastien-home', 'gh-pages', 'fix/x', 'auto/driver-maintenance', 'codex/y']) {
      assert.strictEqual(R.branchDeletable(ref, { prState: 'closed', merged: true, commits: [] }).ok, false, ref);
    }
  });
  it('needs a closed PR, supersession/merge/abandonment and bot-only commits', () => {
    const ref = 'bot/homey-knowledge-20261019';
    assert.strictEqual(R.branchDeletable(ref, { prState: 'open', superseded: true, commits: bot }).ok, false);
    assert.strictEqual(R.branchDeletable(ref, { prState: 'closed', commits: bot, behindBy: 10 }).ok, false);
    assert.strictEqual(R.branchDeletable(ref, { prState: 'closed', superseded: true, commits: bot }).ok, true);
    assert.strictEqual(R.branchDeletable(ref, { prState: 'closed', merged: true, commits: [] }).ok, true);
    assert.strictEqual(R.branchDeletable(ref, { prState: 'closed', commits: bot, behindBy: 408 }).ok, true);
    assert.strictEqual(R.branchDeletable(ref, { prState: 'closed', superseded: true, commits: [{ author: OWNER, committer: OWNER }] }).ok, false);
    assert.strictEqual(R.branchDeletable(ref, { prState: 'closed', superseded: true, commits: null }).ok, false);
    assert.strictEqual(R.branchDeletable(ref, { prState: 'closed', superseded: true, commits: bot, labels: ['keep'] }).ok, false);
  });
});

describe('P3022 issue classification', () => {
  const index = {
    byMfr: new Map([['_tze200_rxq4iti9', new Set(['device_radiator_valve'])], ['_tz3000_known123', new Set(['switch_2gang'])]]),
    byDriver: new Map([['device_radiator_valve', { mfrs: new Set(['_tze200_rxq4iti9']), pids: new Set(['TS0601']) }],
      ['switch_2gang', { mfrs: new Set(['_tz3000_known123']), pids: new Set(['TS0002']) }]]),
  };
  it('extracts couples, DPs, diag ids and symptoms', () => {
    const x = R.extractIssue('Model TS0601\nmanufacturer _TZE200_rxq4iti9\n\nbattery DP 35 never reports, dp:2 shows 0\nlog 0f3b2c1d-1111-2222-3333-444455556666');
    assert.deepStrictEqual(x.couples.map((c) => [c.mfr, c.pid]), [['_TZE200_rxq4iti9', 'TS0601']]);
    assert.deepStrictEqual(x.dps, [35, 2]);
    assert.strictEqual(x.diagIds.length, 1);
    assert.ok(x.symptoms.includes('battery'));
  });
  it('classifies the four outcomes plus tracking', () => {
    const c = (body, extra = {}) => R.classifyIssue({ number: 1, title: 't', body, author: 'u', labels: [], ...extra }, index, extra.opt);
    assert.strictEqual(c('_TZE200_rxq4iti9 TS0601 works now').cls, 'already-supported');
    assert.strictEqual(c('_TZE200_rxq4iti9 TS0601 battery never reports').cls, 'fix-in-code');
    assert.strictEqual(R.classifyIssue({ number: 1, body: '_TZE200_rxq4iti9 TS0601 not updating', labels: [] }, index, { fixCommits: ['abc'] }).cls, 'already-supported');
    assert.strictEqual(c('_TZ3000_known123 TS0012 one gang').cls, 'fix-in-code');
    const n = c('new device _TZ3000_newcoupl TS0001');
    assert.strictEqual(n.cls, 'new-couple');
    assert.strictEqual(n.actionable, true);
    assert.strictEqual(c('my plug does not work').cls, 'needs-info');
    assert.strictEqual(R.classifyIssue({ number: 1, body: 'no id', labels: [] }, index, { fixCommits: ['abc'] }).cls, 'already-supported');
    assert.strictEqual(c('_TZ3000_newcoupl TS0001', { labels: [{ name: 'bot-digest' }] }).cls, 'tracking');
  });
  it('drafts a reply for every reporter class (report only)', () => {
    for (const body of ['_TZE200_rxq4iti9 TS0601', '_TZE200_rxq4iti9 TS0601 battery wrong', '_TZ3000_newcoupl TS0001', 'nothing']) {
      const r = R.classifyIssue({ number: 1, body, author: 'u', labels: [] }, index);
      assert.ok(R.draftReply(r).startsWith('@u'), body);
    }
  });
  it('only exact new couples become strict-apply leads, merged additively', () => {
    assert.strictEqual(R.leadFromCouple({ mfr: '_TZ3000_newcoupl', pid: null, status: 'new' }, 'u', 'd'), null);
    assert.strictEqual(R.leadFromCouple({ mfr: '_TZ3000_known123', pid: 'TS0002', status: 'supported' }, 'u', 'd'), null);
    const l = R.leadFromCouple({ mfr: '_TZ3000_newcoupl', pid: 'TS0001', status: 'new' }, 'https://x/issues/9', '2026-10-25');
    assert.deepStrictEqual(l.knownDrivers, []);
    assert.ok(l.snippet.includes('_TZ3000_newcoupl') && l.snippet.includes('TS0001'));
    const prev = [{ mfr: '_TZ3000_NEWCOUPL', url: 'https://x/issues/9', keep: 1 }];
    const m = R.mergeLeads(prev, [l, l]);
    assert.strictEqual(m.added, 0);
    assert.strictEqual(m.leads[0].keep, 1);
    assert.strictEqual(R.mergeLeads([], [l, l, null]).added, 1);
  });
  it('keeps credits/ledger commits out of fix links', () => {
    assert.strictEqual(R.isFixSubject('chore(P3020): credit 80 GitHub issue reporters'), false);
    assert.strictEqual(R.isFixSubject('docs: issues sweep #560'), false);
    assert.strictEqual(R.isFixSubject('fix(P2867): tuya.dataQuery #560'), true);
    assert.strictEqual(R.isFixSubject('feat(P3018b): one couple = one driver'), true);
  });
});

describe('P3022 external PR analysis', () => {
  it('reads couples from added compose lines only', () => {
    const files = [{ filename: 'drivers/dimmer_1_gang/driver.compose.json', patch: '@@\n-  "_TZ3000_removed1",\n+  "_TZ3000_added123",\n+  "TS110E",\n' },
      { filename: 'test/x.test.js', patch: '+ok' }, { filename: 'README.md', patch: '+_TZ3000_inreadme' }];
    const x = R.analyseExternal({ number: 558, author: 'c', headRef: 'feat' }, files, { byMfr: new Map(), byDriver: new Map() });
    assert.deepStrictEqual(x.couples.map((c) => [c.driver, c.mfr, c.pid, c.status]), [['dimmer_1_gang', '_TZ3000_added123', 'TS110E', 'new']]);
    assert.strictEqual(x.tests, 1);
    assert.strictEqual(x.newCouples, 1);
  });
});

describe('P3022 workflow contract', () => {
  const wf = yaml.load(fs.readFileSync(path.join(ROOT, '.github/workflows/repo-autopilot.yml'), 'utf8'));
  const src = fs.readFileSync(path.join(ROOT, 'scripts/ci/repo-autopilot.js'), 'utf8');
  it('is daily + dispatch with dry_run defaulting to true, minimal permissions', () => {
    assert.ok(wf.on.schedule && wf.on.schedule.length === 1);
    assert.strictEqual(wf.on.workflow_dispatch.inputs.dry_run.default, true);
    assert.strictEqual(wf.permissions.issues, 'read');
    assert.ok(!('actions' in wf.permissions) && !('workflows' in wf.permissions));
    assert.strictEqual(wf.env.SAFE_AUTO_COMMIT_NO_COMMENT, '1');
    assert.ok(!/secrets\.(?!GITHUB_TOKEN)/.test(fs.readFileSync(path.join(ROOT, '.github/workflows/repo-autopilot.yml'), 'utf8')));
  });
  it('never posts comments and never closes issues', () => {
    assert.ok(!/\/comments`,\s*\{\s*method:\s*'(POST|PATCH)'/.test(src));
    assert.ok(!/issues\/\$\{[^}]+\}`,\s*\{\s*method:\s*'PATCH'/.test(src));
    assert.ok(/merge_method: 'merge'/.test(src) && !/force/.test(src.replace(/--force/g, '')));
  });
  it('safe-auto-commit honours SAFE_AUTO_COMMIT_NO_COMMENT', () => {
    assert.ok(/SAFE_AUTO_COMMIT_NO_COMMENT === '1'/.test(fs.readFileSync(path.join(ROOT, 'scripts/ci/safe-auto-commit.js'), 'utf8')));
  });
  it('Batch Analyze & Respond schedule stays dry-run (shadow)', () => {
    const t = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-close-supported.yml'), 'utf8');
    assert.ok(/DRY_RUN: \$\{\{ github\.event_name == 'schedule' && 'true'/.test(t));
  });
});
