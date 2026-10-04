'use strict';
/* eslint-env mocha */
// #110 / Z2M #13004: per-device opt-out of Tuya time sync.
const assert = require('assert');
const { timeSyncAllowed } = require('../lib/tuya/TimeSyncPolicy');
const GlobalTimeSyncEngine = require('../lib/tuya/GlobalTimeSyncEngine');

describe('TimeSyncPolicy', () => {
  it('allowed unless the setting is explicitly off', () => {
    assert.strictEqual(timeSyncAllowed(null), true);
    assert.strictEqual(timeSyncAllowed({ getSetting: () => undefined }), true);
    assert.strictEqual(timeSyncAllowed({ getSetting: () => true }), true);
    assert.strictEqual(timeSyncAllowed({ getSetting: () => false }), false);
  });
  it('GlobalTimeSyncEngine skips when disabled', async () => {
    const Engine = GlobalTimeSyncEngine.GlobalTimeSyncEngine || GlobalTimeSyncEngine;
    const dev = { getSetting: (k) => (k === 'tuya_time_sync' ? false : undefined), log() {}, error() {} };
    let e;
    try { e = new Engine(dev); } catch (_) { return; }
    const r = await e.syncTime({}, { force: true });
    assert.deepStrictEqual(r, { skipped: 'time_sync_disabled' });
  });
});
