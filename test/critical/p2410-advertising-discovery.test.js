'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  buildWifiLanSnapshot,
  annotateZigbeeAdvertising,
  burstWifiProbe,
} = require('../../lib/discovery/AutonomousAdvertisingDiscovery');
const DynamicEndpointDiscovery = require('../../lib/pairing/DynamicEndpointDiscovery');
const TuyaUDPDiscovery = require('../../lib/tuya-local/TuyaUDPDiscovery');
const ZigbeeMeshMap = require('../../lib/features/ZigbeeMeshMap');

describe('P2410 autonomous advertising discovery', () => {
  it('UDP discovery exposes listAdvertising + burstProbe', () => {
    const udp = new TuyaUDPDiscovery({ log: () => {} });
    assert.strictEqual(typeof udp.listAdvertising, 'function');
    assert.strictEqual(typeof udp.burstProbe, 'function');
    udp._devices.set('abc', {
      info: { deviceId: 'abc', ip: '1.2.3.4', version: '3.4', advertising: true },
      lastSeen: Date.now(),
    });
    const list = udp.listAdvertising({ maxAgeMs: 60000 });
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].deviceId, 'abc');
    assert.strictEqual(list[0].advertising, true);
  });

  it('buildWifiLanSnapshot merges UDP advertising and marks paired', () => {
    const udp = {
      listAdvertising() {
        return [
          { deviceId: 'dev1', ip: '10.0.0.2', version: '3.5', lastSeen: Date.now(), source: 'udp' },
          { deviceId: 'dev2', ip: '10.0.0.3', version: '3.3', lastSeen: Date.now(), source: 'udp' },
        ];
      },
    };
    const fakeDevice = {
      getSettings: () => ({ device_id: 'dev1' }),
      getData: () => ({ id: 'dev1' }),
    };
    const homey = {
      drivers: {
        getDrivers: () => ({
          wifi_plug: { getDevices: () => [fakeDevice] },
        }),
      },
      discovery: { getStrategy: () => null },
    };
    const snap = buildWifiLanSnapshot(homey, { udpDiscovery: udp });
    assert.strictEqual(snap.stats.total, 2);
    assert.strictEqual(snap.stats.paired, 1);
    assert.strictEqual(snap.stats.unpaired, 1);
    const p = snap.devices.find((d) => d.deviceId === 'dev1');
    assert.strictEqual(p.paired, true);
  });

  it('annotateZigbeeAdvertising marks recent online nodes', () => {
    const now = Date.now();
    const snap = {
      nodes: [
        { id: 'homey', role: 'coordinator', online: true, lastSeen: now },
        { id: 'a', role: 'router', online: true, lastSeen: now, rxLastHour: 2 },
        { id: 'b', role: 'end_device', online: false, lastSeen: now - 99999999, rxLastHour: 0 },
      ],
      stats: {},
    };
    annotateZigbeeAdvertising(snap, { now, maxAgeMs: 60000 });
    assert.strictEqual(snap.nodes[0].advertising, true);
    assert.strictEqual(snap.nodes[1].advertising, true);
    assert.strictEqual(snap.nodes[2].advertising, false);
    assert.ok(snap.stats.advertising >= 1);
  });

  it('ZigbeeMeshMap snapshot includes advertising stats when devices present', () => {
    const homey = {
      drivers: { getDrivers: () => ({}) },
      zigbee: { ieeeAddress: '00:11:22:33:44:55:66:77' },
    };
    const snap = ZigbeeMeshMap.buildSnapshot(homey);
    assert.ok(snap.nodes.length >= 1);
    assert.strictEqual(typeof snap.stats.advertising, 'number');
    assert.strictEqual(snap.nodes[0].advertising, true);
  });

  it('DynamicEndpointDiscovery catalogs advertised clusters', async () => {
    const ded = new DynamicEndpointDiscovery({ log: () => {} });
    const zclNode = {
      manufacturerName: '_TZ3000_test',
      modelId: 'TS0001',
      endpoints: {
        1: { clusters: { basic: {}, onOff: {}, 6: {} } },
        242: { clusters: {} },
      },
    };
    const eps = await ded.discover(zclNode);
    assert.strictEqual(eps.length, 1);
    assert.strictEqual(eps[0].advertising, true);
    assert.strictEqual(eps[0].hasOnOff, true);
    const sum = ded.summarizeAdvertising(zclNode);
    assert.strictEqual(sum.manufacturerName, '_TZ3000_test');
    assert.strictEqual(sum.productId, 'TS0001');
    assert.strictEqual(sum.advertising, true);
  });

  it('burstWifiProbe falls back to probeNow', async () => {
    let called = 0;
    const r = await burstWifiProbe({
      probeNow: async () => { called += 1; },
    });
    assert.strictEqual(called, 1);
    assert.deepStrictEqual(r, { probes: 1 });
  });
});
