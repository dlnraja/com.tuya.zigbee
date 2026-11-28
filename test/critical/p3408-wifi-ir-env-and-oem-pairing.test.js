'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const WhiteLabel = require(path.join(ROOT, 'lib/tuya-local/TuyaWhiteLabelCatalog'));

test('P3408: TuyaWhiteLabelCatalog exposes 24 UI brands and localized OEM/key-rotation tips', () => {
  const list = WhiteLabel.listBrandsForUi();
  assert.ok(list.length >= 24);
  assert.ok(list.some((b) => b.id === 'lidl' && !b.nativeSharing));
  assert.ok(list.some((b) => b.id === 'lsc' && !b.nativeSharing));
  assert.ok(list.some((b) => b.id === 'smartlife' && b.nativeSharing));

  const frLidl = WhiteLabel.getLocalizedPairingTip('lidl', 'fr');
  assert.ok(frLidl.includes('Lidl') && frLidl.includes('Smart Life'));

  const enLsc = WhiteLabel.getLocalizedPairingTip('lsc', 'en');
  assert.ok(enLsc.includes('LSC') && enLsc.includes('Smart Life'));

  const frKey = WhiteLabel.getLocalizedPairingTip('key_rotated', 'fr');
  assert.ok(frKey.includes('local_key'));

  const nlSmart = WhiteLabel.getLocalizedPairingTip('smartlife', 'nl');
  assert.ok(nlSmart.includes('QR-code'));
});

test('P3408: wifi_ir_remote supports S06Pro/S08/S16 DP 101 temperature & DP 102 humidity dynamically', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers/wifi_ir_remote/device.js'), 'utf8');
  assert.ok(src.includes('_updateEnvSensorFromDps(dps)'), 'Expected _updateEnvSensorFromDps call');
  assert.ok(src.includes("dps['101']"), 'Expected DP 101 temperature handling');
  assert.ok(src.includes("dps['102']"), 'Expected DP 102 humidity handling');
  assert.ok(src.includes("'measure_temperature'"), 'Expected dynamic measure_temperature capability');
  assert.ok(src.includes("'measure_humidity'"), 'Expected dynamic measure_humidity capability');
});

test('P3408: TuyaLocalDriver wires OEM white-label handlers in both onPair and onRepair', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib/tuya-local/TuyaLocalDriver.js'), 'utf8');
  assert.ok(src.includes('_registerWhiteLabelHandlers(session)'), 'Expected _registerWhiteLabelHandlers helper');
  assert.ok(src.includes("'listWhiteLabelBrands'"), 'Expected listWhiteLabelBrands handler');
  assert.ok(src.includes("'getWhiteLabelAdvice'"), 'Expected getWhiteLabelAdvice handler');
});
