'use strict';
// P3363 / t998u: the weekly coherence workflow stays free, kill-switched, bounded, and issue-free.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const WF = path.join(ROOT, '.github/workflows/store-text-coherence.yml');
const SSOT = path.join(ROOT, 'config/architecture/store-text-coherence-ssot.json');

describe('P3363 coherence workflow', () => {
  const yml = fs.readFileSync(WF, 'utf8');
  const ssot = JSON.parse(fs.readFileSync(SSOT, 'utf8'));

  it('is scheduled weekly, has workflow_dispatch, a concurrency group and a kill switch', () => {
    assert.match(yml, /cron:\s*'10 5 \* \* 2'/);
    assert.match(yml, /workflow_dispatch:/);
    assert.match(yml, /concurrency:\s*\n\s*group:\s*store-text-coherence/);
    assert.match(yml, /vars\.STORE_TEXT_COHERENCE_DISABLED\s*!=\s*'true'/);
    assert.match(yml, /timeout-minutes:\s*25/);
    assert.match(yml, /branch:\s*\[master,\s*stable-v5,\s*bastien-home\]/);
  });

  it('uses GITHUB_TOKEN only and never opens an issue', () => {
    assert.doesNotMatch(yml, /secrets\.(GH_PAT|HOMEY|OPENAI|GEMINI)/);
    assert.match(yml, /github\.token/);
    assert.match(yml, /SAFE_AUTO_COMMIT_NO_COMMENT:\s*'1'/);
    assert.match(yml, /upload-artifact/);
    assert.match(yml, /safe-auto-commit\.js/);
  });

  it('the SSOT documents the same kill switch, token and id-preservation rule', () => {
    assert.equal(ssot.kill_switch, 'STORE_TEXT_COHERENCE_DISABLED');
    assert.equal(ssot.token, 'GITHUB_TOKEN only');
    assert.equal(ssot.auto_commit.never_remove_ids, true);
    assert.equal(ssot.auto_commit.issue_comments, false);
    assert.ok(ssot.rules.some((r) => /never removed or renamed/i.test(r)));
  });
});
