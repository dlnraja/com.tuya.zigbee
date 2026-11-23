'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const {
  filterRestoreDps,
  shouldBlockWrite,
  isFeedDp,
} = require('../lib/tuya-local/FeederInitGuard');

describe('P3384 FeederInitGuard (forum 154077 #477, never dispense on restart)', () => {
  const ctx = { driverId: 'wifi_pet_feeder' };

  it('strips feed DPs from restore_on_reconnect payloads', () => {
    const filtered = filterRestoreDps({ 1: true, 3: 1, 4: 2, 9: 0 }, ctx);
    assert.deepStrictEqual(filtered, { 1: true, 9: 0 });
  });

  it('blocks a feed write in the post-connect window', () => {
    assert.strictEqual(shouldBlockWrite(3, { ...ctx, connectedAt: 1000, now: 2000 }), true);
  });

  it('allows an explicit user feed even right after connect', () => {
    assert.strictEqual(shouldBlockWrite(3, { ...ctx, connectedAt: 1000, now: 1100, userAction: true }), false);
  });

  it('does not treat DP 3 as feed on a non-feeder device', () => {
    assert.strictEqual(isFeedDp(3, { driverId: 'wifi_plug' }), false);
    assert.strictEqual(shouldBlockWrite(3, { driverId: 'wifi_plug', connectedAt: 1000, now: 1100 }), false);
  });
});
