'use strict';
// P3293: master's final-gate retry decision treats an orphan waiting_for_files as transient, once per chain.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { decide } = require('../../.github/scripts/transient-publish-retry.js');

const old = () => new Date(Date.now() - 6 * 60 * 1000).toISOString();

describe('P3293 master transient-publish-retry: orphan waiting_for_files', () => {
  it('one bumped retry even when the in-run fallback stopped at the same-version guard', () => {
    const d = decide({ version: '9.0.1623', builds: [{ id: 3705, version: '9.0.1623', state: 'waiting_for_files', created: old() }], retryCount: 0, retryUsed: true, orphanConfirmed: false });
    assert.equal(d.retry, true);
    assert.equal(d.kind, 'orphan_waiting_for_files');
    assert.equal(d.next, 1);
  });
  it('blocks a second orphan in the same chain', () => {
    const d = decide({ version: '9.0.1624', builds: [{ id: 3706, version: '9.0.1624', state: 'waiting_for_files' }], retryCount: 1, orphanConfirmed: true });
    assert.equal(d.retry, false);
  });
  it('a fresh waiting_for_files without confirmation and other unknown states never retry', () => {
    assert.equal(decide({ version: '9.0.1623', builds: [{ id: 1, version: '9.0.1623', state: 'waiting_for_files', created: new Date().toISOString() }], retryCount: 0 }).retry, false);
    assert.equal(decide({ version: '9.0.1623', builds: [{ id: 1, version: '9.0.1623', state: 'weird_state' }], retryCount: 0, orphanConfirmed: true }).retry, false);
  });
});
