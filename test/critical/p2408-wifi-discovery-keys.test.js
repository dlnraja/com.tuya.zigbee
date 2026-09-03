'use strict';

/**
 * P2408 — Discovery cascade, 6699 solicitation, key types, protocol versions
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  packDiscoverySolicitation,
  decrypt6699Frame,
  decryptUdpDiscoveryMessage,
  normalizeLocalKey,
  buildProtocolFallbackChain,
  PROTOCOL_VERSIONS,
  guessProtocolFromDiscovery,
  PREFIX_6699,
  listLanBroadcastTargets,
} = require('../../lib/tuya-local/UdpDiscoveryKeys');
const {
  KEY_TYPES,
  resolveDeviceLanKey,
  describeKeyShape,
} = require('../../lib/tuya-local/TuyaKeyTypes');
const TuyaLocalClient = require('../../lib/tuya-local/TuyaLocalClient');

describe('P2408 discovery + keys + protocols', () => {
  it('PROTOCOL_VERSIONS covers 3.1 through 3.5', () => {
    assert.deepEqual([...PROTOCOL_VERSIONS].sort(), ['3.1', '3.2', '3.3', '3.4', '3.5']);
  });

  it('buildProtocolFallbackChain starts at preferred', () => {
    const chain = buildProtocolFallbackChain('3.5');
    assert.strictEqual(chain[0], '3.5');
    assert.ok(chain.includes('3.3'));
    assert.strictEqual(chain.length, 5);
  });

  it('normalizeLocalKey accepts ascii16 and hex32', () => {
    assert.strictEqual(normalizeLocalKey('0123456789abcdef'), '0123456789abcdef');
    const hex = '30313233343536373839616263646566'; // ascii 0123456789abcdef
    assert.strictEqual(normalizeLocalKey(hex), '0123456789abcdef');
    assert.strictEqual(normalizeLocalKey('"0123456789abcdef"'), '0123456789abcdef');
  });

  it('6699 discovery solicitation round-trips decrypt', () => {
    const pkt = packDiscoverySolicitation('192.168.1.50', { seq: 7 });
    assert.ok(pkt.slice(0, 4).equals(PREFIX_6699));
    const plain = decrypt6699Frame(pkt);
    assert.ok(plain);
    const j = JSON.parse(plain);
    assert.strictEqual(j.from, 'app');
    assert.strictEqual(j.ip, '192.168.1.50');
  });

  it('decryptUdpDiscoveryMessage finds plaintext JSON', () => {
    const buf = Buffer.from('xxxx{"gwId":"abc","ip":"10.0.0.2","version":"3.3"}yyyy');
    const d = decryptUdpDiscoveryMessage(buf);
    assert.ok(d);
    assert.strictEqual(d.frame, 'plaintext');
    assert.ok(d.payload.includes('gwId'));
  });

  it('guessProtocolFromDiscovery maps frames', () => {
    assert.strictEqual(guessProtocolFromDiscovery({ version: '3.4' }), '3.4');
    assert.strictEqual(guessProtocolFromDiscovery({ frame: '6699' }), '3.5');
    assert.strictEqual(guessProtocolFromDiscovery({ encrypted: true }), '3.3');
    assert.strictEqual(guessProtocolFromDiscovery({}), '3.1');
  });

  it('TuyaKeyTypes resolveDeviceLanKey prefers local_key', () => {
    assert.strictEqual(KEY_TYPES.LOCAL_KEY, 'local_key');
    assert.strictEqual(
      resolveDeviceLanKey({ local_key: '0123456789abcdef', device_key: 'other' }),
      '0123456789abcdef'
    );
    const shape = describeKeyShape('aabbccddeeff00112233445566778899');
    assert.strictEqual(shape.format, 'hex32');
  });

  it('TuyaLocalClient cascade starts at preferredVersion', () => {
    const c = new TuyaLocalClient({
      id: 'x',
      key: '0123456789abcdef',
      version: 'auto',
      preferredVersion: '3.5',
      log: () => {},
    });
    assert.strictEqual(c.version, '3.5');
    assert.strictEqual(c._protocolChain[0], '3.5');
  });

  it('listLanBroadcastTargets returns at least one target', () => {
    const t = listLanBroadcastTargets();
    assert.ok(Array.isArray(t) && t.length >= 1);
    assert.ok(t[0].broadcast);
  });
});
