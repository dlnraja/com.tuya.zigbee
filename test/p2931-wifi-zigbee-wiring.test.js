'use strict';
const assert = require('assert');
const { EventEmitter } = require('events');
const overlay = require('../lib/tuya/TuyaZigbeeProfileOverlay');
const reg = require('../lib/tuya-local/WiFiDPRegistry');
const mn = require('../lib/tuya-local/ManualEntryNormalizer');
const { guessProtocolFromDiscovery } = require('../lib/tuya-local/UdpDiscoveryKeys');
const cat = require('../data/wifi/tuya-local-product-schemas.json');

describe('P2931 wiring', () => {
  it('Zigbee profile overlay: passive, read-only, cleaned up', async () => {
    const tuya = new EventEmitter();
    const store = {};
    const dev = {
      zclNode: { endpoints: { 1: { clusters: { tuya, basic: { readAttributes: async () => ({ appVersion: 0x48, zclVersion: 3 }) } } } } },
      getSettings: () => ({ zb_manufacturer_name: '_TZE204_abcdefgh', zb_product_id: 'TS0601' }),
      setStoreValue: async (k, v) => { store[k] = v; }, log() {},
    };
    overlay.attach(dev, { delayMs: 60000 });
    tuya.emit('dataReport', {}); tuya.emit('timeSync', {});
    const p = await overlay.refresh(dev);
    assert.strictEqual(p.firmware.app, '1.0.8');
    assert.strictEqual(p.profile.zigbee30, true);
    assert.ok(p.ef00.timeSync);
    assert.strictEqual(p.chain[0], 'native');
    assert.ok(store.tuya_zb_profile);
    overlay.detach(dev);
    assert.strictEqual(tuya.listenerCount('dataReport'), 0);
    assert.strictEqual(dev.__tzProfile, null);
  });

  it('overlay survives a sleepy device (Basic read fails)', async () => {
    const dev = { zclNode: { endpoints: { 1: { clusters: { basic: { readAttributes: async () => { throw new Error('timeout'); } } } } } }, getSettings: () => ({}), log() {} };
    overlay.attach(dev, { delayMs: 60000 });
    const p = await overlay.refresh(dev);
    assert.strictEqual(p.firmware.app, null);
    overlay.detach(dev);
  });

  it('generic auto-mapper at runtime never adds a capability the device lacks', () => {
    reg._resetCommunityCacheForTests();
    const caps = new Set(['onoff']);
    const dev = { dpMappings: {}, getSettings: () => ({}), hasCapability: (c) => caps.has(c), log() {} };
    reg.enrichWiFiDpMappings(dev, { observedDps: { 1: true, 19: 100, 20: 2300 }, onlyExistingCapabilities: true });
    assert.strictEqual(dev.dpMappings['1'].capability, 'onoff');
    assert.ok(!dev.dpMappings['19']);
  });

  it('enum binary sensors from tuya-local map exact values to true', () => {
    let hit = null;
    for (const [id, fi] of Object.entries(cat.p)) {
      const s = cat.s[cat.f[fi][1]];
      const row = Object.entries(s).find(([, r]) => r.on !== undefined);
      if (row) { hit = { id, dp: row[0], on: row[1].on }; break; }
    }
    assert.ok(hit, 'catalog contains enum binary sensors');
    reg._resetCommunityCacheForTests();
    const m = reg.lookupTuyaLocalSchema(hit.id).dps[hit.dp];
    const on = Array.isArray(hit.on) ? hit.on[0] : hit.on;
    assert.strictEqual(m.transform(on), true);
    assert.strictEqual(m.transform('__not_a_value__'), false);
  });

  it('manual IP / protocol normalisation', () => {
    assert.strictEqual(mn.normalizeIp(' 192.168.1.20:6668 '), '192.168.1.20');
    assert.strictEqual(mn.normalizeIp('0.0.0.0'), '');
    assert.strictEqual(mn.normalizeIp('192.168.1.255'), '');
    assert.strictEqual(mn.normalizeIp('host.local'), '');
    assert.strictEqual(mn.normalizeVersion('v3.4'), '3.4');
    assert.strictEqual(mn.normalizeVersion('3.22'), '3.3');
    assert.strictEqual(mn.normalizeVersion('2.2'), 'auto');
  });

  it('UDP discovery resolves the 3.22 alias', () => {
    assert.strictEqual(guessProtocolFromDiscovery({ version: '3.22' }), '3.3');
  });

  it('UDP discovery table is bounded', () => {
    const D = require('../lib/tuya-local/TuyaUDPDiscovery');
    const d = Object.create(D.prototype);
    EventEmitter.call(d); d._devices = new Map(); d._log = () => {};
    for (let i = 0; i < 300; i++) {
      d._handleMessage(Buffer.from(JSON.stringify({ gwId: `dev${i}`, ip: '10.0.0.1', version: '3.3' })), { address: '10.0.0.1' });
    }
    assert.ok(d._devices.size > 0 && d._devices.size <= 256, String(d._devices.size));
  });
});
