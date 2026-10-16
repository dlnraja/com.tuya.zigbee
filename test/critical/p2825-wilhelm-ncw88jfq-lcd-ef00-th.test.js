'use strict';

/**
 * P2825 — Wilhelm Homey suggestion: _TZ3210_ncw88jfq + TS0201 LCD
 * Contre quoi:
 * - compose EP1 only [0,61184] → no ZCL bind for temp/humidity (battery OK, T/H empty)
 * - EF00 + powerCfg HYBRID with isTuyaDP=false mutes DP climate mapping
 * - humidity DP transform returning raw 650 fails VALIDATION → empty UI
 * - deviceProtocol forcing pure ZCL for ncw88jfq / ywagc4rj LCD clones
 * Dual-app: BOTH (reliability). No invent pid. No forum POST.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const { detectIntelligentProtocol } = require('../../lib/protocol/IntelligentProtocolDetect');

const MFR = '_TZ3210_ncw88jfq';
const PID = 'TS0201';
const DRIVER = 'sensor_climate_temphumidsensor';

function mock(mfr, modelId, clusters) {
  return {
    getSettings: () => ({ zb_manufacturer_name: mfr, zb_model_id: modelId }),
    getData: () => ({ manufacturerName: mfr, modelId }),
    getStore: () => ({}),
    zclNode: { endpoints: { 1: { clusters } }, manufacturerName: mfr, modelId },
  };
}

describe('P2825 Wilhelm ncw88jfq LCD single-EP EF00 T/H', () => {
  it('sacred couple locked on sensor_climate_temphumidsensor with TS0201', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers', DRIVER, 'driver.compose.json'), 'utf8')
    );
    const mfrs = (compose.zigbee?.manufacturerName || []).map((m) => String(m).toLowerCase());
    assert.ok(mfrs.includes(MFR.toLowerCase()), 'mfr in compose');
    assert.ok((compose.zigbee?.productId || []).includes(PID), 'pid TS0201');
  });

  it('compose EP1 declares ZCL temp/humidity/powerCfg + EF00 (single endpoint)', () => {
    const compose = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'drivers', DRIVER, 'driver.compose.json'), 'utf8')
    );
    const ep1 = compose.zigbee?.endpoints?.['1'] || compose.zigbee?.endpoints?.[1];
    const clusters = (ep1?.clusters || []).map(Number);
    for (const c of [0, 1, 1026, 1029, 61184]) {
      assert.ok(clusters.includes(c), `cluster ${c}`);
    }
    const bindings = (ep1?.bindings || []).map(Number);
    for (const b of [1, 1026, 1029]) {
      assert.ok(bindings.includes(b), `binding ${b}`);
    }
  });

  it('EF00 + powerCfg only → HYBRID prefer DP (Wilhelm interview shape)', () => {
    const i = detectIntelligentProtocol(mock(MFR, PID, {
      basic: {},
      powerConfiguration: {},
      61184: {},
    }));
    assert.equal(i.protocol, 'HYBRID');
    assert.equal(i.isTuyaDP, true);
    assert.equal(i.listenHybrid, true);
    assert.equal(i.reason, 'ef00_powercfg_hybrid_prefer_dp');
  });

  it('EF00 + native temp/humidity still HYBRID with measurement present', () => {
    const i = detectIntelligentProtocol(mock(MFR, PID, {
      temperatureMeasurement: {},
      relativeHumidityMeasurement: {},
      61184: {},
    }));
    assert.equal(i.protocol, 'HYBRID');
    assert.equal(i.reason, 'ef00_and_zcl_present');
  });

  it('deviceProtocol HYBRID for LCD ZCL×10 siblings (not pure ZCL)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'drivers', DRIVER, 'device.js'), 'utf8');
    assert.match(src, /ncw88jfq/);
    assert.match(src, /ywagc4rj/);
    assert.match(src, /return 'HYBRID'/);
    // humidity DP must divide ×10 scaled values (Contre quoi empty UI)
    assert.match(src, /if \(v > 100\) \{return Math\.round\(v \/ 10\);\}/);
  });

  it('_shouldSkipCapability keeps T/H when hasTuyaCluster (UnifiedSensorBase)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
    assert.match(src, /P2825/);
    assert.match(src, /hasTuyaCluster/);
  });

  it('ZCL humidity ×10 quirk still lists ncw88jfq', () => {
    const src = fs.readFileSync(path.join(ROOT, 'lib/devices/UnifiedSensorBase.js'), 'utf8');
    assert.match(src, /_tz3210_ncw88jfq/);
  });

  it('npm check:p2825 wired', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts['check:p2825']);
  });
});
