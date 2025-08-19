/**
 * Tests for error-handler module
 */

const { test } = require('node:test');
const assert = require('node:assert');

// Mock device for testing
const mockDevice = {
  getId: () => 'test-device-123',
  error: (msg, data) => console.log('ERROR:', msg, data),
  log: (msg, data) => console.log('LOG:', msg, data),
  setUnavailable: (msg) => Promise.resolve()
};

// Mock the module
const ErrorHandler = require('../lib/errors/error-handler');

test('ErrorHandler - constructor', (t) => {
  const handler = new ErrorHandler();
  assert.ok(handler.errorCounts);
  assert.strictEqual(handler.maxErrors, 5);
  assert.strictEqual(handler.errorWindow, 60000);
});

test('ErrorHandler - recordError', (t) => {
  const handler = new ErrorHandler();
  const deviceId = 'test-device';
  
  handler.recordError(deviceId);
  assert.ok(handler.errorCounts.has(deviceId));
  
  const record = handler.errorCounts.get(deviceId);
  assert.strictEqual(record.count, 1);
});

test('ErrorHandler - isThrottled', (t) => {
  const handler = new ErrorHandler();
  const deviceId = 'test-device';
  
  // Not throttled initially
  assert.strictEqual(handler.isThrottled(deviceId), false);
  
  // Record multiple errors
  for (let i = 0; i < 5; i++) {
    handler.recordError(deviceId);
  }
  
  // Should be throttled now
  assert.strictEqual(handler.isThrottled(deviceId), true);
});

test('ErrorHandler - resetErrors', (t) => {
  const handler = new ErrorHandler();
  const deviceId = 'test-device';
  
  handler.recordError(deviceId);
  assert.ok(handler.errorCounts.has(deviceId));
  
  handler.resetErrors(deviceId);
  assert.strictEqual(handler.isThrottled(deviceId), false);
});

test('ErrorHandler - getSafeFallback', (t) => {
  const handler = new ErrorHandler();
  
  assert.strictEqual(handler.getSafeFallback(1, 'onoff'), false);
  assert.strictEqual(handler.getSafeFallback(16, 'measure_power'), 0);
  assert.strictEqual(handler.getSafeFallback(2, 'target_temperature'), 20);
});

test('ErrorHandler - getErrorStats', (t) => {
  const handler = new ErrorHandler();
  const deviceId = 'test-device';
  
  handler.recordError(deviceId);
  const stats = handler.getErrorStats();
  
  assert.ok(stats[deviceId]);
  assert.strictEqual(stats[deviceId].count, 1);
});

console.log('✅ ErrorHandler tests completed');
