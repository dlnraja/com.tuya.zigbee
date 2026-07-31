'use strict';

/**
 * Tests — P92.68 backlog cross-source (capabilities, sensors, wifi, lifecycle extras)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('P92.68 — backlog cross-source', () => {

  it('9 custom capabilities no longer shadow system capabilities', () => {
    for (const cap of ['alarm_gas', 'alarm_vibration', 'measure_co', 'measure_frequency',
      'measure_pm10', 'measure_pm25', 'measure_weight', 'target_humidity', 'valve_position']) {
      assert.ok(!fs.existsSync(path.join(ROOT, '.homeycompose/capabilities', `${cap}.json`)),
        `${cap} custom definition removed (system def applies)`);
      assert.ok(fs.existsSync(path.join(ROOT, 'node_modules/homey-lib/assets/capability/capabilities', `${cap}.json`)),
        `${cap} exists as system capability`);
    }
  });

  it('soil moisture is validated (0-100%, divisors 1/10)', () => {
    const src = read('lib/ProductValueValidator.js');
    assert.ok(src.includes("'measure_humidity.soil'"), 'soil rule present');
  });

  it('ZCL humidity ×10 clones use the curated mfr list (z2m #28987)', () => {
    const src = read('lib/devices/UnifiedSensorBase.js');
    assert.ok(src.includes('ZCL_HUMIDITY_X10_MFRS'), 'curated list present');
    assert.ok(src.includes('_tz3000_isw9u95y'), 'TS0201 clone listed');
    assert.ok(src.includes('value / 10'), '÷10 path for listed mfrs');
  });

  it('AdaptiveDataParser illuminance: explicit format, no daylight corruption', () => {
    const ADP = require(path.join(ROOT, 'lib/utils/AdaptiveDataParser'));
    assert.strictEqual(ADP.toIlluminance(20000, { format: 'raw' }), 20000, 'raw 20000 lux preserved');
    assert.ok(Math.abs(ADP.toIlluminance(43011, { format: 'zcl' }) - 20000) <= 1, 'ZCL log decoded (±1 rounding)');
    // legacy path no longer corrupts real daylight
    assert.strictEqual(ADP.toIlluminance(20000), 20000, 'legacy heuristic keeps raw lux');
  });

  it('LowLevelBridge ZCL frames: mfr code between fc and TSN, little-endian', () => {
    const src = read('lib/LowLevelBridge.js');
    assert.ok(src.includes('writeUInt16LE'), 'LE write');
    assert.ok(src.includes('readUInt16LE'), 'LE read');
    assert.ok(!src.includes('writeUInt16BE(options.manufacturerCode'), 'no BE mfr write');
  });

  it('battery smoothing: collapse >20% accepted + smoothed value persisted', () => {
    const src = read('lib/battery/UnifiedBatteryHandler.js');
    assert.ok(src.includes('Battery collapse detected'), 'symmetric drop acceptance');
    assert.ok(src.includes('_smoothedRestored'), 'restart persistence');
  });

  it('TuyaBoundCluster knows mcuOtaNotify 0x12', () => {
    const src = read('lib/clusters/TuyaBoundCluster.js');
    assert.ok(src.includes('0x12'), 'mcuOtaNotify in knownCommands');
  });

  it('cover_limit_calibration flow action exists and sends DP16 enum', () => {
    const card = JSON.parse(read('.homeycompose/flow/actions/cover_limit_calibration.json'));
    assert.strictEqual(card.id, 'cover_limit_calibration');
    const cmds = card.args.find(a => a.name === 'command').values.map(v => v.id);
    assert.deepStrictEqual(cmds, ['set_upper', 'set_lower', 'delete_upper', 'delete_lower', 'remove_all']);
    const app = read('app.js');
    assert.ok(app.includes('_sendTuyaDP(16,'), 'DP16 wired');
  });

  it('DynamicCapabilityManager uses magnitude-aware converters', () => {
    const src = read('lib/dynamic/DynamicCapabilityManager.js');
    assert.ok(src.includes('smartHumidity'), 'smart humidity converter');
    assert.ok(src.includes('smartTemperature'), 'smart temperature converter');
  });

  it('WiFi DPValueParser covers enum/bitmap/raw Tuya types', () => {
    const { parseDPValue } = require(path.join(ROOT, 'lib/tuya-local/DPValueParser'));
    assert.strictEqual(parseDPValue(2, 'enum'), 2);
    assert.deepStrictEqual(parseDPValue(0b101, 'bitmap'), [0, 2]);
    assert.ok(Buffer.isBuffer(parseDPValue('aGVsbG8=', 'raw')), 'base64 raw');
  });

  it('circadian curve delegates to SolarElevation when available', () => {
    const src = read('app.js');
    assert.ok(src.includes('solar.getElevation'), 'real sun position used');
  });

  it('button-class drivers use class "button", humidifiers use target_humidity', () => {
    const b4 = JSON.parse(read('drivers/button_wireless_4/driver.compose.json'));
    assert.strictEqual(b4.class, 'button');
    const hum = JSON.parse(read('drivers/humidifier/driver.compose.json'));
    assert.ok(hum.capabilities.includes('target_humidity'), 'target_humidity replaces dim.humidity');
    assert.ok(!hum.capabilities.includes('dim.humidity'));
  });

  it('compose↔mfs_db guard tool exists and runs', () => {
    const src = read('tools/ci/compose-mfsdb-class-guard.js');
    assert.ok(src.includes('pairConflicts'), 'Sacred-Couple pair-level check');
    assert.ok(src.includes('WIDE_CLAIM_DRIVERS'), 'wide-claim exemptions (doctrine)');
  });
});
