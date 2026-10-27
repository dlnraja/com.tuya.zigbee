'use strict';
// P3082: on bastien-home the personal-data guard (P3074) and the stray-file guard (P3081) run in their own
// minimal workflow, because code-quality.yml only triggers on master/main/stable-v5.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const Y = fs.readFileSync(path.join(ROOT, '.github/workflows/bastien-repo-guards.yml'), 'utf8');

describe('P3082 bastien repo guards workflow', () => {
  it('triggers on push and pull_request to bastien-home only', () => {
    const on = Y.slice(Y.indexOf('\non:'), Y.indexOf('\ndefaults:'));
    assert.match(on, /push:\n\s+branches: \[bastien-home\]/);
    assert.match(on, /pull_request:\n\s+branches: \[bastien-home\]/);
    assert.ok(!/master|stable-v5|schedule/.test(on));
  });

  it('read-only token, job timeout, concurrency group', () => {
    assert.match(Y, /\npermissions:\n\s+contents: read\n/);
    assert.ok(!/write/.test(Y.slice(Y.indexOf('\npermissions:'), Y.indexOf('\nconcurrency:'))));
    assert.match(Y, /\nconcurrency:\n\s+group: bastien-repo-guards-\$\{\{ github\.ref \}\}/);
    assert.match(Y, /timeout-minutes: \d+/);
  });

  it('runs exactly the two guards and nothing else (no installs, no other checks)', () => {
    const runs = [...Y.matchAll(/^\s+run: (.+)$/gm)].map((m) => m[1].trim());
    assert.deepStrictEqual(runs, ['node tools/ci/personal-data-guard.js', 'node scripts/ci/stray-file-gate.cjs']);
    for (const f of ['tools/ci/personal-data-guard.js', 'scripts/ci/stray-file-gate.cjs']) { assert.ok(fs.existsSync(path.join(ROOT, f)), f); }
  });
});
