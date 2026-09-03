'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  listLanSubnetHosts,
  ipv4ToInt,
  intToIpv4,
  forceScanTcp6668,
} = require('../../lib/tuya-local/TuyaTcpForceScan');
const {
  matchCloudToLan,
} = require('../../lib/tuya-local/TuyaPairingOrchestrator');

const orch = require('../../lib/tuya-local/TuyaPairingOrchestrator');

describe('P2411 max discovery + pairing', () => {
  it('ipv4 int roundtrip', () => {
    assert.strictEqual(intToIpv4(ipv4ToInt('192.168.1.50')), '192.168.1.50');
  });

  it('listLanSubnetHosts returns /24-ish hosts or empty safely', () => {
    const hosts = listLanSubnetHosts({ maxPerNic: 10 });
    assert.ok(Array.isArray(hosts));
    for (const h of hosts.slice(0, 5)) {
      assert.ok(h.ip);
      assert.ok(h.selfIp);
      assert.notStrictEqual(h.ip, h.selfIp);
    }
  });

  it('matchCloudToLan matches case-insensitive id and keeps orphans', () => {
    const cloud = [
      { id: 'BFABCDEF', local_key: '1234567890abcdef', name: 'Plug' },
    ];
    const lan = [
      { id: 'bfabcdef', ip: '10.0.0.9', version: '3.5', source: 'udp' },
      { id: 'orphan99', ip: '10.0.0.10', version: '3.3', source: 'udp' },
    ];
    const out = matchCloudToLan(cloud, lan);
    const plug = out.find((d) => String(d.id).toLowerCase() === 'bfabcdef');
    assert.ok(plug);
    assert.strictEqual(plug.discovered, true);
    assert.strictEqual(plug.ip, '10.0.0.9');
    const orphan = out.find((d) => d.orphan_lan);
    assert.ok(orphan);
    assert.strictEqual(orphan.id, 'orphan99');
  });

  it('matchCloudToLan soft-matches unique productKey', () => {
    const cloud = [
      { id: 'cloud1', local_key: 'abcdefghijklmnop', product_id: 'keyABC', name: 'Light' },
    ];
    const lan = [
      { id: '', ip: '10.0.0.44', version: '3.4', productKey: 'keyABC', source: 'udp' },
    ];
    const out = matchCloudToLan(cloud, lan);
    assert.strictEqual(out[0].discovered, true);
    assert.strictEqual(out[0].ip, '10.0.0.44');
  });

  it('exports maxDiscover and forceScanTcp6668', () => {
    assert.strictEqual(typeof orch.maxDiscover, 'function');
    assert.strictEqual(typeof forceScanTcp6668, 'function');
  });

  it('forceScanTcp6668 completes with empty/safe result off-LAN', async () => {
    const hits = await forceScanTcp6668({
      maxPerNic: 0,
      concurrency: 4,
      timeoutMs: 50,
      log: () => {},
    });
    assert.ok(Array.isArray(hits));
  });
});
