'use strict';
// Log 91654f87 (stable 5.12.538): radar kept writing DPs after
// "Impossible de joindre l'appareil. Est-il allumé ?".
// Wilfried, master 9.0.1615: the meter flooded the mesh (~128 msg/min) and the
// app then reported low CPU memory. That is not the Bastien JSON.parse abort.
// House buttons: ZCL 200 is 100% (interview), 255 is unknown, a stored 100
// without a report is not fresh, and those three profiles do not TX for battery.

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isReachabilityError, isHardUnreachable, noteReachabilityFailure,
  automatedTxCooling, clearAutomatedTxCooldown, AUTOMATED_TX_COOLDOWN_MS,
} = require('../../lib/reliability/ZigbeeResilience');
const { tuyaDataQuery } = require('../../lib/tuya/TuyaDataQuery');
const { normalizeZclBatteryPercent } = require('../../lib/battery/zcl-percent');
const { batteryTileReportIsFresh, storedBatteryMayRestore } = require('../../lib/battery/button-battery-report');
const { shouldSkipSleepyRemoteBatteryTx } = require('../../lib/zigbee/PowerClusterPolicy');

const GONE = "Impossible de joindre l'appareil. Est-il allumé ?";

describe('P3273 unreachable batch stops, house button battery stays honest', () => {
  it('the Homey French unreachable string stops a DP batch and does not treat a timeout as that stop', () => {
    assert.equal(isReachabilityError(new Error(GONE)), true);
    assert.equal(isHardUnreachable(new Error(GONE)), true);
    assert.equal(isReachabilityError(new Error('Timeout')), true);
    assert.equal(isHardUnreachable(new Error('Timeout')), false);
    assert.equal(isHardUnreachable(new Error('invalid value')), false);
    const target = {};
    assert.equal(noteReachabilityFailure(target, new Error('Timeout')), false);
    assert.equal(automatedTxCooling(target), false);
    const now = 1_000_000;
    assert.equal(noteReachabilityFailure(target, new Error(GONE), now), true);
    assert.equal(automatedTxCooling(target, now + AUTOMATED_TX_COOLDOWN_MS - 1), true);
    assert.equal(automatedTxCooling(target, now + AUTOMATED_TX_COOLDOWN_MS + 1), false);
    clearAutomatedTxCooldown(target);
    assert.equal(automatedTxCooling(target, now + 1), false);
  });

  it('tuyaDataQuery does not walk the rest of the list after the device is gone', async () => {
    const calls = [];
    const manager = {
      async requestDP(dp) {
        calls.push(dp);
        noteReachabilityFailure(manager, new Error(GONE));
        return false;
      },
    };
    const device = {
      zclNode: { endpoints: { 1: { clusters: { tuya: {} } } } },
      tuyaEF00Manager: manager,
      log() {},
      error() {},
    };
    const ok = await tuyaDataQuery(device, [1, 2, 4, 101, 102], { delayBetweenQueries: 0 });
    assert.equal(ok, false);
    assert.deepEqual(calls, [1]);
  });

  it('house button raw 200 is 100%, 255 and a stale 100 are not a fresh report, and those profiles do not TX', () => {
    for (const manufacturer of ['_TZ3000_axpdxqgu', '_TZ3000_dzwgk7e2', '_TZ3000_vsxvaj9i']) {
      const opts = { manufacturer, profile: { zcl200IsPercent: true } };
      assert.equal(normalizeZclBatteryPercent(200, opts), 100, manufacturer);
      assert.equal(normalizeZclBatteryPercent(255, opts), null, manufacturer);
      assert.equal(shouldSkipSleepyRemoteBatteryTx({
        productId: manufacturer === '_TZ3000_axpdxqgu' ? 'TS0041'
          : manufacturer === '_TZ3000_dzwgk7e2' ? 'TS0042' : 'TS0043',
        skipBatteryReporting: true,
        sceneSwitch: true,
      }), true);
    }
    assert.equal(storedBatteryMayRestore(100, false), false);
    assert.equal(storedBatteryMayRestore(100, true), true);
    assert.equal(batteryTileReportIsFresh(100, null), false);
    assert.equal(normalizeZclBatteryPercent(0, { manufacturer: '_TZ3000_vsxvaj9i' }), 0);
  });
});
