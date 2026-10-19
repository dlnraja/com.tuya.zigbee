'use strict';

/**
 * P2893 — the transient AggregateError/transport retry must re-dispatch with the same
 * release_held input, otherwise a held-driver bisect retries different content.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');

const WF = path.join(__dirname, '..', '..', '.github/workflows/auto-publish-on-push.yml');

describe('P2893 transient retry keeps release_held', () => {
  it('every transient_retry dispatch also passes release_held', () => {
    const lines = fs.readFileSync(WF, 'utf8').split('\n').filter((l) => /gh workflow run auto-publish-on-push\.yml/.test(l) && /transient_retry=/.test(l));
    assert.ok(lines.length >= 1, 'retry dispatch present');
    for (const l of lines) assert.ok(/-f release_held="\$\{PUBLISH_HOLD_RELEASE:-\}"/.test(l), l.trim());
  });

  it('PUBLISH_HOLD_RELEASE comes from the release_held input', () => {
    assert.ok(/PUBLISH_HOLD_RELEASE: \$\{\{ github\.event\.inputs\.release_held \|\| '' \}\}/.test(fs.readFileSync(WF, 'utf8')));
  });
});
