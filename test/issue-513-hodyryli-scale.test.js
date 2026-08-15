'use strict';

/**
 * GH #513 — ZT08 / _TZE284_hodyryli scale + battery_state enum + DP17 clock commit
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const { ProductValueValidator } = require('../lib/ProductValueValidator');
const EnrichedDPMappings = require('../lib/tuya/EnrichedDPMappings');
const { ClimateInference } = require('../lib/IntelligentSensorInference');
const MCUFormatDatabase = require('../lib/tuya/MCUFormatDatabase');
const TuyaTimeSyncFormats = require('../lib/tuya/TuyaTimeSyncFormats');
const { smartParse } = require('../lib/managers/SmartDivisorManager');

const MFR = '_TZE284_hodyryli';

describe('GH #513 ZT08 scale', () => {
  it('maps hodyryli to ZT08 profile (DP3 battery_state, DP38 probe)', () => {
    const profile = EnrichedDPMappings.getProfile(MFR);
    assert.ok(profile);
    assert.strictEqual(profile.type, 'climate');
    assert.strictEqual(profile.profile[3].converter, 'batteryState');
    assert.strictEqual(profile.profile[38].capability, 'measure_temperature.probe');
  });

  it('battery_state enum 0/1/2 → 10/50/100', () => {
    assert.strictEqual(EnrichedDPMappings.parseDP(MFR, 3, 0).value, 10);
    assert.strictEqual(EnrichedDPMappings.parseDP(MFR, 3, 1).value, 50);
    assert.strictEqual(EnrichedDPMappings.parseDP(MFR, 3, 2).value, 100);
  });

  it('does not treat enum 2 as 2% battery', () => {
    const parsed = EnrichedDPMappings.parseDP(MFR, 3, 2);
    assert.notStrictEqual(parsed.value, 2);
  });

  it('humidity ×10 (530) is scaled by ClimateInference to 53', () => {
    const inf = new ClimateInference({ log() {} });
    assert.strictEqual(inf.validateHumidity(530), 53);
    assert.strictEqual(inf.validateHumidity(45), 45);
  });

  it('learned divisor is not re-applied to already-scaled 53°C', () => {
    const v = ProductValueValidator.createDeviceValidator({ log() {} }, 'climate_sensor');
    v.learnedDivisors['measure_temperature.probe'] = 10;
    const r = v.validate(53, 'measure_temperature.probe');
    assert.strictEqual(r.correctedValue, 53);
    assert.strictEqual(r.correction, null);
  });

  it('SmartDivisor divides DP1 temp by 10 for hodyryli', () => {
    const t = smartParse(215, 1, {
      manufacturerName: MFR,
      capability: 'measure_temperature',
      deviceId: 'test-zt08',
    });
    assert.strictEqual(t, 21.5);
  });

  it('firmware bug DB requires DP17 commit after time sync (Z2M #29627)', () => {
    const bug = MCUFormatDatabase.getFirmwareBug(MFR);
    assert.ok(bug, 'hodyryli firmware bug entry required');
    assert.strictEqual(bug.fix.type, 'DP17_COMMIT');
    assert.strictEqual(bug.fix.dp, 17);
    assert.strictEqual(bug.fix.value, false);
    assert.ok((bug.fix.delay_ms || 0) >= 400);
  });

  it('guessFormat prefers Z2M dual-1970 for hodyryli (not dual-2000)', () => {
    const guess = TuyaTimeSyncFormats.guessFormat({
      manufacturerName: MFR,
      productId: 'TS0601',
      driverClass: 'sensor',
    });
    assert.strictEqual(guess.primary, 'z2m_dual_1970');
  });

  it('climate_sensor_zt08 device wires unix_1970 + DP17 / dataQuery path', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../drivers/climate_sensor_zt08/device.js'),
      'utf8',
    );
    assert.ok(src.includes("epoch: 'unix_1970'"), 'must force unix_1970');
    assert.ok(src.includes('GlobalTimeSyncEngine'), 'must use GlobalTimeSyncEngine');
    assert.ok(src.includes('_sendTuyaDataQuery'), 'must refresh DPs after sync');
  });

  it('GlobalTimeSyncEngine applies DP17 firmware workaround', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../lib/tuya/GlobalTimeSyncEngine.js'),
      'utf8',
    );
    assert.ok(src.includes('_applyFirmwareWorkarounds'), 'must apply firmware workarounds');
    assert.ok(src.includes('DP17_COMMIT'), 'must handle DP17_COMMIT');
  });

  it('ClimateInference does not smooth away first real temp after MCU zero', () => {
    const inf = new ClimateInference({ log() {} }, { maxTempJump: 5 });
    assert.strictEqual(inf.validateTemperature(0), 0);
    assert.strictEqual(inf.validateTemperature(21.5), 21.5);
  });
});
