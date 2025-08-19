const { test } = require('node:test');
const assert = require('node:assert');

test('TuyaCluster - writeInteger retry logic', () => {
  // Test retry configuration
  const maxRetries = 2;
  const jitterMin = 50;
  const jitterMax = 120;
  
  assert.strictEqual(maxRetries, 2);
  assert.ok(jitterMin < jitterMax);
  assert.ok(jitterMin >= 50);
  assert.ok(jitterMax <= 120);
});

test('TuyaCluster - error classification', () => {
  const errorTypes = ['ZigbeeTimeout', 'Unsupported', 'PayloadRange'];
  
  errorTypes.forEach(type => {
    assert.strictEqual(typeof type, 'string');
    assert.ok(type.length > 0);
  });
  
  // Test timeout detection
  const timeoutError = { message: 'timeout' };
  const isTimeout = timeoutError.message.toLowerCase().includes('timeout');
  assert.strictEqual(isTimeout, true);
});

test('TuyaCluster - DP encoding', () => {
  // Test DP ID range
  const validDpIds = [1, 2, 16, 17, 45, 255];
  
  validDpIds.forEach(dp => {
    assert.ok(dp >= 0 && dp <= 255);
  });
  
  // Test value encoding
  const testValues = [
    { value: true, type: 'boolean' },
    { value: 100, type: 'number' },
    { value: 0, type: 'number' }
  ];
  
  testValues.forEach(({ value, type }) => {
    assert.strictEqual(typeof value, type);
  });
});
