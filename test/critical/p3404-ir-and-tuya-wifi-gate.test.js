'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const IRCodeLibrary = require(path.join(ROOT, 'lib/ir/IRCodeLibrary'));
const TuyaWhiteLabelCatalog = require(path.join(ROOT, 'lib/tuya-local/TuyaWhiteLabelCatalog'));
const TuyaAuthCatalog = require(path.join(ROOT, 'lib/tuya-local/TuyaAuthCatalog'));

test('P3404: ir_blaster driver.compose.json includes verified Z2M TS1201 IDs (_TZ3290_8xzb2ghn & _TZ3290_acv1biec)', () => {
  const compose = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'drivers/ir_blaster/driver.compose.json'), 'utf8')
  );
  const mfrs = compose.zigbee.manufacturerName;
  for (const id of [
    '_TZ3290_8xzb2ghn',
    '_tz3290_8xzb2ghn',
    '_TZ3290_acv1biec',
    '_tz3290_acv1biec',
  ]) {
    assert.ok(mfrs.includes(id), `Expected ${id} in ir_blaster manufacturerName`);
  }
});

test('P3404: IRCodeLibrary resolves brand/category/function case-insensitively and handles null fn safely', () => {
  const code = IRCodeLibrary.getCode('samsung', 'tv', 'power');
  assert.ok(code && typeof code.code === 'string' && code.code.length > 0, 'Expected Samsung TV Power code');
  const lgCode = IRCodeLibrary.getCode('LG', 'tv', 'Volume Up');
  assert.ok(lgCode && typeof lgCode.code === 'string' && lgCode.code.length > 0, 'Expected LG TV Volume Up code');
  assert.equal(IRCodeLibrary.getCode('Samsung', 'TV', null), null);
  assert.ok(IRCodeLibrary.getCategories('samsung').includes('TV'));
  assert.ok(IRCodeLibrary.getFunctions('sony', 'tv').includes('Power'));
});

test('P3404: ir_blaster driver Flow registration is null-safe when cards are absent', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers/ir_blaster/driver.js'), 'utf8');
  assert.ok(src.includes('_getActionCard(id)') || src.includes('const getAction = (id) =>'), 'Expected null-safe action card helper');
  assert.ok(src.includes('const getCondition = (id) =>'), 'Expected null-safe getCondition helper');
  assert.ok(src.includes("IRCodeLibrary.getCode(brand, 'TV', command)"), 'Expected TV category in send_tv_command');
});

test('P3404: TuyaWhiteLabelCatalog recognizes 24 Tuya Wi-Fi brands and common retailer/sub-brand aliases', () => {
  assert.ok(TuyaWhiteLabelCatalog.BRANDS.length >= 24);
  for (const [query, expectedId] of [
    ['Woox', 'woox'],
    ['Hama Smart Home', 'hama'],
    ['Calex', 'calex'],
    ['Nous', 'nous'],
    ['Aubess', 'aubess'],
    ['Bseed', 'bseed'],
    ['LoraTap', 'loratap'],
    ['Teckin', 'teckin'],
    ['Treatlife', 'treatlife'],
    ['Feit Electric', 'feit'],
    ['Denver', 'denver'],
    ['Kogan SmarterHome', 'kogan'],
    ['Arlec', 'gridconnect'],
    ['BrilliantSmart', 'brilliant'],
    ['Silvercrest', 'lidl'],
    ['Action', 'lsc'],
    ['Tuya', 'tuyasmart'],
  ]) {
    const found = TuyaWhiteLabelCatalog.normalizeBrand(query);
    assert.ok(found, `Expected brand match for "${query}"`);
    assert.equal(found.id, expectedId, `Expected "${query}" -> "${expectedId}", got "${found.id}"`);
  }
  const advice = TuyaWhiteLabelCatalog.keyRetrievalAdvice('woox');
  assert.equal(advice.brand, 'woox');
  assert.ok(advice.steps.length >= 2);
});

test('P3404: TuyaAuthCatalog normalizes region and app schema aliases cleanly', () => {
  assert.equal(TuyaAuthCatalog.normalizeRegion('europe'), 'eu');
  assert.equal(TuyaAuthCatalog.normalizeRegion('west-europe'), 'we');
  assert.equal(TuyaAuthCatalog.normalizeRegion('singapore'), 'sg');
  assert.equal(TuyaAuthCatalog.normalizeAppSchema('tuya_smart'), 'tuyaSmart');
  assert.equal(TuyaAuthCatalog.normalizeAppSchema('tuya'), 'tuyaSmart');
  assert.equal(TuyaAuthCatalog.normalizeAppSchema('Smart Life'), 'smartlife');
});

test('P3404: wifi_ir_remote driver declares expected Tuya IR categories including wnykq', () => {
  const src = fs.readFileSync(path.join(ROOT, 'drivers/wifi_ir_remote/driver.js'), 'utf8');
  assert.ok(src.includes('getExpectedTuyaCategories()'), 'Expected getExpectedTuyaCategories override');
  assert.ok(src.includes("'wnykq'"), 'Expected wnykq universal IR category');
});
