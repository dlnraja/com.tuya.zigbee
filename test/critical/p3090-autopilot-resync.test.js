'use strict';
// P3090: bot PRs on regenerable data (kb/, market/, bot/) in conflict are re-synced with the base
// (base wins), never force-pushed; anything else in conflict stays on hold.
const { describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const R = require('../../scripts/lib/repo-autopilot-rules');

const base = { number: 1, state: 'open', author: 'app/github-actions', authorType: 'Bot', baseRef: 'master',
  createdAt: new Date().toISOString(), labels: [], mergeable: false, mergeableState: 'dirty' };
const ctx = (files, extra = {}) => ({ owner: 'dlnraja', now: Date.now(), all: [], behindBy: 3, files, checks: [], ...extra });

describe('P3090 autopilot resync', () => {
  it('kb/ data conflict -> resync', () => {
    assert.strictEqual(R.decidePr({ ...base, headRef: 'kb/refresh-20261026' }, ctx(['data/kb/z2m-coverage.json', 'docs/knowledge/KB/people.md'])).action, 'resync');
  });
  it('market/ data conflict -> resync', () => {
    assert.strictEqual(R.decidePr({ ...base, headRef: 'market/couples-20261030' }, ctx(['data/leads/x.json'])).action, 'resync');
  });
  it('code or driver change in conflict -> hold', () => {
    assert.strictEqual(R.decidePr({ ...base, headRef: 'kb/refresh-20261026' }, ctx(['data/kb/a.json', 'drivers/x/driver.compose.json'])).action, 'hold');
    assert.strictEqual(R.decidePr({ ...base, headRef: 'auto/fix-1' }, ctx(['data/a.json'])).action, 'hold');
  });
  it('workflow change never resynced; already resynced -> hold', () => {
    assert.strictEqual(R.decidePr({ ...base, headRef: 'kb/r' }, ctx(['.github/workflows/a.yml'])).action, 'hold');
    assert.strictEqual(R.decidePr({ ...base, headRef: 'kb/r' }, ctx(['data/a.json'], { resynced: true })).action, 'hold');
  });
  it('external fork never resynced', () => {
    assert.strictEqual(R.decidePr({ ...base, author: 'someone', authorType: 'User', isCrossRepository: true, headRef: 'kb/x' }, ctx(['data/a.json'])).action, 'analyse');
  });
  it('script: bounded, plain push, no force', () => {
    const s = fs.readFileSync(path.join(__dirname, '../../scripts/ci/repo-autopilot.js'), 'utf8');
    assert.ok(/resyncs >= 2/.test(s));
    assert.ok(!/force/.test(s.replace(/--force/g, '')) && !/\+refs\/heads|'push', '-f'/.test(s));
  });
});
