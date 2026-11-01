'use strict';
const assert = require('assert');
const g = require('../tools/ci/house-data-guard');
describe('P3120 house-data guard', () => {
  it('counts a real IEEE, ignores all-zero placeholder', () => {
    assert.strictEqual(g.count('docs/x.md', 'a4:c1:38:00:11:22:33:44'), 1);
    assert.strictEqual(g.count('docs/x.md', '00:00:00:00:00:00:00:00'), 0);
  });
  it('counts homey ids and room words only in house context', () => {
    assert.strictEqual(g.count('r/p.json', '"athomHomeyId": "65d495eb252c3ef65c879247aa"'), 1);
    assert.strictEqual(g.count('docs/x.md', 'salon'), 0);
    assert.strictEqual(g.count('docs/bastien.md', 'salon'), 1);
  });
  it('redacts with context-preserving placeholders', () => {
    const r = g.redact('docs/bastien.md', 'salon a4:c1:38:00:11:22:33:44');
    assert.ok(r.includes('[pièce A]') && r.includes('[IEEE-1]'));
  });
  it('ratchet fails only above baseline', () => {
    assert.deepStrictEqual(g.compare({ a: 1 }, { a: 1 }), []);
    assert.strictEqual(g.compare({ a: 2, b: 1 }, { a: 1 }).length, 2);
  });
  it('tree is under baseline', () => {
    const base = require('../config/house-data-baseline.json');
    assert.deepStrictEqual(g.compare(g.scan(), base), []);
  }).timeout(60000);
});
