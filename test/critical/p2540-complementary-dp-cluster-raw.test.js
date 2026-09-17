'use strict';

/**
 * P2540 — Complementary DP / cluster / raw / RX-TX Contre quoi.
 * BOTH: union alternates; never wipe EF00; never invent pid.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

describe('P2540 complementary DP/cluster/raw RX-TX', () => {
  it('SSOT locks RX/TX orders + AQ complementary ZCL list', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-rx-tx-dp-cluster-ssot.json'), 'utf8')
    );
    assert.ok(['P2540', 'P2544'].includes(ssot.patch), `unexpected patch ${ssot.patch}`);
    assert.equal(ssot.doctrine.complementaryOnly, true);
    assert.equal(ssot.doctrine.ef00AndZclParallelOk, true);
    assert.ok(ssot.rxOrderCanonical.includes('tuya_dp_report'));
    assert.ok(ssot.rxOrderCanonical.includes('raw_cluster_fallback'));
    assert.ok(ssot.txOrderCanonical.includes('raw_zcl_frame'));
    assert.ok(ssot.protocolPaths.includes('raw_frame'));
    assert.equal(ssot.airQualityComplementary.driver, 'air_quality_co2');
    assert.ok(ssot.airQualityComplementary.rawFallbackMustListen.includes('msCO2'));
  });

  it('ProtocolFallbackChain default orders match SSOT (complementary catalog)', () => {
    const ssot = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'config/architecture/complementary-rx-tx-dp-cluster-ssot.json'), 'utf8')
    );
    const PFC = require(path.join(ROOT, 'lib/io/ProtocolFallbackChain.js'));
    const chain = new PFC({ log() {} });
    assert.deepEqual([...chain.rxOrder], ssot.rxOrderCanonical);
    assert.deepEqual([...chain.txOrder], ssot.txOrderCanonical);
  });

  it('ProtocolRxTxChain inventories all complementary paths + AQ ZCL cluster hints', () => {
    const { PROTOCOL_PATHS } = require(path.join(ROOT, 'lib/layers/ProtocolRxTxChain.js'));
    for (const id of ['tuya_dp', 'zcl', 'raw_frame', 'raw_value', 'tuya_bound', 'ias', 'mcu']) {
      assert.ok(PROTOCOL_PATHS[id], `missing path ${id}`);
    }
    assert.ok(Array.isArray(PROTOCOL_PATHS.zcl.complementaryClusters));
    assert.ok(PROTOCOL_PATHS.zcl.complementaryClusters.includes(0x040d));
  });

  it('RawClusterFallback listens CO2/VOC/HCHO/PM25 (not map-only)', () => {
    const Raw = require(path.join(ROOT, 'lib/clusters/RawClusterFallback.js'));
    const attrs = Raw.CLUSTER_ATTRS;
    const map = Raw.ZCL_AUTO_MAP;
    for (const name of ['msCO2', 'carbonDioxideMeasurement', 'pm25Measurement', 'formaldehydeMeasurement', 'vocMeasurement']) {
      assert.ok(attrs[name]?.includes('measuredValue'), `CLUSTER_ATTRS missing ${name}`);
    }
    assert.equal(map['msCO2.measuredValue'].cap, 'measure_co2');
    assert.equal(map['carbonDioxideMeasurement.measuredValue'].cap, 'measure_co2');
    assert.equal(map['pm25Measurement.measuredValue'].cap, 'measure_pm25');
    assert.equal(map['vocMeasurement.measuredValue'].cap, 'measure_voc');
    assert.equal(map['formaldehydeMeasurement.measuredValue'].cap, 'measure_formaldehyde');
  });

  it('air_quality_co2 keeps EF00 airbox map AND complementary ZCL listeners', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers/air_quality_co2/device.js'), 'utf8');
    assert.match(src, /isAirboxZ2m/);
    assert.match(src, /P2540/);
    assert.match(src, /carbonDioxideMeasurement/);
    assert.match(src, /pm25Measurement/);
    assert.match(src, /vocMeasurement/);
    assert.match(src, /formaldehydeMeasurement/);
    assert.match(src, /confirmInbound|source:\s*'zcl'/);
    // Contre quoi: must not drop EF00 DP2 co2 path
    assert.match(src, /2:\s*\{\s*capability:\s*'measure_co2'/);
  });
});
