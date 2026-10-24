'use strict';
const { describe, it } = require('../_support/dual-runner'); // P3020: same file under node --test and mocha
// P2901: the size telemetry CSV recorded "unknown" for AggregateError failures on master (#3640-#3643).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { classify } = require('../../.github/scripts/athom-retry-policy');
const wf = fs.readFileSync(path.join(__dirname, '../../.github/workflows/auto-publish-on-push.yml'), 'utf8');

describe('P2901 telemetry kind', () => {
  it('classifies the retry decision line', () => {
    assert.strictEqual(classify('[athom-final] OK: v9.0.1562 #3643 processing_failed\n[transient-retry] RETRY: AggregateError (flake check, retry 1/2) on v9.0.1562'), 'AggregateError');
    assert.strictEqual(classify('[transient-retry] skip: retry budget exhausted (2) - AggregateError x2: bisect needed'), 'AggregateError');
  });
  it('records the non-Test CSV row after the retry decision, with the reclassified kind', () => {
    const iOut = wf.indexOf('out=$(node .github/scripts/transient-publish-retry.js)');
    const iRe = wf.indexOf('"$final_out" "$out" | node .github/scripts/athom-retry-policy.js classify');
    const iRec = wf.indexOf('publish-size-telemetry.js record "$([ "$final_rc" -eq 0 ]');
    assert.ok(iOut > 0 && iRe > iOut && iRec > iRe);
  });
});
