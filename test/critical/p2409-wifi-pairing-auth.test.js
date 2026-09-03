'use strict';

/**
 * P2409 — WiFi pairing / auth multi-region / multi-schema / multi-API
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  REGIONS,
  REGION_FALLBACK_ORDER,
  APP_SCHEMAS,
  DEVICE_LIST_APIS,
  normalizeRegion,
  normalizeAppSchema,
  buildSchemaFallbackChain,
  getRegionEndpoint,
  listRegionsForUi,
} = require('../../lib/tuya-local/TuyaAuthCatalog');
const { matchCloudToLan } = require('../../lib/tuya-local/TuyaPairingOrchestrator');
const TuyaSmartLifeAuth = require('../../lib/tuya-local/TuyaSmartLifeAuth');

describe('P2409 WiFi pairing auth catalog', () => {
  it('covers major Tuya OpenAPI regions', () => {
    for (const id of ['eu', 'we', 'us', 'ue', 'cn', 'in', 'sg']) {
      assert.ok(REGIONS[id], `missing region ${id}`);
      assert.ok(getRegionEndpoint(id).startsWith('https://'));
    }
    assert.ok(REGION_FALLBACK_ORDER.length >= 5);
  });

  it('normalizes region aliases', () => {
    assert.strictEqual(normalizeRegion('eu-w'), 'we');
    assert.strictEqual(normalizeRegion('us-e'), 'ue');
    assert.strictEqual(normalizeRegion('EU'), 'eu');
  });

  it('app schema fallback includes smartlife and tuyaSmart', () => {
    const chain = buildSchemaFallbackChain('smartlife');
    assert.strictEqual(chain[0], 'smartlife');
    assert.ok(chain.includes('tuyaSmart'));
    assert.strictEqual(normalizeAppSchema('smartlife'), 'smartlife');
    assert.strictEqual(normalizeAppSchema('tuyaSmart'), 'tuyaSmart');
    assert.ok(APP_SCHEMAS.length >= 2);
  });

  it('device list API cascade has sharing + iot paths', () => {
    const ids = DEVICE_LIST_APIS.map((a) => a.id);
    assert.ok(ids.includes('sharing_ha'));
    assert.ok(ids.includes('iot03_v13'));
    assert.ok(ids.includes('associated'));
  });

  it('listRegionsForUi returns labeled options', () => {
    const ui = listRegionsForUi();
    assert.ok(ui.some((r) => r.id === 'we'));
  });

  it('matchCloudToLan merges IP/version from LAN', () => {
    const matched = matchCloudToLan(
      [{ id: 'abc', local_key: '0123456789abcdef', name: 'Plug' }],
      [{ id: 'abc', ip: '192.168.1.9', version: '3.5' }]
    );
    assert.strictEqual(matched[0].ip, '192.168.1.9');
    assert.strictEqual(matched[0].version, '3.5');
    assert.ok(matched[0].discovered);
  });

  it('TuyaSmartLifeAuth exports catalog regions', () => {
    assert.ok(TuyaSmartLifeAuth.REGIONS.eu);
    assert.ok(TuyaSmartLifeAuth.TUYA_CLIENT_ID);
    const auth = new TuyaSmartLifeAuth({ region: 'we', log: () => {} });
    assert.strictEqual(auth.region, 'we');
    assert.ok(auth.endpoint.includes('tuyaeu') || auth.endpoint.includes('weaz'));
  });
});
