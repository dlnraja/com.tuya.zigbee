'use strict';

const assert = require('assert');
const MultiGangMixin = require('../../lib/mixins/MultiGangMixin');

// Mock device minimal
function mockDevice(capabilities) {
  const device = {
    _capabilities: capabilities || ['onoff'],
    _capabilityValues: {},
    log() {}, error() {},
    getCapabilities() { return this._capabilities; },
    hasCapability(c) { return this._capabilities.includes(c); },
    getCapabilityValue(c) { return this._capabilityValues[c]; },
    setCapabilityValue(c, v) { this._capabilityValues[c] = v; return Promise.resolve(); },
    registerMultipleCapabilityListener() {},
    sendTuyaCommand: async (dp, type, value) => ({ dp, type, value }),
    sendDP: async (dp, type, value) => ({ dp, type, value }),
  };
  return device;
}

// Classe de test appliquant le mixin
function makeInstance(capabilities) {
  class TestBase {
    constructor(d) { Object.assign(this, d); }
    log() {} error() {}
    async onInit() {}
  }
  const Mixed = MultiGangMixin(TestBase);
  return new Mixed(mockDevice(capabilities));
}

describe('MultiGangMixin — Synchronisation multi-gang', () => {

  describe('_buildGangMapFromCapabilities', () => {
    it('doit mapper 1-gang : onoff → DP1', () => {
      const inst = makeInstance(['onoff']);
      const map = inst._buildGangMapFromCapabilities();
      assert.strictEqual(map[1], 'onoff');
    });

    it('doit mapper 2-gang : onoff + onoff.1 → DP1+DP2', () => {
      const inst = makeInstance(['onoff', 'onoff.1']);
      const map = inst._buildGangMapFromCapabilities();
      assert.strictEqual(map[1], 'onoff');
      assert.strictEqual(map[2], 'onoff.1');
    });

    it('doit mapper 4-gang correctement', () => {
      const inst = makeInstance(['onoff', 'onoff.1', 'onoff.2', 'onoff.3']);
      const map = inst._buildGangMapFromCapabilities();
      assert.strictEqual(map[1], 'onoff');
      assert.strictEqual(map[2], 'onoff.1');
      assert.strictEqual(map[3], 'onoff.2');
      assert.strictEqual(map[4], 'onoff.3');
    });

    it('doit supporter customGangMap override', () => {
      const inst = makeInstance(['onoff']);
      inst.customGangMap = { 5: 'onoff.custom', 1: 'onoff' };
      const map = inst._buildGangMapFromCapabilities();
      assert.strictEqual(map[5], 'onoff.custom');
    });
  });

  describe('handleGangReport (Synchronization Shield)', () => {
    it('doit bloquer les rapports redondants (state differential filter)', async () => {
      const inst = makeInstance(['onoff']);
      inst.gangMappings = { 1: 'onoff' };
      inst.setCapabilityValue('onoff', true);
      // Même valeur → doit retourner false (bloqué)
      const result = await inst.handleGangReport(1, true);
      assert.strictEqual(result, false);
    });

    it('doit accepter les changements d état réels', async () => {
      const inst = makeInstance(['onoff']);
      inst.gangMappings = { 1: 'onoff' };
      inst.setCapabilityValue('onoff', false);
      // handleGangReport utilise _safeSetCapability si présent (CapabilityManagerMixin)
      inst._safeSetCapability = async (cap, val) => {
        inst.setCapabilityValue(cap, val);
        return true;
      };
      // Changement false→true → doit propager
      const result = await inst.handleGangReport(1, true);
      assert.strictEqual(result, true);
      assert.strictEqual(inst.getCapabilityValue('onoff'), true);
    });

    it('doit retourner false pour DP non mappé', async () => {
      const inst = makeInstance(['onoff']);
      inst.gangMappings = { 1: 'onoff' };
      const result = await inst.handleGangReport(99, true);
      assert.strictEqual(result, false);
    });
  });

  describe('_getDpFromCapability', () => {
    it('doit retrouver le DP depuis une capability', () => {
      const inst = makeInstance(['onoff', 'onoff.1']);
      inst.gangMappings = { 1: 'onoff', 2: 'onoff.1' };
      const dp = inst._getDpFromCapability('onoff.1');
      // Note : Object.keys retourne des strings — bug potentiel documenté
      assert.ok(dp === '2' || dp === 2, `DP devrait être 2, eu ${dp}`);
    });

    it('doit retourner undefined pour capability inconnue', () => {
      const inst = makeInstance(['onoff']);
      inst.gangMappings = { 1: 'onoff' };
      const dp = inst._getDpFromCapability('inexistant');
      assert.strictEqual(dp, undefined);
    });
  });

  describe('_onMultipleGangAction (UI-to-HW)', () => {
    it('doit router vers sendTuyaCommand quand disponible', async () => {
      const inst = makeInstance(['onoff']);
      inst.gangMappings = { 1: 'onoff' };
      const calls = [];
      inst.sendTuyaCommand = async (dp, type, value) => {
        calls.push({ dp, type, value });
        return { ok: true };
      };
      await inst._onMultipleGangAction({ onoff: true }, {});
      assert.strictEqual(calls.length, 1);
      assert.strictEqual(calls[0].value, true);
    });
  });
});
