'use strict';
// P3226: a leaked critical shared MemoryBudget changes MethodChain backoff (x4);
// _resetShared() must restore nominal behaviour (root cause of P3016/P3017/P3023 'not ok').
const { describe, it } = require('node:test');
const assert = require('node:assert');
const MB = require('../../lib/memory/MemoryBudget');
const MC = require('../../lib/zigbee/MethodChain');

async function firstUntil() {
  const d = { store: {}, getStoreValue(k) { return this.store[k]; }, async setStoreValue(k, v) { this.store[k] = v; }, log() {}, error() {} };
  const steps = [{ name: 'zcl-native', run: async () => { throw Object.assign(new Error('UNSUPPORTED_ATTRIBUTE'), { status: 0x86 }); } }, { name: 'tuya-dp', run: async () => 2 }];
  await MC.runChain(d, 'read.x', steps, { now: 0 });
  return MC.snapshot(d)['read.x'].demoted['zcl-native'].until;
}

describe('P3226 MemoryBudget shared isolation', () => {
  it('critical shared budget scales backoff x4; _resetShared restores the nominal ladder', async () => {
    MB._resetShared();
    MB.shared().level = 'critical';
    assert.strictEqual(MB.reprobeFactor(), 4);
    assert.strictEqual(await firstUntil(), MC.BACKOFF_MS[0] * 4);
    MB._resetShared();
    assert.strictEqual(MB.reprobeFactor(), 1);
    assert.strictEqual(await firstUntil(), MC.BACKOFF_MS[0]);
  });
});
