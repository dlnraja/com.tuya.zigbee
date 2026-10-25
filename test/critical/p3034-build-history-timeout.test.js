'use strict';
// P3034: the read-only Athom build history must not die at the SDK default 10 s on master
// (3 680 builds): it honours HOMEY_API_TIMEOUT_MS and records list_ms / list_count.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'scripts/ci/homey-build-status.js'), 'utf8');
const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/athom-build-history.yml'), 'utf8');
test('build status honours HOMEY_API_TIMEOUT_MS on list and detail reads', () => {
  assert.match(src, /process\.env\.HOMEY_API_TIMEOUT_MS/);
  assert.match(src, /getBuilds\(\{[^}]*\$timeout: TIMEOUT_MS/);
  assert.match(src, /getBuild\(\{[^}]*\$timeout: TIMEOUT_MS/);
});
test('build status records list latency and size', () => {
  assert.match(src, /out\.list_ms = Date\.now\(\) - t0/);
  assert.match(src, /out\.list_count =/);
});
test('history workflow stays read-only and widens the timeout', () => {
  assert.match(wf, /HOMEY_API_TIMEOUT_MS: '120000'/);
  assert.doesNotMatch(wf, /homey app publish|direct-api-publish/);
});
