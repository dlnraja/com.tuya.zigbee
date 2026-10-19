'use strict';
// WHY(P2882, 2026-10-19): bot triage and the monthly scan wrote their missing-mfr list into gitignored
// .github/state, so no later run consumed it. The list now lands in the tracked ledger as pending leads.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ingest } = require('../../scripts/progress/ingest-bot-candidates.js');

describe('P2882 bot candidates → ledger leads', () => {
  const bag = {
    source: 'auto-bot-issue-triage',
    issues: [{ number: 12, missing: ['_TZE200_newabcd1'] }],
    missingMfrs: ['_TZE200_newabcd1', ' _TZ3000_PADDED12\u200b', '_tze200_wrmhp6b3', 'not-a-tuya-id', '_TZE204_second99'],
  };

  it('adds only new, well-formed mfrs as pending leads, case-insensitive vs existing keys', () => {
    const ledger = { items: { 'lead:_TZE200_wrmhp6b3': { status: 'deferred', note: 'keep' } } };
    const added = ingest(bag, ledger, { today: '2026-10-19' });
    assert.deepEqual(added, ['_TZE200_newabcd1', '_TZ3000_PADDED12', '_TZE204_second99']);
    assert.equal(ledger.items['lead:_TZE200_wrmhp6b3'].status, 'deferred', 'existing entry untouched');
    assert.equal(ledger.items['lead:_TZE200_wrmhp6b3'].note, 'keep');
    const e = ledger.items['lead:_TZE200_newabcd1'];
    assert.equal(e.status, 'pending');
    assert.match(e.note, /no pid/);
    assert.match(e.note, /issues\/12/);
  });

  it('is idempotent and honours the cap', () => {
    const ledger = { items: {} };
    assert.equal(ingest(bag, ledger, { max: 1 }).length, 1);
    assert.equal(ingest(bag, ledger).length, 2);
    assert.equal(ingest(bag, ledger).length, 0);
  });
});
