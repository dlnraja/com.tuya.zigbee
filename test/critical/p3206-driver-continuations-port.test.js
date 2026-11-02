'use strict';
// P3206 port (02/11/2026 Paris): driver continuation registry + resolver + CI check (master f014b9ff8d).
// Baseline narrowing of the publish compactor is NOT ported here (stable/bastien lack P3077/P3085 hold plumbing).
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const path = require('path');
const DC = require('../../lib/drivers/DriverContinuations');
const { check } = require('../../scripts/ci/driver-continuations-check.js');

describe('P3206 port: driver continuations', () => {
  it('continuation resolver: chain, root, first non-full', () => {
    const r = DC.fromObject({ drivers: { x: { full: true, continuation: 'x_2' }, x_2: { continuationOf: 'x', index: 2 } } });
    assert.deepStrictEqual(r.chainOf('x_2'), ['x', 'x_2']);
    assert.strictEqual(r.rootOf('x_2'), 'x');
    assert.strictEqual(r.firstNonFull('x'), 'x_2');
    assert.strictEqual(r.firstNonFull('plain'), 'plain');
    assert.ok(r.isSameLogical('x', 'x_2'));
  });

  it('CI check: real registry clean, broken links detected', () => {
    const root = path.join(__dirname, '..', '..');
    assert.deepStrictEqual(check(root).errors, []);
    const bad = check(root, { drivers: { x: { full: true, continuation: 'x_2' }, x_2: { continuationOf: 'y', index: 3 } } });
    assert.ok(bad.errors.length >= 2, bad.errors.join('; '));
  });
});
