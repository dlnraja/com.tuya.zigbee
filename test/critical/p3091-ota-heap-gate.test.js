'use strict';
// P3091 (Bastien diag 7f72cffe): OOM inside JSON.parse with the heap already ~57 MB.
// The zigbee-OTA index fetch now refuses to download/parse when the heap is above 40 MB.
const { describe, it } = require('../_support/dual-runner');
const assert = require('assert');
const { p3091HeapGate } = require('../../lib/ota/TuyaXiaomiOTAProvider');

describe('P3091 OTA index heap gate', () => {
  it('throws when heap is high, passes when low', () => {
    const orig = process.memoryUsage;
    try {
      process.memoryUsage = () => ({ heapUsed: 57 * 1048576 });
      assert.throws(() => p3091HeapGate(), /OTA-HEAP/);
      process.memoryUsage = () => ({ heapUsed: 20 * 1048576 });
      assert.doesNotThrow(() => p3091HeapGate());
      process.memoryUsage = () => { throw new Error('EPERM'); };
      assert.doesNotThrow(() => p3091HeapGate());
    } finally { process.memoryUsage = orig; }
  });
});
