'use strict';

/**
 * P2699 — Non-native Homey DP/clusters = complementary ONLY (never mandatory).
 * Contre quoi: compose/bind/boot treating 0xEF00/0xE000/0xED00/AQ ZCL as required.
 * BOTH tracks. SSOT: complementary-rx-tx-dp-cluster-ssot.json
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2699 non-native DP/cluster complementary never mandatory', () => {
  it('SSOT locks complementary_never_mandatory + helper path', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-rx-tx-dp-cluster-ssot.json'), 'utf8')
    );
    assert.ok(['P2699', 'P2700'].includes(ssot.patch), `unexpected patch ${ssot.patch}`);
    assert.equal(ssot.doctrine.nonNativeNeverMandatory, true);
    assert.equal(ssot.doctrine.complementaryOnly, true);
    assert.equal(ssot.doctrine.softArmRawRxTxPfc, true);
    assert.equal(ssot.nonNativeHomeyGaps.mode, 'complementary_never_mandatory');
    assert.ok(ssot.nonNativeHomeyGaps.never.includes('hard_throw_missing_ef00_on_boot'));
    assert.ok(ssot.nonNativeHomeyGaps.always.includes('parallel_rx_tx_cascade'));
    assert.ok(ssot.nonNativeHomeyGaps.always.includes('raw_frame_parse'));
    assert.ok(ssot.nonNativeHomeyGaps.always.includes('protocol_rxtx_chain'));
    assert.ok(ssot.nonNativeHomeyGaps.clusterExamples.includes('0xEF00'));
    assert.equal(ssot.nonNativeHomeyGaps.runtimeHelper, 'lib/io/NonNativeComplementary.js');
    assert.ok(ssot.nonNativeHomeyGaps.softArmTargets.includes('RawClusterFallback'));
    assert.ok(ssot.nonNativeHomeyGaps.softArmTargets.includes('ProtocolFallbackChain'));
    assert.ok(ssot.nonNativeHomeyGaps.softArmTargets.includes('ProtocolRxTxChain'));
  });

  it('NonNativeComplementary classifies proprietary clusters + soft policy', () => {
    const {
      isNonNativeCluster,
      complementaryPolicyFor,
      softArmComplementaryIo,
      shouldSoftContinueMissingCluster,
    } = require(path.join(ROOT, 'lib/io/NonNativeComplementary.js'));

    assert.equal(isNonNativeCluster(0xEF00), true);
    assert.equal(isNonNativeCluster(61184), true);
    assert.equal(isNonNativeCluster(0xED00), true);
    assert.equal(isNonNativeCluster('msCO2'), true);
    assert.equal(isNonNativeCluster(6), false); // OnOff native

    const pol = complementaryPolicyFor(0xEF00);
    assert.equal(pol.complementaryOnly, true);
    assert.equal(pol.neverMandatory, true);
    assert.equal(pol.softArm, true);

    assert.equal(shouldSoftContinueMissingCluster('Tuya cluster not available'), true);
    assert.equal(shouldSoftContinueMissingCluster(new Error('missing_cluster')), true);

    // softArm never throws even on empty device
    assert.doesNotThrow(() => softArmComplementaryIo(null));
    const armed = softArmComplementaryIo({ setStoreValue: async () => {} });
    assert.equal(armed.ok, true);
    assert.ok(armed.armed.includes('store_flag'));
    // P2700: soft-arm must attempt raw + PFC + rxtx (or mark present)
    const joined = armed.armed.join(',');
    assert.ok(/raw_cluster_fallback|raw_cluster_fallback_present/.test(joined), joined);
    assert.ok(/protocol_fallback_chain|protocol_fallback_chain_present/.test(joined), joined);
    assert.ok(/protocol_rxtx_chain|protocol_rxtx_present/.test(joined), joined);
  });

  it('HomeyCompensationLayer.attach soft-arms NonNativeComplementary (no throw)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/io/HomeyCompensationLayer.js'), 'utf8');
    assert.match(src, /P2699/);
    assert.match(src, /softArmComplementaryIo/);
    assert.match(src, /NonNativeComplementary/);
    assert.match(src, /never mandatory/i);
  });

  it('DeviceIOFacade soft-arms complementary raw/RX-TX on attach (P2700)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/io/DeviceIOFacade.js'), 'utf8');
    assert.match(src, /P2700/);
    assert.match(src, /softArmComplementaryIo/);
    assert.match(src, /NonNativeComplementary/);
  });

  it('TuyaMagicPacket handshake is complementary soft (not mandatory wording)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/zigbee/TuyaMagicPacket.js'), 'utf8');
    assert.match(src, /complementary/i);
    assert.doesNotMatch(src, /mandatory basic-cluster handshake/i);
  });

  it('TX paths soft-fail missing EF00 instead of hard-throw (P2699)', () => {
    const wrapper = fs.readFileSync(path.join(ROOT, 'lib/tuya/TuyaClusterWrapper.js'), 'utf8');
    const binder = fs.readFileSync(path.join(ROOT, 'lib/clusters/UniversalClusterBinder.js'), 'utf8');
    const mixin = fs.readFileSync(path.join(ROOT, 'lib/mixins/TuyaDeviceMixin.js'), 'utf8');
    // Contre quoi: must not reintroduce bare throw on missing cluster in these TX entrypoints
    assert.match(wrapper, /P2699/);
    assert.match(wrapper, /return false/);
    assert.doesNotMatch(wrapper, /throw new Error\('Tuya cluster not available'\)/);
    assert.match(binder, /P2699/);
    assert.doesNotMatch(binder, /throw new Error\('Tuya cluster not available'\)/);
    assert.match(mixin, /P2699/);
    assert.doesNotMatch(mixin, /throw new Error\('Tuya cluster not available'\)/);
  });

  it('Bastien TS0043 live couple soft-arms complementary E000 (never EF00 mandatory)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/button_wireless_3/device.js'), 'utf8');
    assert.match(src, /softArmComplementaryIo/);
    assert.match(src, /noEf00/);
    assert.match(src, /57344|E000/);
    assert.match(src, /skipEf00Tx:\s*true/);
  });
});
