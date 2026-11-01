'use strict';
// P3199: a rebase conflict on data/progress/ledger.json between two auto-commit workers is merged, not dropped.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pushWithRetry } = require('../../scripts/ci/push-with-retry');
const { mergeJson } = require('../../scripts/ci/json-ledger-merge');

function g(cwd, ...a) { return spawnSync('git', a, { cwd, encoding: 'utf8' }); }
function init(dir) { g(dir, 'config', 'user.name', 't'); g(dir, 'config', 'user.email', 's@t'); g(dir, 'config', 'commit.gpgsign', 'false'); }
const L = (items) => `${JSON.stringify({ version: 1, updated: 'x', items }, null, 1)}\n`;

describe('P3199 ledger rebase JSON merge', function () {
  this.timeout(20000);
  it('mergeJson unions keys and arrays, replayed value wins on scalars', () => {
    assert.deepStrictEqual(mergeJson({ a: 1, l: [1], o: { x: 1 } }, { a: 2, b: 3, l: [1, 2], o: { y: 2 } }), { a: 2, b: 3, l: [1, 2], o: { x: 1, y: 2 } });
  });

  function setup() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p3199-'));
    const bare = path.join(root, 'r.git'); g(root, 'init', '-q', '--bare', '-b', 'main', bare);
    const a = path.join(root, 'a'); g(root, 'clone', '-q', bare, a); init(a); g(a, 'checkout', '-q', '-b', 'main');
    fs.mkdirSync(path.join(a, 'data/progress'), { recursive: true });
    fs.writeFileSync(path.join(a, 'data/progress/ledger.json'), L({ base: { s: 'open' } }));
    fs.writeFileSync(path.join(a, 'README'), 'r\n');
    g(a, 'add', '-A'); g(a, 'commit', '-qm', 'base'); g(a, 'push', '-q', 'origin', 'main');
    const b = path.join(root, 'b'); g(root, 'clone', '-q', '-b', 'main', bare, b); init(b);
    return { root, a, b };
  }

  it('resolves a ledger.json conflict and pushes both workers findings', async () => {
    const { root, a, b } = setup();
    fs.writeFileSync(path.join(a, 'data/progress/ledger.json'), L({ base: { s: 'open' }, A1: { s: 'done' } }));
    g(a, 'commit', '-qam', 'A'); g(a, 'push', '-q', 'origin', 'main');
    fs.writeFileSync(path.join(b, 'data/progress/ledger.json'), L({ base: { s: 'done' }, B1: { s: 'open' } }));
    g(b, 'commit', '-qam', 'B');
    const r = await pushWithRetry({ branch: 'main', cwd: b, attempts: 2, sleep: async () => {} });
    assert.strictEqual(r.reason, 'pushed', r.details);
    const j = JSON.parse(g(b, 'show', 'origin/main:data/progress/ledger.json').stdout);
    assert.deepStrictEqual(Object.keys(j.items).sort(), ['A1', 'B1', 'base']);
    assert.strictEqual(j.items.base.s, 'done');
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('still aborts on a conflict outside ledger JSON', async () => {
    const { root, a, b } = setup();
    fs.writeFileSync(path.join(a, 'README'), 'A\n'); g(a, 'commit', '-qam', 'A'); g(a, 'push', '-q', 'origin', 'main');
    fs.writeFileSync(path.join(b, 'README'), 'B\n'); g(b, 'commit', '-qam', 'B');
    const r = await pushWithRetry({ branch: 'main', cwd: b, attempts: 2, sleep: async () => {} });
    assert.strictEqual(r.reason, 'conflict');
    assert.match(r.details, /non-mergeable: README/);
    assert.strictEqual(g(b, 'status', '--porcelain').stdout.trim(), '');
    fs.rmSync(root, { recursive: true, force: true });
  });
});
