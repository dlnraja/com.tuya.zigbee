'use strict';
// WHY(2026-10-11 port of master c25f077831/5087da3ce1/45a2d8f1a9/516c83444c/9cfe3f5d08):
// stable/bastien publish workflows share the false-green + same-version re-send + invalid_state issues.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

test('final gate verdicts (red unless Test)', () => {
  const { verdict } = require('../../.github/scripts/assert-athom-final.js');
  assert.equal(verdict([{ id: 1, version: '1.0.1', state: 'processing_failed' }], '1.0.1').ok, false);
  assert.equal(verdict([{ id: 1, version: '1.0.1', state: 'processing_failed' }], '1.0.1').done, true);
  assert.equal(verdict([{ id: 2, version: '1.0.1', state: 'test' }], '1.0.1').ok, true);
  assert.equal(verdict([{ id: 2, version: '1.0.1', state: 'processing' }], '1.0.1').done, false);
});

test('idle wait: waiting_for_files older than 5 min is stuck (final)', () => {
  const { isStuck } = require('../../.github/scripts/wait-athom-idle.js');
  const old = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  assert.equal(isStuck({ state: 'waiting_for_files', stateChangedAt: old }), true);
  assert.equal(isStuck({ state: 'waiting_for_files', stateChangedAt: new Date().toISOString() }), false);
});

test('direct-api-publish never re-sends an uploaded version (even --force)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'scripts/direct-api-publish.js'), 'utf8');
  assert.match(src, /SAME-VERSION GUARD/);
});

test('publish workflow has idle wait before upload and final gate after', () => {
  const wf = ['publish-stable.yml', 'bastien-publish.yml']
    .map((f) => path.join(ROOT, '.github/workflows', f))
    .find((f) => fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes('assert-athom-final.js'));
  assert.ok(wf, 'a publish workflow wires assert-athom-final.js');
  const s = fs.readFileSync(wf, 'utf8');
  assert.ok(s.indexOf('wait-athom-idle.js') > 0 && s.indexOf('wait-athom-idle.js') < s.indexOf('assert-athom-final.js'));
});
