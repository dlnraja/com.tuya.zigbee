// test/critical/manufacturerResolver.test.js
// Tests unitaires pour ManufacturerResolver (Rule 24)
'use strict';

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
    { input: null, expected: null },
    { input: '', expected: null },
    { input: 'Tüyä', expected: 'tuya' }, // avec accents
  ];

  for (const { input, expected } of testCases) {
    it(`normalize("${input}") === "${expected}"`, () => {
      assert.strictEqual(ManufacturerResolver.normalize(input), expected);
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
    assert.strictEqual(ManufacturerResolver.resolve('Tuya_Smart', mapping), 'tuya');
    assert.strictEqual(ManufacturerResolver.resolve('LIDL', mapping), 'lidl_silvercrest');
  });

  it('retourne la forme normalisée pour les variants inconnus', () => {
    assert.strictEqual(ManufacturerResolver.resolve('UnknownBrand', mapping), 'unknownbrand');
  });
});

describe('ManufacturerResolver.generateId', () => {
  it('génère un hash stable de 12 caractères', () => {
    const id = ManufacturerResolver.generateId('tuya');
    assert.strictEqual(typeof id, 'string');
    assert.strictEqual(id.length, 12);
    assert.strictEqual(ManufacturerResolver.generateId('tuya'), id); // Stable
  });
});

describe('ManufacturerResolver.buildMapping', () => {
  it('construit un mapping complet', () => {
    const entries = [
      { canonical: 'tuya', variants: ['Tuya', 'TUYA'] },
      { canonical: 'lidl', variants: ['Lidl', 'LIDL'] }
    ];
    const mapping = ManufacturerResolver.buildMapping(entries);
    assert.strictEqual(mapping.tuya, 'tuya');
    assert.strictEqual(mapping.lidl, 'lidl');
  });
});

console.log('✅ ManufacturerResolver tests loaded');
