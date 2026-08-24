'use strict';

/**
 * P2246 — diag couple extract + derive (never invent brand×TS cartesian)
 */

const assert = require('assert');
const { extractCouples, enrich } = require('../../lib/diagnostics/DiagContentEnricher');

describe('P2246 diag couple cross-derive', () => {
  it('extracts zb_* settings + HOBEIAN+ZG glue without inventing HOBEIAN+TS004F', () => {
    const text = 'zb_manufacturer_name=_TZ3000_xffhmvhv zb_model_id=TS004F HOBEIAN+ZG-102Z';
    const couples = extractCouples(text);
    const keys = couples.map((c) => `${c.mfr}|${c.pid}`);
    assert.ok(keys.some((k) => /xffhmvhv\|TS004F/i.test(k)));
    assert.ok(keys.some((k) => /HOBEIAN\|ZG-102Z/i.test(k)));
    assert.strictEqual(keys.some((k) => /HOBEIAN\|TS004F/i.test(k)), false);
    assert.strictEqual(keys.some((k) => /xffhmvhv\|ZG-102Z/i.test(k)), false);
  });

  it('matches _TZ3000_ (4-digit) manufacturer names', () => {
    const couples = extractCouples('Manufacturer: _TZ3000_zgyzgdua Model: TS0044');
    assert.ok(couples.some((c) => /zgyzgdua/i.test(c.mfr) && /TS0044/i.test(c.pid)));
  });

  it('enrich summary prefers real couple', () => {
    const en = enrich('Log ID: abcdef01-0000-0000-0000-000000000000\nzb_manufacturer_name=_TZE284_6ocnqlhn\nzb_model_id=TS0601');
    assert.match(en.summary, /6ocnqlhn\+TS0601/);
  });
});
