'use strict';

/**
 * P2407 — Community WiFi DP hints + DeviceIOFacade local-first resolveWifi
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  enrichWiFiDpMappings,
  loadCommunityProducts,
  CATEGORY_DP_HINTS,
  _resetCommunityCacheForTests,
} = require('../../lib/tuya-local/WiFiDPRegistry');
const { resolveWiFiTransport } = require('../../lib/wifi/LocalFirstResolver');

describe('P2407 WiFi community local-first', () => {
  it('community-dp-hints.json ships with enough products', () => {
    const fp = path.join(__dirname, '..', '..', 'data', 'wifi', 'community-dp-hints.json');
    assert.ok(fs.existsSync(fp));
    const catalog = JSON.parse(fs.readFileSync(fp));
    assert.ok(catalog._meta?.productCount >= 50);
    assert.ok(Object.keys(catalog.products || {}).length >= 50);
  });

  it('CATEGORY_DP_HINTS includes fan/strip/AC categories', () => {
    for (const cat of ['fs', 'pc', 'kt', 'cs', 'qn']) {
      assert.ok(CATEGORY_DP_HINTS[cat], `missing ${cat}`);
    }
  });

  it('enrichWiFiDpMappings merges community product hints without overwrite', () => {
    _resetCommunityCacheForTests();
    const products = loadCommunityProducts();
    const productId = Object.keys(products).find((k) => Object.keys(products[k]).length >= 1);
    assert.ok(productId, 'need at least one community product');
    const sampleDp = Object.keys(products[productId])[0];
    const device = {
      dpMappings: { 1: { capability: 'onoff', type: 'boolean' } },
      getSettings: () => ({ product_id: productId, category: 'cz' }),
      log: () => {},
    };
    const added = enrichWiFiDpMappings(device);
    assert.ok(added >= 1);
    assert.strictEqual(device.dpMappings[1].capability, 'onoff');
    assert.ok(device.dpMappings[sampleDp]?.capability);
  });

  it('resolveWiFiTransport prefers LAN when credentials present', () => {
    const d = resolveWiFiTransport({
      deviceId: 'abcdef',
      localKey: '0123456789abcdef',
      policy: { strategy: 'local_first', cloudFallback: false },
    });
    assert.strictEqual(d.transport, 'lan');
  });

  it('DeviceIOFacade.resolveWifi uses LocalFirstResolver helpers', async () => {
    const DeviceIOFacade = require('../../lib/io/DeviceIOFacade');
    const device = {
      getSettings: () => ({ device_id: 'id1', local_key: 'keykeykeykeykey1', ip: '192.168.1.50' }),
      getStoreValue: () => ({ strategy: 'local_first', cloudFallback: false }),
      log: () => {},
    };
    const facade = new DeviceIOFacade(device);
    facade.channels.wifi_lan = true;
    facade.channels.wifi_cloud = true;
    const r = await facade.resolveWifi({});
    assert.strictEqual(r.via, 'local_first');
    assert.ok(r.ok);
    assert.strictEqual(r.result.transport, 'lan');
  });
});
