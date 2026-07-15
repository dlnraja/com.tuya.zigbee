'use strict';

/**
 * Test suite for SleepyDeviceInit — v9.0.251 (P60)
 *
 * Forum reference: dlnraja v5.5.252 fix for ZG-204ZM (post #685):
 * - No blocking operations during init
 * - Only sets up listeners to receive data
 * - Device is marked available immediately
 * - Data will update when the sensor reports (on motion detection)
 */

const assert = require('assert');
const {
  fireAndForget,
  passiveInit,
  bindClusters,
  deferredRead,
  deferredTuyaDataRequest,
  setupIasZoneSleepy,
  ZCL_TIMEOUT_MS,
  DEFERRED_BATTERY_DELAY_MS,
} = require('../../lib/utils/SleepyDeviceInit');

let passed = 0;
let failed = 0;
function test(name, fn) {
  // Each test is async but we wrap in sync executor for simplicity
  const result = fn();
  if (result && typeof result.then === 'function') {
    return result.then(
      () => { passed++; console.log(`  ✓ ${name}`); },
      (err) => { failed++; console.log(`  ✗ ${name}: ${err.message}`); }
    );
  }
  try {
    result;
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e.message}`);
  }
}

const flush = () => new Promise((r) => setImmediate(r));

async function main() {
  console.log('=== SleepyDeviceInit tests (P60) ===');

  // 1. fireAndForget: null promise → false
  await test('fireAndForget: null promise returns false', () => {
    const dev = { log: () => {} };
    return fireAndForget(dev, null).then((r) => assert.strictEqual(r, false));
  });

  // 2. fireAndForget: undefined promise → false
  await test('fireAndForget: undefined promise returns false', () => {
    const dev = { log: () => {} };
    return fireAndForget(dev, undefined).then((r) => assert.strictEqual(r, false));
  });

  // 3. fireAndForget: non-promise → false
  await test('fireAndForget: non-promise value returns false', () => {
    const dev = { log: () => {} };
    return fireAndForget(dev, 42).then((r) => assert.strictEqual(r, false));
  });

  // 4. fireAndForget: resolves quickly
  await test('fireAndForget: fast resolution returns value', () => {
    const dev = { log: () => {} };
    return fireAndForget(dev, Promise.resolve('ok'), { name: 'test' }).then((r) => assert.strictEqual(r, 'ok'));
  });

  // 5. fireAndForget: rejects but doesn't throw
  await test('fireAndForget: rejection is logged, returns null', () => {
    let logged = null;
    const dev = { log: (msg) => { logged = msg; } };
    return fireAndForget(dev, Promise.reject(new Error('boom')), { name: 'fail-test' })
      .then((r) => {
        assert.strictEqual(r, null);
        assert.ok(logged.includes('fail-test'), 'should log the name');
        assert.ok(logged.includes('boom'), 'should log the error');
      });
  });

  // 6. fireAndForget: slow promise times out
  await test('fireAndForget: slow promise returns "timeout" within timeoutMs', () => {
    const dev = { log: () => {} };
    const slow = new Promise((r) => setTimeout(() => r('late'), 200));
    return fireAndForget(dev, slow, { timeoutMs: 50 })
      .then((r) => assert.strictEqual(r, 'timeout'));
  });

  // 7. fireAndForget: device with no .log() doesn't crash
  await test('fireAndForget: device without .log() does not throw', () => {
    const dev = {};
    return fireAndForget(dev, Promise.reject(new Error('e')))
      .then((r) => assert.strictEqual(r, null));
  });

  // 8. passiveInit: marks device available immediately
  await test('passiveInit: calls setAvailable on device', () => {
    let available = false;
    const dev = { setAvailable: () => { available = true; } };
    passiveInit(dev, () => Promise.resolve(), 'test');
    return flush().then(() => assert.strictEqual(available, true));
  });

  // 9. passiveInit: runs fn in background
  await test('passiveInit: runs fn in background', async () => {
    let fnRan = false;
    const dev = { setAvailable: () => {} };
    passiveInit(dev, () => { fnRan = true; return Promise.resolve(); }, 'test');
    await flush();
    await flush();
    assert.strictEqual(fnRan, true);
  });

  // 10. passiveInit: null device is no-op
  await test('passiveInit: null device does not throw', () => {
    passiveInit(null, () => {}, 'test');
    // No assertion, just doesn't throw
    return Promise.resolve();
  });

  // 11. passiveInit: null fn is no-op
  await test('passiveInit: null fn does not throw', () => {
    passiveInit({ setAvailable: () => {} }, null, 'test');
    return Promise.resolve();
  });

  // 12. bindClusters: returns count of bind-issued clusters
  await test('bindClusters: returns 0 on null zclNode', () => {
    const r = bindClusters(null, ['iasZone'], () => {});
    assert.strictEqual(r, 0);
  });

  // 13. bindClusters: returns 0 on null clusterNames
  await test('bindClusters: returns 0 on non-array clusterNames', () => {
    const r = bindClusters({ endpoints: { 1: { clusters: {} } } }, null, () => {});
    assert.strictEqual(r, 0);
  });

  // 14. bindClusters: counts clusters with .bind() method
  await test('bindClusters: counts clusters that have .bind()', () => {
    let bindCalls = 0;
    const zclNode = {
      endpoints: {
        1: {
          clusters: {
            iasZone: { bind: () => { bindCalls++; return Promise.resolve(); } },
            genPowerCfg: { bind: () => { bindCalls++; return Promise.resolve(); } },
            noBind: {} // no .bind() — should not count
          }
        }
      }
    };
    const r = bindClusters(zclNode, ['iasZone', 'genPowerCfg', 'noBind', 'missing'], () => {});
    assert.strictEqual(r, 2);
    return flush().then(() => assert.strictEqual(bindCalls, 2));
  });

  // 15. deferredRead: returns undefined on null device
  await test('deferredRead: null device returns undefined', () => {
    return deferredRead(null, {}, { cluster: 'foo', attributes: ['x'] })
      .then((r) => assert.strictEqual(r, undefined));
  });

  // 16. deferredRead: returns undefined on null zclNode
  await test('deferredRead: null zclNode returns undefined', () => {
    return deferredRead({}, null, { cluster: 'foo', attributes: ['x'] })
      .then((r) => assert.strictEqual(r, undefined));
  });

  // 17. deferredRead: returns undefined on null readSpec
  await test('deferredRead: null readSpec returns undefined', () => {
    return deferredRead({}, {}, null).then((r) => assert.strictEqual(r, undefined));
  });

  // 18. deferredRead: skips when cluster not found
  await test('deferredRead: cluster not found returns undefined', () => {
    return deferredRead({ log: () => {} }, { endpoints: { 1: { clusters: {} } } }, { cluster: 'missing', attributes: ['x'] })
      .then((r) => assert.strictEqual(r, undefined));
  });

  // 19. deferredRead: reads attributes when cluster present
  await test('deferredRead: reads attributes from cluster', async () => {
    const expected = { batteryPercentageRemaining: 80 };
    const dev = { log: () => {} };
    const zclNode = {
      endpoints: {
        1: {
          clusters: {
            genPowerCfg: {
              readAttributes: async () => expected,
            }
          }
        }
      }
    };
    const r = await deferredRead(dev, zclNode, { cluster: 'genPowerCfg', attributes: ['batteryPercentageRemaining'] }, 5);
    assert.deepStrictEqual(r, expected);
  });

  // 20. deferredTuyaDataRequest: null device is no-op
  await test('deferredTuyaDataRequest: null device does not throw', () => {
    deferredTuyaDataRequest(null, {}, [1, 2]);
    return Promise.resolve();
  });

  // 21. deferredTuyaDataRequest: empty dpIds is no-op
  await test('deferredTuyaDataRequest: empty dpIds does not throw', () => {
    deferredTuyaDataRequest({ log: () => {} }, {}, []);
    return Promise.resolve();
  });

  // 22. setupIasZoneSleepy: null iasCluster is no-op
  await test('setupIasZoneSleepy: null iasCluster does not throw', () => {
    setupIasZoneSleepy({}, null, {}, {});
    return Promise.resolve();
  });

  // 23. setupIasZoneSleepy: writes CIE + sends enroll response (non-blocking)
  await test('setupIasZoneSleepy: writes CIE address in fire-and-forget', async () => {
    let writeAttrsCalled = null;
    let enrollResponseCalled = null;
    const iasCluster = {
      writeAttributes: async (attrs) => { writeAttrsCalled = attrs; },
      zoneEnrollResponse: async (resp) => { enrollResponseCalled = resp; return {}; },
    };
    const dev = {
      log: () => {},
      homey: { zigbee: { getNetwork: () => ({ ieeeAddress: '00:11:22:33:44:55:66:77' }) } },
    };
    const zclNode = { endpoints: { 1: { clusters: { iasZone: { bind: () => Promise.resolve() } } } } };
    setupIasZoneSleepy(dev, iasCluster, zclNode, { onMotion: () => {} });
    // Wait long enough for the fire-and-forget to complete
    await new Promise((r) => setTimeout(r, 50));
    assert.ok(writeAttrsCalled, 'CIE address should be written');
    assert.strictEqual(writeAttrsCalled.iasCieAddress, '00:11:22:33:44:55:66:77');
    assert.ok(enrollResponseCalled, 'Enroll response should be sent');
  });

  // 24. setupIasZoneSleepy: invokes onMotion callback
  await test('setupIasZoneSleepy: invokes onMotion on zone status change', () => {
    let motionResult = null;
    const iasCluster = {
      onZoneEnrollRequest: null,
      onZoneStatusChangeNotification: null,
      listeners: {},
      on(name, fn) { this.listeners[name] = fn; },
    };
    const dev = { log: () => {} };
    setupIasZoneSleepy(dev, iasCluster, {}, { onMotion: (m) => { motionResult = m; } });
    // Simulate a zoneStatus change event
    if (iasCluster.listeners['attr.zoneStatus']) {
      iasCluster.listeners['attr.zoneStatus'](0x01); // alarm1 set
    }
    assert.strictEqual(motionResult, true);
  });

  // 25. Constants: ZCL_TIMEOUT_MS is short
  await test('constants: ZCL_TIMEOUT_MS <= 3000 (sleepy device)', () => {
    assert.ok(ZCL_TIMEOUT_MS <= 3000, 'ZCL timeout should be short for sleepy devices');
    assert.ok(ZCL_TIMEOUT_MS > 0);
  });

  // 26. Constants: DEFERRED_BATTERY_DELAY_MS gives device time to wake
  await test('constants: DEFERRED_BATTERY_DELAY_MS is reasonable', () => {
    assert.ok(DEFERRED_BATTERY_DELAY_MS >= 2000);
    assert.ok(DEFERRED_BATTERY_DELAY_MS <= 30000);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Test runner crashed:', err);
  process.exit(2);
});
