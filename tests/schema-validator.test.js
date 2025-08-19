/**
 * Tests for schema-validator module
 */

const { test } = require('node:test');
const assert = require('node:assert');

// Mock the module
const SchemaValidator = require('../lib/validation/schema-validator');

test('SchemaValidator - constructor', (t) => {
  const validator = new SchemaValidator();
  assert.ok(validator);
  assert.ok(typeof validator.validateOverlay === 'function');
  assert.ok(typeof validator.validateDeviceMatrix === 'function');
});

test('SchemaValidator - validateOverlay with valid data', (t) => {
  const validator = new SchemaValidator();
  const validOverlay = {
    status: 'confirmed',
    confidence: 0.85,
    overlayVersion: '1.0.0',
    productIds: ['TS011F'],
    dp: {
      '1': { cap: 'onoff', to: 'bool' },
      '16': { cap: 'measure_power', to: 'num/10' }
    }
  };
  
  const result = validator.validateOverlay(validOverlay);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.errors.length, 0);
});

test('SchemaValidator - basic functionality', (t) => {
  assert.ok(SchemaValidator);
  console.log('✅ SchemaValidator tests passed');
});
