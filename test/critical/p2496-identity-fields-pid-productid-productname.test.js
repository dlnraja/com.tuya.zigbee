'use strict';

/**
 * P2496 — Contre quoi: confuse Homey productId with Zigbee modelId shorthand pid
 * or with catalog productName → invent pid / wrong settings keys.
 *
 * Homey SDK3: compose uses manufacturerName + productId;
 * Zigbee tools "Model ID" === productId === interview modelId.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const {
  pickProductId,
  pickManufacturerName,
  normalizeSacredCouple,
  isCatalogAliasKey,
  isValidSacredCouple,
} = require('../../tools/ci/sacred-couple-pair');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

describe('P2496 identity fields (pid / productId / productName)', () => {
  it('SSOT + human doc exist and lock Homey pairing fields', () => {
    const ssot = readJson('config/architecture/identity-fields-ssot.json');
    assert.deepEqual(ssot.pairingIdentity.canonical, ['manufacturerName', 'productId']);
    assert.equal(ssot.fields.productId.equalsZigbee, 'modelId (Basic cluster / interview JSON)');
    assert.equal(ssot.fields.pid.mapsTo, 'productId');
    assert.equal(ssot.fields.productName.notPairingKey, true);
    assert.equal(ssot.settingsKeys.pid, 'zb_model_id');
    assert.equal(ssot.settingsKeys.mfr, 'zb_manufacturer_name');
    assert.ok(fs.existsSync(path.join(ROOT, 'docs/architecture/IDENTITY_FIELDS_SSOT.md')));
  });

  it('pickProductId unifies productId / pid / modelId / zb_model_id', () => {
    assert.equal(pickProductId({ productId: 'TS0041' }), 'TS0041');
    assert.equal(pickProductId({ pid: 'TS004F' }), 'TS004F');
    assert.equal(pickProductId({ modelId: 'TS0601' }), 'TS0601');
    assert.equal(pickProductId({ zb_model_id: 'ZG-303Z' }), 'ZG-303Z');
    assert.equal(pickProductId({
      getSetting: (k) => (k === 'zb_model_id' ? 'TS0044' : null),
    }), 'TS0044');
    assert.equal(pickProductId({
      getData: () => ({ productId: 'TS011F' }),
    }), 'TS011F');
  });

  it('pickProductId never returns productName catalog aliases', () => {
    assert.equal(pickProductId({
      productName: 'SH-SC07',
      productNames: ['SH-SC07'],
      product_name: 'Smart button',
    }), null);
    assert.ok(isCatalogAliasKey('productName'));
    assert.ok(isCatalogAliasKey('product_names'));
    assert.ok(!isCatalogAliasKey('productId'));
  });

  it('normalizeSacredCouple returns productId alias equal to pid', () => {
    const n = normalizeSacredCouple('_TZ3000_mrpevh8p', 'TS0041');
    assert.equal(n.pid, 'TS0041');
    assert.equal(n.productId, 'TS0041');
    const fromObj = normalizeSacredCouple({
      manufacturerName: '_TZ3000_uri7ongn',
      modelId: 'TS004F',
    });
    assert.ok(fromObj);
    assert.equal(fromObj.productId, 'TS004F');
  });

  it('Homey compose drivers use productId not pid key', () => {
    const compose = readJson('drivers/button_wireless_1/driver.compose.json');
    assert.ok(Array.isArray(compose.zigbee.productId));
    assert.ok(compose.zigbee.productId.includes('TS0041'));
    assert.equal(compose.zigbee.pid, undefined);
  });

  it('doctrine: modelIds = Zigbee productIds; productNames = aliases (SSOT)', () => {
    const id = readJson('config/architecture/identity-fields-ssot.json');
    assert.equal(id.fields.productName.notPairingKey, true);
    assert.match(id.fields.productName.notes, /modelIds stay real|productNames hold aliases|NEVER use as zigbee.productId/i);
    // Compose still lists HOBEIAN as productId case-form for broken interviews (P2434) —
    // that is Homey productId string, not mfs productNames catalog.
    const soil = readJson('drivers/soil_sensor/driver.compose.json');
    assert.ok((soil.zigbee.productId || []).some((p) => String(p).toUpperCase() === 'HOBEIAN'));
    assert.ok((soil.zigbee.productId || []).includes('ZG-303Z'));
  });

  it('project-smart-map + sacred-couple point at identity SSOT', () => {
    const map = readJson('config/architecture/project-smart-map.json');
    assert.match(JSON.stringify(map), /identity-fields-ssot|IDENTITY_FIELDS/);
    const sacred = readJson('config/architecture/sacred-couple-ssot.json');
    assert.ok(sacred.identity || sacred._meta);
  });

  it('worked example: interview modelId → compose productId', () => {
    assert.ok(isValidSacredCouple('_TZE284_m1cvyneb', 'TS0601'));
    const n = normalizeSacredCouple('_TZE284_m1cvyneb', pickProductId({ modelId: 'TS0601' }));
    assert.equal(n.productId, 'TS0601');
  });
});
