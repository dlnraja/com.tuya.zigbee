'use strict';
const assert = require('assert');
const { addRemovalTombstones } = require('../tools/ci/ssot-couple-enrich');

describe('P3225 SSOT ledger keeps removal tombstones (CI test 41452930062)', () => {
  const ev = { entries: [
    { couple: '_TZ3000_abcd1234|TS0044', driver: 'button_wireless_4', pr: 'P1', verdict: 'removed' },
    { couple: '_TZ3000_live5678|TS0042', driver: 'button_wireless_3', pr: 'P2', verdict: 'moved' },
    { couple: 'junk|TS0044', driver: 'x', pr: 'P3', verdict: 'bad id' },
  ] };
  it('adds an unverified tombstone with drivers [] only for couples gone from every driver', () => {
    const couples = { '_tz3000_live5678|TS0042': { mfr: '_TZ3000_live5678', pid: 'TS0042', status: 'verified', drivers: ['button_wireless_2'] } };
    assert.strictEqual(addRemovalTombstones(couples, ev), 1);
    const t = couples['_tz3000_abcd1234|TS0044'];
    assert.strictEqual(t.status, 'unverified');
    assert.deepStrictEqual(t.drivers, []);
    assert.strictEqual(t.removed[0].pr, 'P1');
    assert.strictEqual(couples['_tz3000_live5678|TS0042'].status, 'verified');
    assert.ok(!Object.keys(couples).some((k) => k.startsWith('junk')));
  });
  it('is idempotent and tolerates missing evidence', () => {
    const couples = {};
    addRemovalTombstones(couples, ev); addRemovalTombstones(couples, ev);
    assert.strictEqual(couples['_tz3000_abcd1234|TS0044'].removed.length, 1);
    assert.strictEqual(addRemovalTombstones({}, null), 0);
  });
});
