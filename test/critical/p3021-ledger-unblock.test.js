'use strict';
// P3021 (2026-10-24): stale ledger items re-checked against git and closed.
// Guards the ledger shape so later writers keep these items closed and parseable.
const { describe, it } = require('node:test');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

const ledger = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'progress', 'ledger.json'), 'utf8'));

describe('P3021 ledger unblock', () => {
  it('keeps the ledger items map', () => {
    assert.ok(ledger.items && typeof ledger.items === 'object');
  });

  it('closes the four items verified as shipped', () => {
    for (const key of [
      'task:stable-grouped-port-2026-10-04',
      'task:stable-port-1298-1113',
      'task:ledger-wire-forum-poll',
      'task:ledger-wire-gmail-diagnostics',
    ]) {
      const item = ledger.items[key];
      assert.ok(item, key);
      assert.strictEqual(item.status, 'done', key);
      assert.match(String(item.result || ''), /P3021/, key);
    }
  });

  it('records the next-02 evidence (closed later by P3021b de0a681081)', () => {
    const item = ledger.items['task:next-02'];
    assert.ok(['pending', 'done'].includes(item.status), item.status);
    assert.match(item.result, /3a0939b8d1/);
  });
});
