'use strict';
// P3025: the hygiene ratchet catches each regression kind and accepts the committed baseline.
const { describe, it, before, after } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { scan, compare, jobsWithoutTimeout } = require('../../scripts/ci/workflow-hygiene-gate');

const GATE = path.resolve(__dirname, '../../scripts/ci/workflow-hygiene-gate.js');
const ROOT = path.resolve(__dirname, '../..');
const WF = (body) => `name: t\non: push\njobs:\n  a:\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n    steps:\n${body}`;

describe('P3025 workflow hygiene gate', function () {
  let dir;
  before(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p3025h-')); fs.mkdirSync(path.join(dir, '.github/workflows'), { recursive: true }); });
  after(() => { fs.rmSync(dir, { recursive: true, force: true }); });
  const write = (name, t) => fs.writeFileSync(path.join(dir, '.github/workflows', name), t);
  const run = (...a) => spawnSync(process.execPath, [GATE, `--root=${dir}`, ...a], { encoding: 'utf8' });

  it('committed repo baseline is green', () => {
    const r = spawnSync(process.execPath, [GATE, `--root=${ROOT}`], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, r.stdout + r.stderr);
  });

  it('flags unpinned, node20 SHA, node-version < 22, raw push, missing timeout', () => {
    write('bad.yml', 'name: b\non: push\njobs:\n  x:\n    runs-on: ubuntu-latest\n    steps:\n'
      + '      - uses: actions/checkout@v4\n'
      + '      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4\n        with:\n          node-version: 20\n'
      + '      - run: git push origin HEAD:master\n');
    const rules = scan(dir).map((f) => f.rule).sort();
    assert.deepStrictEqual(rules, ['no-timeout', 'node-runtime', 'node20-action', 'raw-push', 'unpinned']);
    assert.strictEqual(run().status, 1);
  });

  it('accepts debt once baselined, fails when a file gains a raw push, ignores the shared helper', () => {
    assert.strictEqual(run('--update-baseline').status, 0);
    assert.strictEqual(run().status, 0);
    write('ok.yml', WF('      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5.1.0\n      - run: bash .github/scripts/git-push-retry.sh --branch master\n'));
    assert.strictEqual(run().status, 0, run().stdout);
    fs.appendFileSync(path.join(dir, '.github/workflows/bad.yml'), '      - run: git push origin HEAD:stable-v5\n');
    const r = run();
    assert.strictEqual(r.status, 1); assert.match(r.stdout, /raw-push/);
  });

  it('reusable-workflow jobs need no timeout; compare reports fixed items', () => {
    assert.deepStrictEqual(jobsWithoutTimeout('jobs:\n  call:\n    uses: ./.github/workflows/x.yml\n  b:\n    runs-on: x\n'), ['b']);
    const { fixed } = compare([], { findings: [{ rule: 'unpinned', file: 'f', key: 'k' }] });
    assert.strictEqual(fixed.length, 1);
  });
});
