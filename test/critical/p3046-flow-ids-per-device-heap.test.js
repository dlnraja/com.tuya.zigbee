'use strict';

/**
 * P3046 — Bastien OOM (diag 097f1743, v1.0.209, Homey Pro 2023, heap cap ~62 MB).
 * collectDeclaredFlowIds(homey, device) used to clone the whole app-level flow-id set
 * (~6 000 ids, ~330 KB) for every device on its first capability change / button press and
 * keep it for the device's lifetime. Now one result per driver, and the shared app-level set
 * when the driver adds nothing. Same membership, bounded memory.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const v8 = require('v8');
const vm = require('vm');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function loadWithHomeyMocks(request, parent, isMain) {
  if (request === 'homey') { return { Device: class {}, Driver: class {}, App: class {} }; }
  if (request === 'homey-zigbeedriver') { return { ZigBeeDevice: class {}, ZigBeeDriver: class {} }; }
  return originalLoad.call(this, request, parent, isMain);
};
const { collectDeclaredFlowIds } = require('../../lib/flow/FlowCardHeuristics');
Module._load = originalLoad;

v8.setFlagsFromString('--expose-gc');
const gc = vm.runInNewContext('gc');
function heapMB() { gc(); gc(); return process.memoryUsage().heapUsed / 1e6; }

function bigHomey(n = 6000) {
  const triggers = [];
  for (let i = 0; i < n; i += 1) { triggers.push({ id: `switch_1gang_card_number_${i}_turned_on` }); }
  const drivers = {
    switch_1gang: { id: 'switch_1gang', manifest: { flow: { triggers: [{ id: 'switch_1gang_card_number_1_turned_on' }] } } },
    extra_drv: { id: 'extra_drv', manifest: { flow: { triggers: [{ id: 'driver_only_card' }] } } },
  };
  return { manifest: { flow: { triggers, actions: [], conditions: [] } }, drivers: { getDrivers: () => drivers }, _drivers: drivers };
}

describe('P3046 declared flow ids are not cloned per device', () => {
  it('devices of a driver that adds nothing share the app-level set (no copy)', () => {
    const homey = bigHomey();
    const appSet = collectDeclaredFlowIds(homey);
    const d1 = { driver: homey._drivers.switch_1gang };
    const d2 = { driver: homey._drivers.switch_1gang };
    assert.equal(collectDeclaredFlowIds(homey, d1), appSet);
    assert.equal(collectDeclaredFlowIds(homey, d2), appSet);
    assert.ok(appSet.has('switch_1gang_card_number_5999_turned_on'));
  });

  it('a driver-only card stays visible; one set per driver, not per device', () => {
    const homey = { manifest: { flow: { triggers: [{ id: 'app_card' }] } } };
    const drv = { manifest: { flow: { triggers: [{ id: 'driver_only_card' }], actions: ['string_action'] } } };
    const a = collectDeclaredFlowIds(homey, { driver: drv });
    const b = collectDeclaredFlowIds(homey, { driver: drv });
    assert.equal(a, b);
    assert.ok(a.has('app_card') && a.has('driver_only_card') && a.has('string_action'));
    assert.equal(collectDeclaredFlowIds(homey).has('driver_only_card'), false, 'app-level set is not polluted');
  });

  it('device without a driver gets the app-level set', () => {
    const homey = bigHomey(10);
    assert.equal(collectDeclaredFlowIds(homey, {}), collectDeclaredFlowIds(homey));
  });

  it('memory: 60 devices on a 6 000-card manifest retain well under 2 MB (was ~20 MB)', () => {
    const homey = bigHomey();
    collectDeclaredFlowIds(homey);
    const keep = [];
    const before = heapMB();
    for (let i = 0; i < 60; i += 1) {
      const dev = { driver: i % 2 ? homey._drivers.switch_1gang : homey._drivers.extra_drv };
      keep.push(dev, collectDeclaredFlowIds(homey, dev));
    }
    const grown = heapMB() - before;
    assert.ok(grown < 2, `heap grew ${grown.toFixed(2)} MB for 60 devices`);
    assert.equal(keep.length, 120);
  });
});
