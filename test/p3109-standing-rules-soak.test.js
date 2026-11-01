'use strict';
const { describe, it } = global.describe ? global : require('node:test');
const assert = require('assert');
const g = require('../scripts/ci/standing-rules-gate');

describe('P3109 R-soak (port after master soak)', () => {
  const H = 3600;
  const master = { P3071: 1000 * H, abcdef1234: 1000 * H };
  const mt = (r) => r.ref in master ? master[r.ref] : null;
  it('warns a behaviour port younger than SOAK_H', () => {
    const out = g.soak([{ h: 'a', t: 1010 * H, subject: 'fix(P3071): port DIN meters to stable-v5' }], mt, 24);
    assert.strictEqual(out.length, 1);
    assert.ok(/a ports P3071 10\.0 h/.test(out[0]));
  });
  it('passes once soaked, and by SHA too', () => {
    assert.deepStrictEqual(g.soak([{ h: 'b', t: 1030 * H, subject: 'feat: port abcdef1234 (P3071)' }], mt, 24), []);
    assert.strictEqual(g.soak([{ h: 'c', t: 1001 * H, subject: 'feat: port abcdef1234' }], mt, 24).length, 1);
  });
  it('exempts CI-only ports, non-ports, overrides and unknown refs', () => {
    const cs = [
      { h: 'd', t: 1001 * H, subject: 'ci(P3071): port gate to stable-v5' },
      { h: 'e', t: 1001 * H, subject: 'test(P3071): port test' },
      { h: 'f', t: 1001 * H, subject: 'fix(P3071): stable-only fix' },
      { h: 'g', t: 1001 * H, subject: 'fix(P3071): port, soak-override (user OK)' },
      { h: 'i', t: 1001 * H, subject: 'fix(P9999): port unknown' },
    ];
    assert.deepStrictEqual(g.soak(cs, mt, 24), []);
  });
  it('only port branches are checked', () => {
    assert.deepStrictEqual(g.PORT_BRANCHES, ['stable-v5', 'bastien-home']);
  });
});
