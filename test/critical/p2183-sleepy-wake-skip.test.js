'use strict';

/**
 * Peter #2183 / Homey diag e181bc15:
 * Features stay (hybrid query, probe, IAS read, recovery, poll) but
 * they only TX in the wake window and when heap is not critical.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { tuyaDataQuery } = require('../../lib/tuya/TuyaDataQuery');
const { DataQuery } = require('../../lib/zigbee/ZigbeeDataQuery');
const { IntelligentDeviceAdapter } = require('../../lib/intelligent/IntelligentDeviceAdapter');
const BootBudget = require('../../lib/performance/BootBudget');

describe('P2183 sleepy wake skip', () => {
  it('does not fall through to cluster.command after requestDP skip', async () => {
    let commanded = 0;
    const device = {
      log: () => {},
      error: () => {},
      getName: () => 'contact_sensor',
      tuyaEF00Manager: { requestDP: async () => false },
      zclNode: {
        endpoints: {
          1: {
            clusters: {
              tuya: {
                command: async () => { commanded += 1; }
              }
            }
          }
        }
      }
    };
    const ok = await tuyaDataQuery(device, [1], { delayBetweenQueries: 0, silent: true });
    assert.strictEqual(ok, false);
    assert.strictEqual(commanded, 0);
  });

  it('skips hybrid dump on sleepy wake when no DPs have been seen', async () => {
    let queried = false;
    const device = {
      hasCapability: (c) => c === 'measure_battery',
      mainsPowered: false,
      forceActiveTuyaMode: false,
      log: () => {},
      tuyaDataQuery: async () => { queried = true; },
      zclNode: { endpoints: { 1: { clusters: {} } } }
    };
    const q = new DataQuery(device);
    q.zigbeeQuery.queryAllAttributes = async () => { queried = true; };
    await q._queryWhileAwake();
    assert.strictEqual(queried, false);
  });

  it('hybrid-queries only seen DPs on sleepy wake', async () => {
    const queried = [];
    const device = {
      hasCapability: (c) => c === 'measure_battery',
      mainsPowered: false,
      forceActiveTuyaMode: false,
      log: () => {},
      tuyaDataQuery: async (dps) => { queried.push(dps); },
      zclNode: { endpoints: { 1: { clusters: {} } } }
    };
    BootBudget.noteSeenDp(device, 101);
    device._bootBudgetHeapBytes = 8 * 1024 * 1024;
    const q = new DataQuery(device);
    q.zigbeeQuery.queryAllAttributes = async () => { queried.push('zcl'); };
    await q._queryWhileAwake();
    assert.deepStrictEqual(queried, [[101]]);
  });

  it('still hybrid-queries mains devices', async () => {
    let queried = false;
    const device = {
      hasCapability: () => false,
      mainsPowered: true,
      log: () => {},
      dpMappings: { 1: {} },
      tuyaDataQuery: async () => { queried = true; },
      zclNode: { endpoints: { 1: { clusters: {} } } }
    };
    const q = new DataQuery(device);
    q.zigbeeQuery.queryAllAttributes = async () => {};
    await q._queryWhileAwake();
    assert.strictEqual(queried, true);
  });

  it('defers hourly adapter probe on sleepy battery until wake', () => {
    const adapter = Object.create(IntelligentDeviceAdapter.prototype);
    adapter.device = {
      hasCapability: (c) => c === 'measure_battery',
      mainsPowered: false,
      _bootBudgetHeapBytes: 8 * 1024 * 1024
    };
    assert.strictEqual(adapter._isSleepyBattery(), true);
    assert.strictEqual(adapter._shouldProbeNow(), false);
    BootBudget.markRadioActivity(adapter.device);
    assert.strictEqual(adapter._shouldProbeNow(), true);
  });

  it('SOS enroll timeout is logged not this.error, and announce retries', () => {
    const sos = fs.readFileSync(
      path.join(__dirname, '..', '..', 'drivers/button_emergency_sos/device.js'),
      'utf8'
    );
    assert.match(sos, /Enroll response deferred \(sleepy\)/);
    assert.match(sos, /_sendIasEnrollResponse\('announce'\)/);
    assert.doesNotMatch(sos, /this\.error\('\[SOS\] Enroll response failed:/);
  });

  it('contact re-attaches IAS and only recovers Tuya when EF00 is awake', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'drivers/contact_sensor/device.js'),
      'utf8'
    );
    assert.match(src, /_reattachIasOnWake/);
    assert.match(src, /super\.onEndDeviceAnnounce/);
    assert.match(src, /forceRecovery/);
    assert.match(src, /shouldTxSleepy/);
  });

  it('water restores backup poll and secondary wake read, gated', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'drivers/water_leak_sensor/device.js'),
      'utf8'
    );
    assert.match(src, /pollInterval:\s*6 \* 60 \* 60 \* 1000/);
    assert.match(src, /_reattachIasOnWake/);
    assert.match(src, /Delayed secondary alarm read \(5s post-wake\)/);
  });

  it('IASZoneManager does not this.error on sleepy enroll timeout', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', '..', 'lib/managers/IASZoneManager.js'),
      'utf8'
    );
    assert.match(src, /sleepyTimeout/);
    assert.match(src, /Sleepy enroll verified on short wait/);
    assert.doesNotMatch(src, /device\.error\(`\[IAS\] ❌ Enrollment attempt/);
    assert.doesNotMatch(src, /device\.error\('\[IAS\] ❌ All enrollment/);
  });

  it('Peter flow cards do not use titleFormatted [[device]]', () => {
    const root = path.join(__dirname, '..', '..');
    const files = [
      'drivers/contact_sensor/driver.flow.compose.json',
      '.homeycompose/flow/triggers/battery_health_changed.json',
      '.homeycompose/flow/triggers/virtual_button_pressed.json',
    ];
    for (const rel of files) {
      const j = JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
      const blob = JSON.stringify(j);
      assert.ok(!blob.includes('[[device]]'), rel);
    }
  });
});
