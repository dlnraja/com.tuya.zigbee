'use strict';
// P3002c — zigbee-clusters 2.6.0 (pinned) throws `new Error(status)` with the zclTypes short
// names (UNSUP_CLUSTER_COMMAND 0x81, UNSUP_MANUF_CLUSTER_COMMAND 0x83, UNSUP_MANUF_GENERAL_COMMAND
// 0x84); 3.9.0 throws ZCLError('UNSUPPORTED_CLUSTER') ("ZCL Error: UNSUPPORTED_CLUSTER", zclStatus).
// Both must be recognised as "unsupported by design"; transient errors must not.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { isUnsupportedError } = require('../../lib/zigbee/UnsupportedRegistry');

describe('P3002c unsupported ZCL status names', () => {
  it('2.6.0 short status names', () => {
    for (const n of ['UNSUP_CLUSTER_COMMAND', 'UNSUP_GENERAL_COMMAND', 'UNSUP_MANUF_CLUSTER_COMMAND', 'UNSUP_MANUF_GENERAL_COMMAND']) {
      assert.equal(isUnsupportedError(new Error(n)), true, n);
    }
  });
  it('numeric 0x83 / 0x84', () => {
    assert.equal(isUnsupportedError({ status: 0x83 }), true);
    assert.equal(isUnsupportedError({ status: 0x84 }), true);
  });
  it('3.9.0 ZCLError shape (forward-compatible)', () => {
    const e = Object.assign(new Error('ZCL Error: UNSUPPORTED_CLUSTER'), { zclStatus: 'UNSUPPORTED_CLUSTER' });
    assert.equal(isUnsupportedError(e), true);
  });
  it('transient errors stay transient', () => {
    for (const m of ['Timeout', 'FAILURE', 'BUSY', 'Could not reach device', 'INSUFFICIENT_SPACE']) {
      assert.equal(isUnsupportedError(new Error(m)), false, m);
    }
  });
});
