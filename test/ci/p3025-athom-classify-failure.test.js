'use strict';
// P3025: per-version Athom failure classification (stable re-upload loop classified "unknown" -> no retry).
const { describe, it } = require('../_support/dual-runner'); // P3020
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { classifyFailure } = require('../../.github/scripts/athom-classify-failure');

const CLI = path.resolve(__dirname, '../../.github/scripts/athom-classify-failure.js');
const ROWS = [
  '{"id":272,"version":"5.12.360","state":"processing_failed"}',
  '{"id":271,"version":"5.12.359","state":"processing_failed","error":"AggregateError: x"}',
  '{"id":270,"version":"5.12.358","state":"test"}',
].join('\n');

describe('P3025 athom-classify-failure', () => {
  it('uses only the row of the current version (not older builds in the listing)', () => {
    const r = classifyFailure({ statusText: ROWS, version: '5.12.359' });
    assert.strictEqual(r.kind, 'AggregateError');
  });
  it('empty-error processing_failed falls back to the wait log, then to transient', () => {
    assert.strictEqual(classifyFailure({ statusText: ROWS, version: '5.12.360', waitLog: 'build failed: socket hang up' }).kind, 'socket hang up');
    const r = classifyFailure({ statusText: ROWS, version: '5.12.360', waitLog: '' });
    assert.deepStrictEqual([r.kind, r.source], ['transient', 'empty-error-fallback']);
  });
  it('explicit unknown error text keeps budget 0 (unknown)', () => {
    const s = '{"version":"5.12.361","state":"processing_failed","error":"manifest rejected"}';
    assert.strictEqual(classifyFailure({ statusText: s, version: '5.12.361' }).kind, 'unknown');
  });
  it('invalid_state is reported as such (retry x1 by policy)', () => {
    const s = '{"version":"5.12.362","state":"processing_failed","message":"invalid_state"}';
    assert.strictEqual(classifyFailure({ statusText: s, version: '5.12.362' }).kind, 'invalid_state');
  });
  it('tip-lag or a healthy row is not-failed (no re-upload)', () => {
    assert.strictEqual(classifyFailure({ statusText: ROWS, version: '5.12.358' }).kind, 'not-failed');
    assert.strictEqual(classifyFailure({ statusText: ROWS, version: '5.12.999' }).kind, 'not-failed');
  });
  it('row missing but wait log says processing_failed with hang up -> socket hang up', () => {
    assert.strictEqual(classifyFailure({ statusText: '', version: '5.12.400', waitLog: 'processing_failed socket hang up' }).kind, 'socket hang up');
  });
  it('CLI reads stdin and prints the kind', () => {
    const r = spawnSync(process.execPath, [CLI, '--version', '5.12.360'], { input: ROWS, encoding: 'utf8' });
    assert.strictEqual(r.status, 0); assert.strictEqual(r.stdout.trim(), 'transient');
  });
});
