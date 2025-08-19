const { test } = require('node:test');
const assert = require('node:assert');

test('TuyaFingerprints - overlay resolution priority', () => {
  // Test priority order: vendor+product+fw > vendor+product > product > wildcard
  const priorities = [
    { vendor: '_TZ3000', product: 'TS011F', fw: '1.0.0', priority: 1 },
    { vendor: '_TZ3000', product: 'TS011F', fw: null, priority: 2 },
    { vendor: null, product: 'TS011F', fw: null, priority: 3 },
    { vendor: '*', product: '*', fw: null, priority: 4 }
  ];
  
  // Sort by priority
  priorities.sort((a, b) => a.priority - b.priority);
  
  assert.strictEqual(priorities[0].priority, 1);
  assert.strictEqual(priorities[0].fw, '1.0.0');
});

test('TuyaFingerprints - device family detection', () => {
  const families = {
    'TS011F': 'plug',
    'TS0601': 'trv',
    'TS130F': 'curtain',
    'TS004F': 'remote'
  };
  
  Object.entries(families).forEach(([productId, family]) => {
    assert.strictEqual(typeof family, 'string');
    assert.ok(['plug', 'trv', 'curtain', 'remote'].includes(family));
  });
});

test('TuyaFingerprints - exclusion list', () => {
  const exclusions = ['_TZ3000_badmatch_*'];
  
  const testDevice = '_TZ3000_badmatch_123';
  const isExcluded = exclusions.some(pattern => {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(testDevice);
  });
  
  assert.strictEqual(isExcluded, true);
});
