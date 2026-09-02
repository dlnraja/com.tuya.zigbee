'use strict';

/**
 * P2394 — GitHub humanize / no AI-slop auto comments
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const ROOT = path.join(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P2394 — GitHub humanize', () => {
  it('auto-reopen does not createComment', () => {
    const src = read('.github/workflows/auto-reopen-on-comment.yml');
    assert.ok(src.includes('no auto-comment') || src.includes('P2394'));
    assert.ok(!src.includes('automatically reopened'));
    assert.ok(!/createComment\s*\(/.test(src));
  });

  it('diag-resolver refuses comments unless GITHUB_RESOLVER_COMMENT=1', () => {
    const src = read('.github/scripts/diagnostic-auto-resolver.js');
    assert.ok(src.includes('GITHUB_RESOLVER_COMMENT'));
    assert.ok(src.includes('P2394'));
    assert.ok(src.includes('Hey — I think this fingerprint'));
    assert.ok(!/return TAG\+"\\n### Auto-resolved/.test(src));
  });

  it('handle-issue-comments is label-only by default', () => {
    const src = read('.github/scripts/handle-issue-comments.js');
    assert.ok(src.includes('GITHUB_ISSUE_AUTO_COMMENT'));
    assert.ok(src.includes('never auto-post') || src.includes('labels only'));
    assert.ok(!src.includes('Thank you for providing diagnostics'));
  });

  it('gmail-diagnostics forces resolver DRY_RUN', () => {
    const src = read('.github/workflows/gmail-diagnostics.yml');
    assert.ok(src.includes('GITHUB_RESOLVER_COMMENT'));
    assert.ok(/DRY_RUN:\s*"true"/.test(src));
  });
});
