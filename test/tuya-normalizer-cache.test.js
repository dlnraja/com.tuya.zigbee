'use strict';

/**
 * Tests — TuyaNormalizer v10.1.0 (LRU-cached normalize)
 * The whole app's case-insensitive matching funnels through this module.
 * The cache must never change results (purity) and must stay bounded.
 */

const assert = require('assert');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const TU = require(path.join(__dirname, '..', 'lib', 'utils', 'TuyaNormalizer'));

describe('TuyaNormalizer — caseless core', () => {
  it('normalize handles case, whitespace, accents, null, non-string', () => {
    assert.strictEqual(TU.normalize('_TZ3000_G9G2XNCH'), '_tz3000_g9g2xnch');
    assert.strictEqual(TU.normalize('  _TZE200_MYD45WEU '), '_tze200_myd45weu');
    assert.strictEqual(TU.normalize(null), '');
    assert.strictEqual(TU.normalize(undefined), '');
    assert.strictEqual(TU.normalize(123), '123');
    // NFKD: accented chars lose their diacritics
    assert.strictEqual(TU.normalize('Générique'), 'generique');
  });

  it('normalize is pure: cached results identical to fresh results', () => {
    const samples = ['_TZ3000_abc', '_tze284_HODYRYLI', 'TS0601', 'MOES Bouton', ' Générique™ '];
    const fresh = samples.map(s => TU.normalize(s));
    const again = samples.map(s => TU.normalize(s));
    assert.deepStrictEqual(again, fresh);
  });

  it('normalize stays correct after cache overflow (>4096 unique keys)', function () {
    if (typeof this.timeout === 'function') {this.timeout(30000);}
    for (let i = 0; i < 5000; i++) {
      TU.normalize(`_TZ3000_overflow_${i}`);
    }
    // Early + late entries must still normalize correctly
    assert.strictEqual(TU.normalize('_TZ3000_OVERFLOW_0'), '_tz3000_overflow_0');
    assert.strictEqual(TU.normalize('_TZ3000_OVERFLOW_4999'), '_tz3000_overflow_4999');
    assert.strictEqual(TU.normalize('_TZ3000_G9G2XNCH'), '_tz3000_g9g2xnch');
  });

  it('comparison helpers are case-insensitive', () => {
    assert.strictEqual(TU.equalsIgnoreCase('_TZE200_MYD45WEU', '_tze200_myd45weu'), true);
    assert.strictEqual(TU.includesCI(['_TZ3000_ABC', 'TS0001'], '_tz3000_abc'), true);
    assert.strictEqual(TU.includesCI(['_TZ3000_ABC'], '_tz3000_xyz'), false);
    assert.strictEqual(TU.findCI(['_TZ3000_ABC'], '_tz3000_abc'), '_TZ3000_ABC');
    assert.strictEqual(TU.startsWithCI('_TZ3000_g9g2xnch', '_tz3000'), true);
    assert.strictEqual(TU.containsCI('_TZE204_cfnprab5', 'CFNPRAB5'), true);
  });

  it('generateCaseVariants covers lower, upper, and canonical Tuya forms', () => {
    const variants = TU.generateCaseVariants('_TZ3000_G9g2xnch');
    assert.ok(variants.includes('_tz3000_g9g2xnch'), 'lower variant present');
    assert.ok(variants.includes('_TZ3000_G9G2XNCH'), 'upper variant present');
    assert.ok(variants.includes('_TZ3000_g9g2xnch'), 'canonical prefix-upper/suffix-lower present');
    const mixed = TU.generateCaseVariants('_tz3000_AbC123xy');
    assert.ok(mixed.includes('_TZ3000_abc123xy'), 'mixed input yields canonical');
  });
});
