'use strict';
// P3397: Auto-Publish 45098864644 (23/11 03:12 Paris) deferred "CI missing": the P3036 gate
// dispatched unified-ci with GITHUB_TOKEN, every job was skipped by the bot-actor guard, so the
// gated [skip ci] tip could never get a CI verdict.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

describe('P3397 unified-ci runs when the publish gate dispatches it', () => {
  const wf = fs.readFileSync(path.join(__dirname, '..', '..', '.github', 'workflows', 'unified-ci.yml'), 'utf8');
  it('validate job accepts workflow_dispatch even from github-actions[bot]', () => {
    const m = wf.match(/\n  validate:\n[\s\S]*?\n    if: ([^\n]+)/);
    assert.ok(m, 'validate job if: line');
    assert.ok(/github\.event_name == 'workflow_dispatch' \|\|/.test(m[1]), m[1]);
    assert.ok(/github\.actor != 'github-actions\[bot\]'/.test(m[1]), 'push/PR bot guard kept');
  });
  it('workflow_dispatch trigger is still declared', () => {
    assert.ok(/\n  workflow_dispatch:/.test(wf));
  });
});
