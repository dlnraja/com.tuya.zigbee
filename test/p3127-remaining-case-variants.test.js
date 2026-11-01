'use strict';
/* eslint-env mocha */
// P3127 (#557): the last 5 case-variant generators must delegate to pairingCaseVariants.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const FILES = ['tools/ci/apply-curtain-couples.js', 'tools/ci/sacred-couple-pair.js',
  'tools/ci/enrich-mfs-p2295-multi-identity.js',
  'scripts/maintenance/master-self-heal.js'];
describe('P3127 remaining case-variant generators', function () {
  for (const f of FILES) {
    it(`${f} uses pairingCaseVariants and no UPPER expansion`, function () {
      const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
      assert.ok(src.includes('pairingCaseVariants'));
      assert.ok(!/variants\.push\(m\.toUpperCase\(\)\)|classic\.toUpperCase\(\)\]\)|m\.toLowerCase\(\), m\.toUpperCase\(\)\]/.test(src));
    });
  }
  it('sacred-couple-pair oemCaseVariants emits canonical + lowercase', function () {
    const scp = require('../tools/ci/sacred-couple-pair');
    if (typeof scp.oemCaseVariants !== 'function') { this.skip(); }
    assert.deepStrictEqual(scp.oemCaseVariants('_TZ3000_ABCD1234').sort(), ['_TZ3000_abcd1234', '_tz3000_abcd1234'].sort());
  });
});
