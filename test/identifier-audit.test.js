'use strict';
/* eslint-env mocha */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { audit } = require('../tools/ci/identifier-audit');

function fixture(drivers) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ida-'));
  for (const [id, zigbee] of Object.entries(drivers)) {
    fs.mkdirSync(path.join(root, 'drivers', id), { recursive: true });
    fs.writeFileSync(path.join(root, 'drivers', id, 'driver.compose.json'), JSON.stringify({ zigbee }));
  }
  return root;
}

describe('R20 identifier audit', () => {
  it('finds a couple claimed by two drivers only through different case forms', () => {
    const r = audit(fixture({
      a: { manufacturerName: ['_TZE200_abcdefgh'], productId: ['TS0601'] },
      b: { manufacturerName: ['_tze200_abcdefgh'], productId: ['ts0601'] },
    }));
    assert.deepStrictEqual(r.hidden.map((h) => h.key), ['_tze200_abcdefgh|TS0601']);
  });
  it('does not merge distinct prefixes (_TZE200 vs _TZE204)', () => {
    const r = audit(fixture({
      a: { manufacturerName: ['_TZE200_abcdefgh'], productId: ['TS0601'] },
      b: { manufacturerName: ['_TZE204_abcdefgh'], productId: ['TS0601'] },
    }));
    assert.strictEqual(r.hidden.length, 0);
  });
  it('flags NUL / zero-width / whitespace padding', () => {
    const r = audit(fixture({ a: { manufacturerName: ['_TZ3000_abc\u0000', ' _TZ3000_def', '_TZ3000_g\u200bhi'], productId: ['TS0001'] } }));
    assert.strictEqual(r.malformed.length, 3);
  });
  it('repository has no new entries beyond the baseline', function () {
    this.timeout(60000);
    const base = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tools', 'ci', 'identifier-audit-baseline.json'), 'utf8'));
    const known = new Set([...base.malformed.map((m) => `${m.driver}:${m.value}`), ...base.hidden.map((h) => h.key)]);
    const r = audit();
    const fresh = [...r.malformed.map((m) => `${m.driver}:${m.value}`), ...r.hidden.map((h) => h.key)].filter((k) => !known.has(k));
    assert.deepStrictEqual(fresh, []);
  });
});
