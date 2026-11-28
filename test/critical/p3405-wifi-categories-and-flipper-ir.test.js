'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const IRFormat = require(path.join(ROOT, 'lib/ir/IRFormatConverter'));
const ZosungProto = require(path.join(ROOT, 'lib/ir/ZosungIRProtocol'));
const WifiIR = require(path.join(ROOT, 'lib/ir/TuyaWifiIRProtocol'));

test('P3405: IRFormatConverter parses Flipper Zero .ir raw blocks for Zigbee, Wi-Fi, and Homey Pronto', () => {
  const flipperSnippet = [
    'name: Power',
    'type: raw',
    'frequency: 38000',
    'duty_cycle: 0.330000',
    'data: 9000 4500 560 560 560 1690 560 560 560 1690 560',
  ].join('\n');

  assert.equal(IRFormat.detectFormat(flipperSnippet), 'flipper_raw');

  const parsed = IRFormat.flipperRawToTimings(flipperSnippet);
  assert.ok(parsed);
  assert.equal(parsed.freqHz, 38000);
  assert.equal(parsed.timings.length, 12); // odd count padded with 1000 us

  const zb = IRFormat.normalizeCode(flipperSnippet, { target: 'zigbee' });
  assert.equal(zb.ok, true);
  assert.equal(zb.format, 'flipper_raw');
  assert.ok(ZosungProto.isTuyaCompressedCode(zb.zigbeeCode));

  const wf = IRFormat.normalizeCode(flipperSnippet, { target: 'wifi' });
  assert.equal(wf.ok, true);
  const decodedWifi = ZosungProto.wifiBase64ToTimings(wf.wifiCode);
  assert.equal(decodedWifi[0], 9000);
  assert.equal(decodedWifi[1], 4500);

  const hm = IRFormat.normalizeCode(flipperSnippet, { target: 'homey' });
  assert.equal(hm.ok, true);
  assert.ok(hm.prontoCode.startsWith('0000 '));
});

test('P3405: TuyaWifiIRProtocol builds single-DP (DP201 JSON) and multi-DP (DP1/DP7) payloads cleanly', () => {
  const sampleWifi = ZosungProto.timingsToWifiBase64([9000, 4500, 560, 560]);
  const single = WifiIR.buildSendDps(sampleWifi, { controlType: WifiIR.CONTROL_SINGLE_DP });
  assert.ok(single['201'] && single['201'].includes('"send_ir"'));

  const multi = WifiIR.buildSendDps(sampleWifi, { controlType: WifiIR.CONTROL_MULTI_DP });
  assert.equal(multi['1'], 'study_key');
  assert.equal(multi['7'], sampleWifi);
  assert.equal(multi['13'], 0);
});

test('P3405: TuyaLocalDriver exports DRIVER_TUYA_CATEGORIES SSOT covering dedicated wifi_* drivers', () => {
  const fs = require('node:fs');
  const src = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalDriver.js'), 'utf8');
  assert.ok(src.includes('const DRIVER_TUYA_CATEGORIES = Object.freeze({'), 'Expected DRIVER_TUYA_CATEGORIES SSOT');
  for (const token of [
    "wifi_plug: ['cz'",
    "wifi_cover: ['cl'",
    "wifi_thermostat: ['wk'",
    "wifi_door_lock: ['ms'",
    "wifi_robot_vacuum: ['sd']",
    "wifi_ir_remote: ['wnykq'",
    "wifi_ev_charger: ['qbc'",
  ]) {
    assert.ok(src.includes(token), `Expected ${token} in TuyaLocalDriver.js`);
  }
  assert.ok(!src.includes('wifi_generic:'), 'wifi_generic must remain unrestricted (null)');
});
