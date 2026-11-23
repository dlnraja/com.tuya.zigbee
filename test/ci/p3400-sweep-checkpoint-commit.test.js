'use strict';
// P3400: johan-thread-intel's "Commit sweep checkpoint" sat behind SCRAPE_COMMIT (P3255e), a repo
// variable that is never set, so the history sweep restarted from the same cursor every day
// (johan 856 / own 241 since 03/11). The checkpoint stats were also stale (527 vs 1612 needs-info).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/johan-thread-intel.yml'), 'utf8');

function step(name) {
  const i = wf.indexOf(`- name: ${name}`);
  assert.ok(i >= 0, `step ${name}`);
  const j = wf.indexOf('\n      - name:', i + 1);
  return wf.slice(i, j < 0 ? undefined : j);
}

describe('P3400 sweep checkpoint commit', () => {
  it('the checkpoint commit step is not gated by SCRAPE_COMMIT', () => {
    const s = step('Commit sweep checkpoint');
    assert.ok(!/SCRAPE_COMMIT/.test(s.replace(/#[^\n]*/g, '')), s);
    assert.ok(/--id=history-sweep/.test(s));
    assert.ok(/digest-guard\.js/.test(s), 'privacy gate kept');
  });
  it('the other scrape commit stays behind SCRAPE_COMMIT', () => {
    assert.ok(/if: vars\.SCRAPE_COMMIT == '1'/.test(step('Commit index (gated)')));
  });
  it('updateCheckpoint recounts stats after moving statuses', () => {
    const { updateCheckpoint } = require('../../scripts/research/lib/provisional');
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3400-'));
    fs.mkdirSync(path.join(root, 'data/leads'), { recursive: true });
    const f = path.join(root, 'data/leads/sweep-checkpoint.json');
    fs.writeFileSync(f, JSON.stringify({
      items: [{ id: 'a', status: 'needs-info' }, { id: 'b', status: 'needs-info' }, { id: 'c', status: 'no-action' }],
      stats: { 'needs-info': 1 },
    }));
    updateCheckpoint(root, [{ id: 'a', verdict: 'covered' }]);
    const cp = JSON.parse(fs.readFileSync(f, 'utf8'));
    assert.deepStrictEqual(cp.stats, { 'already-fixed': 1, 'needs-info': 1, 'no-action': 1 });
  });
});
