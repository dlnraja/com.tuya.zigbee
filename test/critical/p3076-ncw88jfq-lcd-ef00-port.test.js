'use strict';

/**
 * P3076 — port of master P2825 (Wilhelm Dall, Homey suggestion 16/10):
 * _TZ3210_ncw88jfq + TS0201 LCD, single endpoint, battery OK but temp/humidity empty.
 * Interview shape: EF00 + powerCfg, no native measurement cluster. Before this port the
 * HYBRID branch set isTuyaDP=false, which muted the DP climate path. Runtime-only port:
 * compose is untouched (nothing new required at pairing, already paired devices benefit).
 * Source: Wilhelm's suggestion + Z2M tuya.ts (ncw88jfq in the TS0201 humidity x10 list).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;
const ROOT = path.join(__dirname, '..', '..');
const { detectIntelligentProtocol } = require('../../lib/protocol/IntelligentProtocolDetect');

function mock(mfr, modelId, clusters) {
  return {
    getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: modelId }),
    getData: () => ({ manufacturerName: mfr, modelId }),
    getStore: () => ({}),
    zclNode: { endpoints: { 1: { clusters } }, manufacturerName: mfr, modelId },
  };
}

describe('P3076 ncw88jfq LCD single-EP EF00 temp/humidity (P2825 port)', () => {
  it('EF00 + powerCfg only -> HYBRID that prefers DPs', () => {
    const i = detectIntelligentProtocol(mock('_TZ3210_ncw88jfq', 'TS0201', { basic: {}, powerConfiguration: {}, 61184: {} }));
    assert.strictEqual(i.protocol, 'HYBRID');
    assert.strictEqual(i.isTuyaDP, true);
    assert.strictEqual(i.listenHybrid, true);
    assert.strictEqual(i.reason, 'ef00_powercfg_hybrid_prefer_dp');
  });

  it('EF00 + native temp/humidity keeps the previous HYBRID reason', () => {
    const i = detectIntelligentProtocol(mock('_TZ3210_ncw88jfq', 'TS0201', {
      temperatureMeasurement: {}, relativeHumidityMeasurement: {}, 61184: {},
    }));
    assert.strictEqual(i.protocol, 'HYBRID');
    assert.strictEqual(i.reason, 'ef00_and_zcl_present');
  });

  it('driver routes the LCD clones to HYBRID and the sensor base keeps T/H with EF00', () => {
    const dev = fs.readFileSync(path.join(ROOT, 'drivers/sensor_climate_temphumidsensor/device.js'), 'utf8');
    assert.ok(/containsCI\(mfr, 'ncw88jfq'\)[\s\S]{0,300}return 'HYBRID'/.test(dev));
    const base = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
    assert.ok(/P3076 port of master P2825[\s\S]{0,200}hasTuyaCluster/.test(base));
    assert.ok(base.includes("'_tz3210_ncw88jfq'"));
  });

  it('couple stays on sensor_climate_temphumidsensor with TS0201', () => {
    const z = JSON.parse(fs.readFileSync(path.join(ROOT, 'drivers/sensor_climate_temphumidsensor/driver.compose.json'), 'utf8')).zigbee;
    assert.ok(z.manufacturerName.some((m) => m.toLowerCase() === '_tz3210_ncw88jfq'));
    assert.ok(z.productId.includes('TS0201'));
  });
});
