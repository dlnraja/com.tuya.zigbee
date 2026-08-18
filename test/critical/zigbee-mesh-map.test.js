'use strict';

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const ZigbeeMeshMap = require('../../lib/features/ZigbeeMeshMap');

function fakeDevice(opts) {
  const {
    id, name, zone, caps = [], lqi, ieee, parentIeee, available = true, mains,
  } = opts;
  return {
    id,
    mainsPowered: mains === true,
    zclNode: lqi != null || ieee || parentIeee
      ? { ieeeAddr: ieee, lastHopLqi: lqi, parentIeeeAddr: parentIeee, endpoints: { 1: { LQI: lqi } } }
      : {},
    getId: () => id,
    getName: () => name || id,
    getCapabilities: () => caps,
    getAvailable: () => available,
    getData: () => ({ id, ieeeAddress: ieee }),
    getDriver: () => ({ getId: () => opts.driverId || 'switch_1gang' }),
    getZone: () => (zone ? { getName: () => zone } : null),
    getCapabilityValue: () => null,
  };
}

function fakeHomey(devices) {
  return {
    zigbee: { ieeeAddress: 'AA:BB:CC:DD:EE:FF:00:11' },
    drivers: {
      getDrivers: () => ({
        switch_1gang: { getDevices: () => devices },
      }),
    },
  };
}

describe('ZigbeeMeshMap', () => {
  it('bands LQI like Z2M graphviz quality buckets', () => {
    assert.strictEqual(ZigbeeMeshMap.lqiBand(220), 'excellent');
    assert.strictEqual(ZigbeeMeshMap.lqiBand(160), 'good');
    assert.strictEqual(ZigbeeMeshMap.lqiBand(120), 'fair');
    assert.strictEqual(ZigbeeMeshMap.lqiBand(70), 'poor');
    assert.strictEqual(ZigbeeMeshMap.lqiBand(10), 'bad');
    assert.strictEqual(ZigbeeMeshMap.lqiBand(null), 'unknown');
  });

  it('builds a coordinator-rooted spider and infers zone-router parents', () => {
    const homey = fakeHomey([
      fakeDevice({ id: 'plug', name: 'Plug', zone: 'Kitchen', lqi: 210, ieee: '11:22' }),
      fakeDevice({ id: 'sense', name: 'TH', zone: 'Kitchen', caps: ['measure_battery'], lqi: 80, ieee: '33:44' }),
      fakeDevice({ id: 'door', name: 'Door', zone: 'Hall', caps: ['alarm_contact', 'measure_battery'], lqi: 40 }),
    ]);
    const snap = ZigbeeMeshMap.buildSnapshot(homey);
    assert.strictEqual(snap.coordinatorId, 'homey');
    assert.strictEqual(snap.inferred, true);
    assert.strictEqual(snap.stats.total, 3);
    assert.strictEqual(snap.stats.routers, 1);
    assert.strictEqual(snap.stats.endDevices, 2);
    const sense = snap.nodes.find((n) => n.id === 'sense');
    assert.strictEqual(sense.parentId, 'plug');
    assert.strictEqual(sense.parentKind, 'inferred');
    const door = snap.nodes.find((n) => n.id === 'door');
    assert.strictEqual(door.parentId, 'homey');
    assert.strictEqual(door.band, 'bad');
  });

  it('prefers a reported parent IEEE over zone inference', () => {
    const nodes = [
      { id: 'homey', role: 'coordinator', ieee: 'aa' },
      { id: 'r1', role: 'router', online: true, zone: 'A', ieee: 'bb' },
      { id: 'r2', role: 'router', online: true, zone: 'A', ieee: 'cc' },
      { id: 'ed', role: 'end_device', online: true, zone: 'A', parentIeee: 'cc' },
    ];
    ZigbeeMeshMap.inferParents(nodes);
    assert.strictEqual(nodes[3].parentId, 'r2');
    assert.strictEqual(nodes[3].parentKind, 'reported');
  });
});
