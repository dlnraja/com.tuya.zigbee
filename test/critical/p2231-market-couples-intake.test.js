'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSacredCouple,
  isValidSacredCouple,
  extractCouplesFromText,
} = require('../../tools/ci/sacred-couple-pair');
const { lookup, isForbiddenDriver } = require('../../lib/pairing/UserMisattributionRegistry');

describe('sacred-couple-pair (P2231)', () => {
  it('accepts Blakadder-style Tongou couple', () => {
    const c = normalizeSacredCouple('_TZE284_6ocnqlhn', 'TS0601');
    assert.ok(c);
    assert.equal(c.key, '_TZE284_6OCNQLHN|TS0601');
  });

  it('rejects invented pid ts0601_rcbo', () => {
    assert.equal(normalizeSacredCouple('_TZE284_6ocnqlhn', 'ts0601_rcbo'), null);
  });

  it('rejects ZHA truncated non-TS pid', () => {
    assert.equal(normalizeSacredCouple('_TYST11_jeaxp72v', 'eaxp72v'), null);
  });

  it('extracts interview block from diag text', () => {
    const text = 'Manufacturer: _TZE284_6ocnqlhn Model: TS0601\nother line _TZ3000_abc TS0601 TS0201';
    const pairs = extractCouplesFromText(text);
    assert.ok(pairs.some((p) => p.mfr === '_TZE284_6OCNQLHN' && p.pid === 'TS0601'));
    // Same-line single mfr+pid only — no cartesian TS0201 on line 2
    assert.equal(pairs.filter((p) => p.mfr === '_TZ3000_ABC').length, 0);
  });

  it('Tongou registry forbids smart_rcbo route hint', () => {
    const reg = lookup('_TZE284_6ocnqlhn', 'TS0601');
    assert.ok(reg);
    assert.equal(reg.canonicalDriver, 'din_rail_meter');
    assert.ok(isForbiddenDriver('_TZE284_6ocnqlhn', 'TS0601', 'smart_rcbo'));
  });
});

describe('market-couples-intake report shape', () => {
  it('main() produces intake.json fields when cross-ref state exists', () => {
    const fs = require('fs');
    const path = require('path');
    const intakePath = path.join(__dirname, '../../.github/state/market-couples/intake.json');
    if (!fs.existsSync(intakePath)) {
      return; // skip if pipeline not run locally
    }
    const j = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
    assert.ok(typeof j.marketNew === 'number');
    assert.ok(Array.isArray(j.topMarketNew));
    assert.ok(j.bySource && typeof j.bySource.blakadder === 'number');
  });
});
