/**
 * Tests for test-runner module
 */

const { test } = require('node:test');
const assert = require('node:assert');

// Mock the module
const TestRunner = require('../lib/testing/test-runner');

test('TestRunner - constructor', (t) => {
  const runner = new TestRunner();
  assert.ok(runner.testResults);
  assert.ok(Array.isArray(runner.testSuites));
  assert.ok(runner.testSuites.includes('convert'));
  assert.ok(runner.testSuites.includes('fingerprints'));
});

test('TestRunner - validateTestFiles', (t) => {
  const runner = new TestRunner();
  const validation = runner.validateTestFiles();
  
  assert.ok(typeof validation.valid === 'boolean');
  assert.ok(Array.isArray(validation.missing));
  assert.ok(typeof validation.total === 'number');
});

test('TestRunner - getTestCoverage', (t) => {
  const runner = new TestRunner();
  const coverage = runner.getTestCoverage();
  
  assert.ok(typeof coverage.total === 'number');
  assert.ok(typeof coverage.covered === 'number');
  assert.ok(typeof coverage.percentage === 'number');
  assert.ok(Array.isArray(coverage.missing));
});

console.log('✅ TestRunner tests completed');
