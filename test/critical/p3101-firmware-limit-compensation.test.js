'use strict';
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const assert = require('assert');
const FLC = require('../../lib/compensation/FirmwareLimitCompensation');
const audit = require('../../scripts/ci/firmware-limit-audit');

function fakeDevice() {
  const store = {};
  const timers = [];
  return {
    store, timers,
    homey: { setInterval: (fn, ms) => { const t = { fn, ms }; timers.push(t); return t; }, clearInterval: (t) => { t.cleared = true; } },
    getStoreValue: (k) => store[k],
    setStoreValue: async (k, v) => { store[k] = v; },
    log() {},
  };
}

describe('P3101 firmware-limit compensation', () => {
  it('only exact listed couples attach; flagged alarm estimate; real DP wins; bounded poll; config valid', async () => {
    assert.strictEqual(FLC.attach(fakeDevice(), { mfr: '_TZE200_other123', pid: 'TS0601' }), null);
    assert.strictEqual(FLC.attach(fakeDevice(), { mfr: '_TZE200_rxq4iti9', pid: 'TS0201' }), null);
    const d = fakeDevice();
    const c = FLC.attach(d, { mfr: '_tze200_RXQ4ITI9', pid: 'ts0601' });
    assert.ok(c);
    assert.ok(d.timers[0].ms >= 60 * 60 * 1000);
    const est = c.onAlarmBattery(true);
    assert.strictEqual(est.percent, 15);
    assert.strictEqual(est.origin, 'estimated');
    assert.strictEqual(c.onAlarmBattery(false), null);
    c.handleDp(13);
    assert.strictEqual(d.store.fwlimit_measure_battery_real, true);
    assert.strictEqual(c.onAlarmBattery(true), null);
    c._polls = Array.from({ length: 12 }, () => Date.now());
    assert.strictEqual(await c.pollOnce(), false);
    c.destroy();
    assert.ok(d.timers[0].cleared);
    assert.strictEqual(d.__fwLimit, null);
    assert.deepStrictEqual(audit.validate(), []);
  });
});
