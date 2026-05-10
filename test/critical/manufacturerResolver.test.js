// test/critical/manufacturerResolver.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert');
const ManufacturerResolver = require('../../lib/utils/manufacturerResolver');

describe('ManufacturerResolver.normalize (Rule 24)', () => {
  const testCases = [
    { input: 'Tuya', expected: 'tuya' },
    { input: 'tuya', expected: 'tuya' },
    { input: 'TUYA', expected: 'tuya' },
    { input: 'Tuya_Smart', expected: 'tuya_smart' },
    { input: 'tuya-inc', expected: 'tuya_inc' },
    { input: '  Tuya  ', expected: 'tuya' },
    { input: 'Tuya\u00A0Smart', expected: 'tuya_smart' }, // espace insécable
    { input: null, expected: null },
    { input: '', expected: null },
    { input: 'Tüyä', expected: 'tuya' }, // avec accents
  ];

  for (const tc of testCases) {
    it(`normalise "${tc.input}" en "${tc.expected}"`, () => {
      assert.strictEqual(ManufacturerResolver.normalize(tc.input), tc.expected);
    });
  }
});

describe('ManufacturerResolver.resolve with mapping', () => {
  const mapping = {
    'tuya_smart': 'tuya',
    'tuyainc': 'tuya',
    'lidl': 'lidl_silvercrest'
  };

  it('résout les variants connus vers leur forme canonique', () => {
    assert.strictEqual(
      ManufacturerResolver.resolve('Tuya_Smart', mapping),
      'tuya'
    );
    assert.strictEqual(
      ManufacturerResolver.resolve('LIDL', mapping),
      'lidl_silvercrest'
    );
  });

  it('retourne la forme normalisée comme canonique pour les variants inconnus', () => {
    assert.strictEqual(
      ManufacturerResolver.resolve('UnknownBrand', mapping),
      'unknownbrand'
    );
  });
});
