'use strict';
// P2887: the final gate + retry decision also runs when the publish step failed after an upload.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

describe('P2887 final gate after a failed publish step', () => {
  const y = fs.readFileSync(path.join(ROOT, '.github/workflows/auto-publish-on-push.yml'), 'utf8');
  const i = y.indexOf('- name: Athom final state gate (red unless Test)');
  // P3099: the step grew past 4000 chars (P3095 verdict artifact), so slice to the next step instead of a fixed window.
  const next = i >= 0 ? y.indexOf('\n      - name: ', i + 10) : -1;
  const block = y.slice(i, next > i ? next : i + 12000);
  it('runs on publish success and on publish failure', () => {
    assert.ok(i > 0);
    assert.match(block, /if: always\(\) && \(steps\.pub\.outcome == 'success' \|\| steps\.pub\.outcome == 'failure'\)/);
  });
  it('still judges the uploaded version and still fails red unless Test', () => {
    assert.match(block, /HOMEY_EXPECTED_VERSION: \$\{\{ steps\.info\.outputs\.version \}\}/);
    assert.match(block, /assert-athom-final\.js/);
    assert.match(block, /exit 1/);
  });
  it('the retry decision skips when Athom has no build for the version (pre-upload error)', () => {
    const { decide } = require('../../.github/scripts/transient-publish-retry.js');
    const d = decide({ version: '9.9.9', builds: [], retryCount: 0 });
    assert.strictEqual(d.retry, false);
    assert.match(d.reason, /no Athom build/);
  });
});
