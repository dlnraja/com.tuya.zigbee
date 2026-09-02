'use strict';

/**
 * P2397 — Homey UI gang representations + bidirectional EP-only virtual toggle
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const {
  resolveGangCount,
  countCapabilitiesGangHint,
} = require('../../lib/utils/BidirectionalButtonState');
const {
  ensureGangUiCapabilities,
  usesHomeyZigbeeSubDevices,
  pulseButtonCapability,
} = require('../../lib/utils/ensureGangUiCapabilities');

describe('P2397 gang UI bidirectional', () => {
  it('resolveGangCount reads button.N capability hints', () => {
    const d = {
      gangCount: 1,
      getCapabilities: () => ['onoff', 'button.1', 'button.2', 'button.3'],
    };
    assert.strictEqual(countCapabilitiesGangHint(d), 3);
    assert.strictEqual(resolveGangCount(d), 3);
  });

  it('ensureGangUiCapabilities soft-adds onoff.gangN for multi-cap switches', async () => {
    const caps = new Set(['onoff', 'button.1', 'button.2']);
    const d = {
      gangCount: 1,
      hasCapability: (c) => caps.has(c),
      getCapabilities: () => [...caps],
      addCapability: async (c) => { caps.add(c); },
      log: () => {},
    };
    const r = await ensureGangUiCapabilities(d);
    assert.ok(caps.has('onoff.gang2'));
    assert.ok(r.added.includes('onoff.gang2'));
    assert.strictEqual(r.subDevices, false);
  });

  it('ensureGangUiCapabilities skips onoff.gangN on Homey zigbee.devices parents', async () => {
    const caps = new Set(['onoff', 'button.1', 'button.2']);
    const d = {
      gangCount: 1,
      hasCapability: (c) => caps.has(c),
      getCapabilities: () => [...caps],
      addCapability: async (c) => { caps.add(c); },
      driver: { manifest: { zigbee: { devices: { secondSwitch: { capabilities: ['onoff'] } } } } },
      log: () => {},
    };
    assert.strictEqual(usesHomeyZigbeeSubDevices(d), true);
    const r = await ensureGangUiCapabilities(d);
    assert.strictEqual(caps.has('onoff.gang2'), false);
    assert.strictEqual(r.subDevices, true);
  });

  it('pulseButtonCapability toggles button.N', async () => {
    const values = [];
    const d = {
      hasCapability: (c) => c === 'button.2',
      safeSetCapabilityValue: async (c, v) => { values.push([c, v]); },
    };
    assert.strictEqual(pulseButtonCapability(d, 2, 10), true);
    await new Promise((r) => setTimeout(r, 30));
    assert.deepStrictEqual(values[0], ['button.2', true]);
    assert.ok(values.some((x) => x[0] === 'button.2' && x[1] === false));
  });
});
