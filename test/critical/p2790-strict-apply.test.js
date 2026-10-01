'use strict';

/** P2790 — strict-rule fingerprint intake (scripts/leads/strict-apply.js). */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { decide, pairsFromText } = require('../../scripts/leads/strict-apply');

const idx = {
  byMfr: new Map([['_tz3000_known001', new Set(['contact_sensor'])]]),
  byPid: new Map([
    ['TS0203', new Set(['contact_sensor'])],
    ['TS0001', new Set(['switch_1gang', 'relay_1ch'])],
    ['TS0601', new Set(['a', 'b'])],
  ]),
};

describe('P2790 strict apply', () => {
  it('applies only when exactly one driver lists the productId', () => {
    assert.deepEqual(decide(idx, '_TZ3000_abcdefgh', 'TS0203'), { status: 'apply', driver: 'contact_sensor' });
    assert.equal(decide(idx, '_TZ3000_abcdefgh', 'TS0001').status, 'lead');
  });
  it('never applies without an exact pid, for TS0601, invalid or known ids', () => {
    assert.equal(decide(idx, '_TZ3000_abcdefgh', null).status, 'lead');
    assert.equal(decide(idx, '_TZE200_abcdefgh', 'TS0601').status, 'lead');
    assert.equal(decide(idx, '_TZ3000_xxxxxxxx', 'TS0203').status, 'lead');
    assert.equal(decide(idx, '_TZ3000_abc', 'TS0203').status, 'lead');
    assert.equal(decide(idx, '_TZ3000_KNOWN001', 'TS0203').status, 'already');
  });
  it('backport requires the forced driver to already list the productId', () => {
    assert.equal(decide(idx, '_TZ3000_abcdefgh', 'TS0203', 'contact_sensor').status, 'apply');
    assert.equal(decide(idx, '_TZ3000_abcdefgh', 'TS0203', 'switch_1gang').status, 'lead');
  });
  it('pairs only one mfr + one pid in the same paragraph', () => {
    assert.deepEqual(pairsFromText('My `_TZ3000_abcdefgh` / TS0203 sensor'), [{ mfr: '_TZ3000_abcdefgh', pid: 'TS0203' }]);
    const amb = pairsFromText('_TZ3000_abcdefgh and _TZ3000_bbbbbbbb are TS0203');
    assert.ok(amb.every((p) => p.ambiguous));
    const two = pairsFromText('_TZ3000_abcdefgh\n\nTS0203');
    assert.ok(two.every((p) => p.ambiguous || !p.pid));
  });
});
