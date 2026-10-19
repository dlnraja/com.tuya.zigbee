'use strict';
// WHY(P2880, 2026-10-19): the weekly Homey knowledge refresh used to raise `node-version` in every workflow
// (34 files, including node22-tests) and then try to push them. The bot token cannot push workflow files, a
// same-day re-run collided on the branch name, and the Node bump has to stay a reviewed proposal. The tooling
// script is now read-only on .github/workflows and the workflow never stages them.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { proposeNodeBump } = require('../../.github/scripts/homey-tooling-refresh.js');

describe('P2880 homey knowledge refresh — node-version bump is a proposal only', () => {
  it('proposeNodeBump lists lower node-versions and never rewrites the files', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p2870-'));
    const a = "steps:\n  - uses: actions/setup-node@v4\n    with:\n      node-version: '22'\n";
    const b = "steps:\n  - uses: actions/setup-node@v4\n    with:\n      node-version: 24\n";
    fs.writeFileSync(path.join(dir, 'a.yml'), a);
    fs.writeFileSync(path.join(dir, 'b.yml'), b);
    assert.deepEqual(proposeNodeBump(24, dir), ['a.yml']);
    assert.equal(fs.readFileSync(path.join(dir, 'a.yml'), 'utf8'), a);
    assert.equal(fs.readFileSync(path.join(dir, 'b.yml'), 'utf8'), b);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('script has no write path into .github/workflows', () => {
    const src = fs.readFileSync(path.join(ROOT, '.github/scripts/homey-tooling-refresh.js'), 'utf8');
    const fn = src.slice(src.indexOf('function proposeNodeBump'), src.indexOf('async function main'));
    assert.ok(fn.length > 0);
    assert.doesNotMatch(fn, /writeFileSync|appendFileSync/);
  });

  it('workflow never stages workflow files, uses GITHUB_TOKEN, has a backup cron and same-day branch guard', () => {
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/homey-knowledge-refresh.yml'), 'utf8');
    assert.doesNotMatch(wf, /git add[^\n]*\.github\/workflows/);
    assert.doesNotMatch(wf, /secrets\.GH_PAT/);
    assert.match(wf, /refusing to commit them/);
    assert.ok((wf.match(/- cron: /g) || []).length >= 2, 'two schedule slots');
    assert.match(wf, /ls-remote --exit-code --heads origin "\$b"/);
    assert.match(wf, /steps\.guard\.outputs\.skip/);
  });
});
