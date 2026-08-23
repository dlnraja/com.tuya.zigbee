'use strict';

/**
 * P2220 — UI button.N must markAppCommand + prefer VirtualButtonMixin + scene-only flow
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

function makeUiListenerDevice(opts = {}) {
  const calls = { mark: [], set: [], toggle: [], flows: [], setGang: [] };
  const caps = new Set(opts.caps || ['button.1', 'onoff']);
  return {
    calls,
    _buttonCapListenersRegistered: false,
    _virtualPhysicalDedup: null,
    hasCapability: (c) => caps.has(c),
    getCapabilities: () => [...caps],
    getCapabilityValue: () => false,
    log: () => {},
    markAppCommand(g, v) { calls.mark.push([g, v]); },
    _handleVirtualToggle: opts.withVirtual
      ? async (g) => { calls.toggle.push(g); }
      : undefined,
    _setGangOnOff: async (g, v) => { calls.setGang.push([g, v]); },
    safeSetCapabilityValue: async (c, v) => { calls.set.push([c, v]); },
    triggerButtonPress: async (g, t, n, o) => { calls.flows.push({ g, t, n, o }); },
    registerCapabilityListener(cap, fn) {
      this._listener = { cap, fn };
    },
  };
}

/** Mirror of P2220 listener body (kept in sync with TuyaZigbeeDevice). */
async function runUiPress(device, gang) {
  const now = Date.now();
  if (!device._virtualPhysicalDedup) {
    device._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: {}, dedupWindow: 2000 };
  }
  const lastPhysical = device._virtualPhysicalDedup.lastPhysicalPress[gang] || 0;
  if (now - lastPhysical < device._virtualPhysicalDedup.dedupWindow) return 'dropped';
  device._virtualPhysicalDedup.lastVirtualPress[gang] = now;

  const gangCap = device.hasCapability(`onoff.gang${gang}`) ? `onoff.gang${gang}`
    : (device.hasCapability(`onoff.${gang}`) ? `onoff.${gang}`
      : (gang === 1 && device.hasCapability('onoff') ? 'onoff' : null));

  if (gangCap && typeof device._handleVirtualToggle === 'function') {
    await device._handleVirtualToggle(gang);
    await device.triggerButtonPress(gang, 'single', 1, { source: 'virtual' });
    return 'virtual-mixin';
  }
  if (gangCap) {
    const next = !device.getCapabilityValue(gangCap);
    device.markAppCommand(gang, next);
    await device._setGangOnOff(gang, next);
    await device.triggerButtonPress(gang, 'single', 1, { source: 'virtual' });
    return 'marked-toggle';
  }
  await device.triggerButtonPress(gang, 'single', 1, { source: 'virtual' });
  return 'scene-flow';
}

describe('P2220 button UI / UX realign', () => {
  it('switch UI uses markAppCommand before toggle when no VirtualButtonMixin', async () => {
    const d = makeUiListenerDevice({ caps: ['button.1', 'onoff'] });
    assert.strictEqual(await runUiPress(d, 1), 'marked-toggle');
    assert.deepStrictEqual(d.calls.mark, [[1, true]]);
    assert.deepStrictEqual(d.calls.setGang, [[1, true]]);
    assert.strictEqual(d.calls.flows[0].o.source, 'virtual');
  });

  it('prefers VirtualButtonMixin when present', async () => {
    const d = makeUiListenerDevice({ caps: ['button.2', 'onoff.gang2'], withVirtual: true });
    assert.strictEqual(await runUiPress(d, 2), 'virtual-mixin');
    assert.deepStrictEqual(d.calls.toggle, [2]);
    assert.strictEqual(d.calls.mark.length, 0);
  });

  it('scene remote (button only) fires flow without inventing onoff', async () => {
    const d = makeUiListenerDevice({ caps: ['button.1', 'button.2'] });
    assert.strictEqual(await runUiPress(d, 1), 'scene-flow');
    assert.strictEqual(d.calls.mark.length, 0);
    assert.strictEqual(d.calls.setGang.length, 0);
    assert.strictEqual(d.calls.flows[0].g, 1);
  });

  it('drops UI press within physical dedup window', async () => {
    const d = makeUiListenerDevice({ caps: ['button.1', 'onoff'] });
    d._virtualPhysicalDedup = { lastVirtualPress: {}, lastPhysicalPress: { 1: Date.now() }, dedupWindow: 2000 };
    assert.strictEqual(await runUiPress(d, 1), 'dropped');
    assert.strictEqual(d.calls.flows.length, 0);
  });
});
