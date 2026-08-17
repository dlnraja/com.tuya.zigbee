'use strict';

/**
 * P214 — Intelligent ZCL ↔ EF00 adaptation for all driver lineages.
 */

const assert = require('assert');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  detectIntelligentProtocol,
  applyIntelligentProtocol,
  isSacredZclOnlyManufacturer,
} = require('../../lib/protocol/IntelligentProtocolDetect');

function mockDevice(opts = {}) {
  const settings = {
    zb_manufacturer_name: opts.mfr || '',
    zb_model_id: opts.modelId || '',
  };
  const clusters = opts.clusters || {};
  return {
    getSettings: () => settings,
    getData: () => ({ manufacturerName: opts.mfr, modelId: opts.modelId }),
    getStore: () => ({}),
    _manufacturerConfig: opts.profile || null,
    zclNode: {
      endpoints: {
        1: { clusters },
      },
      manufacturerName: opts.mfr,
      modelId: opts.modelId,
    },
  };
}

describe('P214 IntelligentProtocolDetect', () => {
  it('marks sacred BSEED manufacturers as zcl_only', () => {
    assert.strictEqual(isSacredZclOnlyManufacturer('_TZ3000_w5xztuy7'), true);
    const info = detectIntelligentProtocol(mockDevice({
      mfr: '_TZ3000_w5xztuy7',
      modelId: 'TS0002',
      clusters: { onOff: {}, genOnOff: {} },
    }));
    assert.strictEqual(info.protocol, 'zcl_only');
    assert.strictEqual(info.isPureTuyaDP, false);
    assert.strictEqual(info.listenHybrid, false);
  });

  it('uses HYBRID when EF00 and ZCL both present', () => {
    const info = detectIntelligentProtocol(mockDevice({
      mfr: '_TZ3000_abc',
      modelId: 'TS0001',
      clusters: { onOff: {}, tuya: {}, manuSpecificTuya: {} },
    }));
    assert.strictEqual(info.protocol, 'HYBRID');
    assert.strictEqual(info.listenHybrid, true);
    assert.strictEqual(info.isPureTuyaDP, false);
    assert.strictEqual(info.hasTuyaCluster, true);
  });

  it('uses TUYA_DP when only EF00 is present', () => {
    const info = detectIntelligentProtocol(mockDevice({
      mfr: '_TZE284_m1cvyneb',
      modelId: 'TS0601',
      clusters: { tuya: {} },
    }));
    assert.strictEqual(info.protocol, 'TUYA_DP');
    assert.strictEqual(info.isPureTuyaDP, true);
  });

  it('TS0601 without EF00 but with ZCL → ZCL escape hatch', () => {
    const info = detectIntelligentProtocol(mockDevice({
      mfr: '_TZE200_3towulqd',
      modelId: 'TS0601',
      clusters: { iasZone: {}, illuminanceMeasurement: {} },
    }));
    assert.strictEqual(info.protocol, 'ZCL');
    assert.strictEqual(info.reason, 'ts0601_zcl_only_no_ef00');
    assert.strictEqual(info.isPureTuyaDP, false);
  });

  it('TS130F covers stay ZCL', () => {
    const info = detectIntelligentProtocol(mockDevice({
      mfr: '_TZ3000_bs93npae',
      modelId: 'TS130F',
      clusters: {},
    }));
    assert.strictEqual(info.protocol, 'ZCL');
    assert.strictEqual(info.reason, 'ts130f_zcl_cover');
  });

  it('applyIntelligentProtocol sets device flags', () => {
    const d = mockDevice({
      mfr: '_TZE200_xyz',
      modelId: 'TS0601',
      clusters: {},
    });
    const info = applyIntelligentProtocol(d);
    assert.ok(info.listenHybrid);
    assert.strictEqual(d._protocolInfo.protocol, info.protocol);
    assert.strictEqual(d._listenHybrid, true);
  });

  it('Unified bases delegate to IntelligentProtocolDetect', () => {
    const fs = require('fs');
    const root = path.join(__dirname, '..', '..');
    for (const rel of [
      'lib/devices/UnifiedSwitchBase.js',
      'lib/devices/UnifiedSensorBase.js',
      'lib/devices/UnifiedPlugBase.js',
      'lib/devices/UnifiedLightBase.js',
      'lib/devices/UnifiedCoverBase.js',
      'lib/devices/UnifiedThermostatBase.js',
      'lib/layers/UniversalLayerBootstrap.js',
    ]) {
      const src = fs.readFileSync(path.join(root, rel), 'utf8');
      assert.match(src, /IntelligentProtocolDetect/, rel);
    }
  });
});
