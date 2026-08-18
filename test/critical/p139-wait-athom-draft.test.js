'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyDraftWait,
  decideDraftWait,
} = require('../../.github/scripts/wait-athom-draft-ready.js');

describe('P139 wait-athom-draft-ready', () => {
  it('prefers a ready draft even when a sibling build of the same version failed', () => {
    const c = classifyDraftWait([
      { version: '9.0.588', state: 'processing_failed', id: 2909 },
      { version: '9.0.588', state: 'draft', id: 2910 },
    ], '9.0.588');
    assert.equal(decideDraftWait(c), 'ready');
    assert.equal(c.ready[0].id, 2910);
  });

  it('does not fail-closed on the first processing_failed poll', () => {
    const c = classifyDraftWait([
      { version: '9.0.588', state: 'processing_failed', id: 2909 },
      { version: '1.1.10', state: 'draft', id: 1 },
    ], '9.0.588');
    assert.equal(decideDraftWait(c), 'keep-waiting');
    assert.equal(c.ready.length, 0);
    assert.equal(c.failed[0].id, 2909);
  });

  it('treats test channel of the expected version as ready', () => {
    const c = classifyDraftWait([
      { version: '9.0.589', state: 'test', id: 2911 },
    ], 'v9.0.589');
    assert.equal(decideDraftWait(c), 'ready');
  });
});
