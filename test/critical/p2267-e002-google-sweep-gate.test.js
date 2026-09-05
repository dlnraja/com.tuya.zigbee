'use strict';

const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

/**
 * P2267 — Google 0xE002 Tuya sweep
 * Z2M ManuSpecificTuya2 taxonomy, humidity max 0xD00D, beep mute 0xD010, INT16
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const TuyaE002 = require('../../lib/clusters/TuyaE002Cluster');
const { applyE002AlarmSettings, ALARM_KEYS } = require('../../lib/tuya/TuyaE002AlarmManager');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('P2267 0xE002 Tuya Google-sweep gate', function () {
  this.timeout?.(15000);

  it('TuyaE002Cluster matches Z2M ManuSpecificTuya2 IDs + int16', () => {
    const attrs = TuyaE002.ATTRIBUTES;
    assert.strictEqual(attrs.alarmTemperatureMax.id, 0xD00A);
    assert.strictEqual(attrs.alarmHumidityMax.id, 0xD00D);
    assert.strictEqual(attrs.alarmHumidity.id, 0xD00F);
    assert.strictEqual(attrs.alarmTemperature.id, 0xD006);
    assert.strictEqual(attrs.beepSilence.id, 0xD010);
    assert.strictEqual(TuyaE002.ALARM_TYPE.OFF, 2);
    assert.ok(String(attrs.alarmTemperatureMax.type).includes('int16') || attrs.alarmTemperatureMax.type === require('zigbee-clusters').ZCLDataTypes.int16);
  });

  it('LowLevelBridge + lexicon use Z2M cluster names', () => {
    const bridge = read('lib/LowLevelBridge.js');
    assert.ok(/manuSpecificTuya2:\s*0xE002/.test(bridge));
    assert.ok(/manuSpecificTuya3:\s*0xE001/.test(bridge));
    const lex = read('lib/zigbee/ZclClusterLexicon.js');
    assert.ok(lex.includes("manuSpecificTuya2"));
    assert.ok(/TUYA_E002:[\s\S]*manuSpecificTuya2/.test(lex));
  });

  it('AlarmManager maps silence + thresholds', () => {
    assert.ok(ALARM_KEYS.silence_alarm_beep);
    assert.ok(ALARM_KEYS.alarm_humidity_max);
    assert.strictEqual(typeof applyE002AlarmSettings, 'function');
  });

  it('LCD lux sensor exposes E002 settings and wires onSettings', () => {
    const settings = read('drivers/lcdtemphumidluxsensor/driver.settings.compose.json');
    assert.ok(settings.includes('silence_alarm_beep'));
    assert.ok(settings.includes('alarm_humidity_max'));
    const src = read('drivers/lcdtemphumidluxsensor/device.js');
    assert.ok(src.includes('applyE002AlarmSettings'));
  });

  it('qkj7rujp locked to lcdtemphumidsensor', () => {
    const compose = JSON.parse(read('drivers/lcdtemphumidsensor/driver.compose.json'));
    assert.ok(compose.zigbee.manufacturerName.some((m) => /qkj7rujp/i.test(m)));
    const db = read('lib/DeviceFingerprintDB.js');
    assert.ok(db.includes("_TZ3210_qkj7rujp|TS0201"));
    const reg = JSON.parse(read('data/user-misattribution-registry.json'));
    assert.ok((reg.cases || []).some((c) => c.id === 'p2267-e002-alarm-taxonomy'));
  });

  it('knowledge doc exists', () => {
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/knowledge/TUYA_E000_E001_E002.md')));
  });
});
