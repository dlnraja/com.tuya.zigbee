'use strict';
// P3042 (25/10/2026 Paris): Athom returns processing_failed with stateMeta "socket hang up"
// (#3679-#3681, #3683). homey-build-status.js kept only err/reason/message/log/fail keys, so the
// snapshot lost stateMeta and the master breaker read #3683 as a "real" failure. Keep meta/detail keys.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'scripts', 'ci', 'homey-build-status.js'), 'utf8');
const P = require(path.join(ROOT, '.github', 'scripts', 'athom-publish-policy.js'));

describe('P3042 build-status snapshot keeps Athom stateMeta', () => {
  it('copied-key filter matches stateMeta', () => {
    const m = src.match(/if \(\/([^/]+)\/i\.test\(k\) && v\) row\[k\]/);
    assert.ok(m, 'key filter found');
    assert.ok(new RegExp(m[1], 'i').test('stateMeta'));
  });
  it('a snapshot row with stateMeta "socket hang up" is transient for the breaker', () => {
    const builds = [{ id: 3683, state: 'processing_failed', stateMeta: 'socket hang up' }, { id: 3682, state: 'test' }];
    assert.equal(P.classify(builds[0]).cls, 'transient');
    assert.equal(P.breakerAssess({ builds, n: 3 }).tripped, false);
  });
  it('a bare processing_failed still trips (no stateMeta = real)', () => {
    assert.equal(P.breakerAssess({ builds: [{ id: 1, state: 'processing_failed' }], n: 3 }).tripped, true);
  });
});
