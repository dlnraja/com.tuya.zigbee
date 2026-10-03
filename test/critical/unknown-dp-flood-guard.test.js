'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const { logUnknownDP } = require('../../lib/utils/UnknownDPLogger');

function fakeDevice() {
  const logs = []; const store = [];
  return {
    logs, store,
    log: (m) => logs.push(String(m)),
    getSetting: () => null,
    setStoreValue: (k, v) => { store.push(k); return Promise.resolve(); },
    homey: { setTimeout: () => 1 },
  };
}

describe('Spec 006: unknown DP flood guard', () => {
  it('1200 identical samples -> one log line, one store write, all counted', () => {
    const d = fakeDevice();
    for (let i = 0; i < 1200; i++) logUnknownDP(d, 36, 1);
    assert.strictEqual(d.logs.filter((l) => l.startsWith('[UNKNOWN-DP] DP36')).length, 1);
    assert.strictEqual(d.store.filter((k) => k.startsWith('_unknown_dp_')).length, 1);
    assert.strictEqual(d._unknownDPs[36].count, 1200);
  });
  it('changed value logs immediately; other DPs independent', () => {
    const d = fakeDevice();
    logUnknownDP(d, 36, 1); logUnknownDP(d, 36, 1); logUnknownDP(d, 36, 2); logUnknownDP(d, 37, 1);
    const l = d.logs.filter((x) => x.startsWith('[UNKNOWN-DP] DP'));
    assert.strictEqual(l.length, 3);
    assert.ok(l[1].includes('+1 identical repeat'));
  });
  it('Buffers compared by content', () => {
    const d = fakeDevice();
    logUnknownDP(d, 101, Buffer.from([1, 2])); logUnknownDP(d, 101, Buffer.from([1, 2]));
    logUnknownDP(d, 101, Buffer.from([1, 3]));
    assert.strictEqual(d.logs.filter((x) => x.startsWith('[UNKNOWN-DP] DP101')).length, 2);
  });
});
