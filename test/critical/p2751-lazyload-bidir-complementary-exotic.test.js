'use strict';

/**
 * P2750 — Intelligent Lazy/Dynamic Loading + Bidirectional UI/UX + Non-Mandatory Exotic Wrappers
 *
 * Contre quoi:
 *  1) OOM on 64MB Homey Pro from unbounded shard accumulation or eager module requires
 *  2) Out-of-sync Homey UI tiles when physical switch flipped / dead virtual button UI feedback
 *  3) Boot/pairing crash or throw when exotic DPs (101..120, 200..250) or non-native clusters
 *     (0xEF00, 0xED00, 0xFC00, 0xFD00, 0xE000, 0x4000...) receive raw frames or streams
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2750 Lazy Load, Bi-dir UI/UX & Non-Mandatory Exotic Wrappers', () => {

  it('IntelligentLazyLoad exports lazyModule, lazyGetter, safeDynamicRequire, evictLruShards', () => {
    const Lazy = require('../../lib/performance/IntelligentLazyLoad');
    assert.equal(typeof Lazy.lazyModule, 'function');
    assert.equal(typeof Lazy.lazyGetter, 'function');
    assert.equal(typeof Lazy.safeDynamicRequire, 'function');
    assert.equal(typeof Lazy.evictLruShards, 'function');

    // Test lazyGetter defines accessor and caches own property on access
    const obj = {};
    let calls = 0;
    Lazy.lazyGetter(obj, 'testProp', () => {
      calls++;
      return { val: 42 };
    });
    assert.equal(calls, 0, 'Factory not called before read');
    assert.equal(obj.testProp.val, 42, 'Factory called on first read');
    assert.equal(calls, 1, 'Factory called exactly once');
    assert.equal(obj.testProp.val, 42, 'Cached value returned on second read');
    assert.equal(calls, 1, 'Factory not re-executed');

    // Test safeDynamicRequire
    assert.equal(Lazy.safeDynamicRequire('non_existent_fake_module_xyz', 'fallback'), 'fallback');

    // Test evictLruShards
    const set = new Set(['shard1', 'shard2', 'shard3']);
    const accessMap = new Map([
      ['shard1', 100],
      ['shard2', 200],
      ['shard3', 300],
    ]);
    const evicted = Lazy.evictLruShards(set, accessMap, 2);
    assert.equal(evicted.length, 1);
    assert.equal(evicted[0], 'shard1');
    assert.ok(!set.has('shard1'));
    assert.ok(set.has('shard2'));
    assert.ok(set.has('shard3'));
  });

  it('DeviceFingerprintDB tracks shard LRU and exports evictShardsUnderPressure', () => {
    const DB = require('../../lib/tuya/DeviceFingerprintDB');
    assert.equal(typeof DB.evictShardsUnderPressure, 'function');
    assert.doesNotThrow(() => DB.evictShardsUnderPressure());
  });

  it('HomeyButtonUiCharter supports bi-directional physical sync and softPulse tile updates', async () => {
    const {
      syncPhysicalToHomeyUi,
      softPulsePhysicalUi,
      handleVirtualUiPress,
    } = require('../../lib/utils/HomeyButtonUiCharter');

    const fakeDevice = {
      capabilities: ['onoff', 'button.1'],
      values: { onoff: false },
      hasCapability(c) { return this.capabilities.includes(c); },
      getCapabilityValue(c) { return this.values[c]; },
      async setCapabilityValue(c, v) { this.values[c] = v; return true; },
      async triggerButtonPress() { return true; },
      getClass() { return 'socket'; },
    };

    // Test physical sync updates onoff capability tile without echo TX
    const syncRes = await syncPhysicalToHomeyUi(fakeDevice, 1, { source: 'physical', value: true });
    assert.equal(syncRes.ok, true);
    assert.equal(syncRes.onoff, true);
    assert.equal(fakeDevice.values.onoff, true);

    // Test physical sync with toggle
    const toggleRes = await syncPhysicalToHomeyUi(fakeDevice, 1, { source: 'physical', toggle: true });
    assert.equal(toggleRes.ok, true);
    assert.equal(toggleRes.onoff, true);
    assert.equal(fakeDevice.values.onoff, false);

    // Test softPulsePhysicalUi updates onoff tile
    const softRes = softPulsePhysicalUi(fakeDevice, 1, { source: 'physical', value: true });
    assert.equal(softRes.ok, true);
    assert.equal(softRes.onoff, true);
  });

  it('NonNativeComplementary identifies exotic clusters and DPs without throwing', async () => {
    const {
      NON_NATIVE_CLUSTER_IDS,
      isNonNativeCluster,
      isExoticDp,
      safeWrapExoticDpHandler,
      safeStreamFilter,
    } = require('../../lib/io/NonNativeComplementary');

    // Clusters 0xEF00, 0xED00, 0xE000, 0xFC00, 0xFD00 must be recognized
    assert.ok(NON_NATIVE_CLUSTER_IDS.includes(0xEF00));
    assert.ok(NON_NATIVE_CLUSTER_IDS.includes(0xED00));
    assert.ok(NON_NATIVE_CLUSTER_IDS.includes(0xFC00));
    assert.ok(NON_NATIVE_CLUSTER_IDS.includes(0xFD00));
    assert.equal(isNonNativeCluster(0xFC00), true);
    assert.equal(isNonNativeCluster(0xFD00), true);
    assert.equal(isNonNativeCluster(6), false); // Native OnOff stays native

    // Exotic DPs
    assert.equal(isExoticDp(1), false); // Standard OnOff DP
    assert.equal(isExoticDp(101), true); // Gang 1 extra
    assert.equal(isExoticDp(105), true); // Inching / backlight
    assert.equal(isExoticDp(201), true); // Radar presence parameter

    // Safe exotic handler execution
    let executed = false;
    const handledRes = await safeWrapExoticDpHandler({}, 105, async (dp) => {
      executed = true;
      return true;
    });
    assert.equal(executed, true);
    assert.equal(handledRes.ok, true);
    assert.equal(handledRes.complementary, true);

    // Safe error catch without throw
    const errorRes = await safeWrapExoticDpHandler({}, 201, async () => {
      throw new Error('proprietary stream error');
    });
    assert.equal(errorRes.ok, false);
    assert.equal(errorRes.handled, false);
    assert.equal(errorRes.complementary, true);
    assert.ok(errorRes.error.includes('proprietary stream error'));

    // Safe stream filter
    const streamRes = await safeStreamFilter({}, 'radar_distance', { d: 1.5 }, async (data) => {});
    assert.equal(streamRes.ok, true);
    assert.equal(streamRes.complementary, true);
  });

  it('ProtocolRxTxChain indexes exotic proprietary clusters', () => {
    const { classifyCluster } = require('../../lib/layers/ProtocolRxTxChain');
    assert.equal(classifyCluster(0xEF00), 'tuya_dp');
    assert.equal(classifyCluster(0xE000), 'tuya_bound');
    assert.equal(classifyCluster(0xED00), 'tuya_bound');
    assert.equal(classifyCluster(0xFC00), 'tuya_bound');
    assert.equal(classifyCluster(0xFD00), 'tuya_bound');
  });

});
