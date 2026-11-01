'use strict';
/* eslint-env mocha */
// P3112 (#557): case-variant helpers must emit only Homey-critical forms.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pairingCaseVariants } = require('../lib/utils/TuyaNormalizer');
const FILES = ['apply-p98-sacred-lot1', 'apply-p101-sacred-lot2', 'apply-p102-sacred-lot3',
  'apply-p117-sacred-rehomes', '_apply-adjudication', 'apply-p2234-z2m-web-sacred', 'apply-p2236-forum-integral-fix',
  'p2268-apply-parallel-couple-fixes', 'p2182-lock-tb25-wall-pids', 'apply-p122-multi-source-fixes', 'refine-p2234-sacred-couple-aware', 'case-variant-fixer'];
describe('P3112 pairingCaseVariants in case helpers', function () {
  it('pairingCaseVariants returns canonical + lowercase only', function () {
    assert.deepStrictEqual(pairingCaseVariants('_tz3000_G9G2XNCH').sort(), ['_TZ3000_g9g2xnch', '_tz3000_g9g2xnch'].sort());
  });
  for (const f of FILES) {
    it(`${f} delegates to pairingCaseVariants (no 4-combo expansion)`, function () {
      const p = path.join(__dirname, '..', 'tools', 'ci', `${f}.js`);
      if (!fs.existsSync(p)) { this.skip(); }
      const src = fs.readFileSync(p, 'utf8');
      assert.ok(src.includes('pairingCaseVariants'));
      assert.ok(!/\$\{m\[1\]\.toLowerCase\(\)\}_\$\{m\[2\]\.toUpperCase\(\)\}/.test(src));
    });
  }
});
