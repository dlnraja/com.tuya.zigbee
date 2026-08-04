'use strict';

/**
 * Tests — Bidirectional button dedup (v9.0.411, P92.115)
 * Vérifie la déduplication partagée virtuel (UI) ↔ physique.
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

// Simule la logique du listener universel + stamp physique
function makeDevice() {
  return {
    _virtualPhysicalDedup: null,
    logs: [],
    flows: [],
    toggles: [],
    hasCapability: (c) => c === 'onoff' || c === 'onoff.gang2',
    getCapabilityValue: () => false,
    _setGangOnOff: async (gang, v) => { /* toggle simulé */ },
    triggerButtonPress: async (gang, type, count, opts) => { /* flow simulé */ },
  };
}

function virtualPress(device, gang, now) {
  if (!device._virtualPhysicalDedup) {
    device._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
  }
  const lastPhysical = device._virtualPhysicalDedup.lastPhysicalPress[gang] || 0;
  if (now - lastPhysical < device._virtualPhysicalDedup.dedupWindow) {
    return 'dropped';
  }
  device._virtualPhysicalDedup.lastVirtualPress[gang] = now;
  device.toggles.push(gang);
  device.flows.push(gang);
  return 'fired';
}

function physicalPress(device, gang, now) {
  if (!device._virtualPhysicalDedup) {
    device._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
  }
  device._virtualPhysicalDedup.lastPhysicalPress[gang] = now;
}

describe('bidirectional button dedup', () => {
  it('virtual press fires flow and toggle when no recent physical press', () => {
    const d = makeDevice();
    assert.strictEqual(virtualPress(d, 2, 10000), 'fired');
    assert.deepStrictEqual(d.toggles, [2]);
    assert.deepStrictEqual(d.flows, [2]);
  });

  it('virtual press is dropped within 2s of a physical press', () => {
    const d = makeDevice();
    physicalPress(d, 1, 10000);
    assert.strictEqual(virtualPress(d, 1, 11000), 'dropped'); // 1s après
    assert.strictEqual(d.flows.length, 0);
  });

  it('virtual press fires again after the dedup window', () => {
    const d = makeDevice();
    physicalPress(d, 1, 10000);
    assert.strictEqual(virtualPress(d, 1, 12100), 'fired'); // 2.1s après
  });

  it('dedup state is shared across gangs independently', () => {
    const d = makeDevice();
    physicalPress(d, 1, 10000);
    assert.strictEqual(virtualPress(d, 2, 10500), 'fired'); // gang différent
    assert.strictEqual(virtualPress(d, 1, 10500), 'dropped'); // même gang
  });

  it('repeated virtual presses without physical press all fire', () => {
    const d = makeDevice();
    const t0 = Date.now();
    assert.strictEqual(virtualPress(d, 1, t0), 'fired');
    assert.strictEqual(virtualPress(d, 1, t0 + 500), 'fired');
    assert.strictEqual(d.flows.length, 2);
  });
});
