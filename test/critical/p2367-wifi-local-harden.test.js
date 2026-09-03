'use strict';

/**
 * P2367 WiFi local hardening tests
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  ECB_KEYS,
  UDP_KEY_RAW,
  UDP_KEY_HEX,
  decryptUdpEcb,
  buildActiveProbePayload,
} = require('../../lib/tuya-local/UdpDiscoveryKeys');
const { enrichWiFiDpMappings, CATEGORY_DP_HINTS } = require('../../lib/tuya-local/WiFiDPRegistry');
const { QuirkRegistry } = require('../../lib/tuya-local/TuyaQuirk');

describe('P2367 WiFi local hardening', () => {
  it('UdpDiscoveryKeys has 3 ECB fallbacks (TinyTuya/tuyapi parity)', () => {
    assert.strictEqual(ECB_KEYS.length, 3);
    assert.ok(ECB_KEYS.some((k) => k.equals(UDP_KEY_RAW)));
    assert.ok(ECB_KEYS.some((k) => k.equals(UDP_KEY_HEX)));
    // TinyTuya prefers MD5(UDP_KEY) first for 6667 ECB
    assert.ok(ECB_KEYS[0].equals(require('../../lib/tuya-local/UdpDiscoveryKeys').UDP_KEY_MD5));
  });

  it('decryptUdpEcb round-trips with raw key', () => {
    const plain = '{"gwId":"abc123","ip":"192.168.1.1"}';
    const padded = plain.padEnd(Math.ceil(plain.length / 16) * 16, '\0');
    const cipher = crypto.createCipheriv('aes-128-ecb', UDP_KEY_RAW, null);
    const enc = Buffer.concat([cipher.update(padded, 'utf8'), cipher.final()]);
    const out = decryptUdpEcb(enc);
    assert.ok(out && out.includes('gwId'));
  });

  it('buildActiveProbePayload matches TinyTuya scan format', () => {
    const p = JSON.parse(buildActiveProbePayload('10.0.0.5'));
    assert.strictEqual(p.from, 'app');
    assert.strictEqual(p.ip, '10.0.0.5');
  });

  it('WiFiDPRegistry enriches category-based DPs without overwriting explicit mappings', () => {
    const device = {
      dpMappings: { 1: { capability: 'onoff', type: 'boolean' }, 99: { capability: 'unknown' } },
      getSettings: () => ({ category: 'sd' }),
      log: () => {},
    };
    const added = enrichWiFiDpMappings(device);
    assert.ok(added >= 2); // power + energy from sd category
    assert.strictEqual(device.dpMappings[1].capability, 'onoff');
    assert.strictEqual(device.dpMappings[19].capability, 'measure_power');
  });

  it('QuirkRegistry matches WiFi product_id settings', () => {
    const matching = QuirkRegistry.findMatching({ product_id: 'okaz9tbl' });
    assert.ok(matching.some((Q) => Q.id === 'smartplug_power_scale'));
  });

  it('TuyaUDPDiscovery exports active probe interval option', () => {
    const TuyaUDPDiscovery = require('../../lib/tuya-local/TuyaUDPDiscovery');
    const d = new TuyaUDPDiscovery({ probeInterval: 60000 });
    assert.strictEqual(d._probeInterval, 60000);
  });

  it('CATEGORY_DP_HINTS covers common Tuya categories', () => {
    for (const cat of ['cz', 'kg', 'dj', 'cl', 'wk', 'sd']) {
      assert.ok(CATEGORY_DP_HINTS[cat], `missing category ${cat}`);
    }
  });
});
