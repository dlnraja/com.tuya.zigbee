'use strict';

/**
 * P3035 — Auto-Fix "Commit fixes" re-syncs app.json from compose before staging.
 * Runs 40147508102 and 40162040962 on master were blocked by the P3025 pre-commit
 * drift gate after auto-fix edited driver.compose.json fingerprints (6 drivers).
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const WF = path.join(ROOT, '.github/workflows/auto-fix-and-publish.yml');

function commitStep(src) {
  const start = src.indexOf('- name: 💾 Commit fixes');
  assert.ok(start >= 0, 'Commit fixes step present');
  const next = src.indexOf('\n      - name:', start + 10);
  return src.slice(start, next < 0 ? undefined : next);
}

describe('P3035 auto-fix commit re-syncs app.json', () => {
  it('runs the drift gate --fix before staging', () => {
    const step = commitStep(fs.readFileSync(WF, 'utf8'));
    const fix = step.indexOf('appjson-compose-drift-gate.js --fix');
    const stage = step.search(/\n\s+stage_auto_fix_paths\n/);
    assert.ok(fix > 0, 'drift --fix call present');
    assert.ok(stage > fix, 'drift --fix runs before stage_auto_fix_paths');
  });

  it('enables the pre-commit hook auto-fix as a second layer', () => {
    const step = commitStep(fs.readFileSync(WF, 'utf8'));
    assert.match(step, /HOOKS_AUTO_FIX_DRIFT:\s*'1'/);
  });

  it('drift gate script exists and supports --fix', () => {
    const src = fs.readFileSync(path.join(ROOT, 'scripts/ci/appjson-compose-drift-gate.js'), 'utf8');
    assert.ok(src.includes('--fix'));
  });
});
