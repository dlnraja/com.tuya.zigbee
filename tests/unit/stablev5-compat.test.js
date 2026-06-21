'use strict';

const assert = require('assert');
const { getEventDeduplicationLayer, getCompatReport, STABLE_V5_MODULES, EventDeduplicationLayer } = require('../../lib/compat/StableV5Compat');

// Mock homey minimal pour EventDeduplicationLayer (timer R32)
function mockHomey() {
  const timers = new Set();
  return {
    setTimeout: (fn, ms) => { const id = setTimeout(fn, ms); timers.add(id); return id; },
    clearTimeout: (id) => { clearTimeout(id); timers.delete(id); },
    setInterval: (fn, ms) => { const id = setInterval(fn, ms); timers.add(id); return id; },
    clearInterval: (id) => { clearInterval(id); timers.delete(id); },
    _dispose() { timers.forEach((id) => { clearTimeout(id); clearInterval(id); }); timers.clear(); },
  };
}

describe('StableV5Compat — Module de compatibilité stable-v5 → master', () => {

  describe('Registre STABLE_V5_MODULES', () => {
    it('doit documenter les 11 modules stable-v5 avec leur statut', () => {
      const names = Object.keys(STABLE_V5_MODULES);
      assert.ok(names.length >= 11, `Au moins 11 modules, eu ${names.length}`);
      // Modules clés présents
      assert.ok(STABLE_V5_MODULES.EventDeduplicationLayer, 'EventDeduplicationLayer documenté');
      assert.ok(STABLE_V5_MODULES.HybridDriverSystem, 'HybridDriverSystem documenté');
      assert.ok(STABLE_V5_MODULES.ButtonRemoteManager, 'ButtonRemoteManager documenté');
    });

    it('chaque module doit avoir un statut valide et une raison', () => {
      const validStatuses = ['PORTED', 'SUPERSEDED', 'PARTIAL', 'MERGED'];
      for (const [name, info] of Object.entries(STABLE_V5_MODULES)) {
        assert.ok(validStatuses.includes(info.status),
          `${name} a un statut invalide: ${info.status}`);
        assert.ok(info.reason && info.reason.length > 20,
          `${name} doit avoir une raison détaillée`);
      }
    });
  });

  describe('EventDeduplicationLayer (porté de stable-v5 v5.5.670)', () => {
    let homey, layer;

    beforeEach(() => {
      homey = mockHomey();
      layer = new EventDeduplicationLayer({ homey, windowMs: 100 });
    });
    afterEach(() => { layer.destroy(); homey._dispose(); });

    it('règle d or : 1 action physique = 1 event (déduplication)', () => {
      // Premier event → traité
      assert.strictEqual(layer.shouldProcess('dev1', 'onoff', true), true);
      // Même event dans la fenêtre → dupliqué (ignoré)
      assert.strictEqual(layer.shouldProcess('dev1', 'onoff', true), false);
      assert.strictEqual(layer.stats.deduped, 1);
    });

    it('doit traiter des events différents (valeur changée)', () => {
      assert.strictEqual(layer.shouldProcess('dev1', 'onoff', true), true);
      assert.strictEqual(layer.shouldProcess('dev1', 'onoff', false), true);
    });

    it('doit traiter le même event après expiration de la fenêtre', (done) => {
      layer.shouldProcess('dev1', 'onoff', true);
      // Après 150ms (> fenêtre 100ms), le même event doit repasser
      setTimeout(() => {
        assert.strictEqual(layer.shouldProcess('dev1', 'onoff', true), true);
        done();
      }, 150);
    });

    it('doit isoler les devices (dev1 ≠ dev2)', () => {
      assert.strictEqual(layer.shouldProcess('dev1', 'onoff', true), true);
      assert.strictEqual(layer.shouldProcess('dev2', 'onoff', true), true);
    });

    it('wrap() doit appliquer la déduplication sur un setter', async () => {
      let calls = 0;
      const device = { getData: () => ({ id: 'devX' }) };
      const wrapped = layer.wrap(device, 'onoff', async () => { calls++; });
      await wrapped(true);  // traité
      await wrapped(true);  // dupliqué
      await wrapped(false); // traité (valeur différente)
      assert.strictEqual(calls, 2);
    });

    it('doit exposer des stats pour diagnostics', () => {
      layer.shouldProcess('d', 'c', 1);
      layer.shouldProcess('d', 'c', 1); // dup
      const stats = layer.getStats();
      assert.strictEqual(stats.total, 2);
      assert.strictEqual(stats.deduped, 1);
      assert.ok(stats.dedupRate.endsWith('%'));
    });

    it('destroy() doit nettoyer le timer (règle B7/R32)', () => {
      const l = new EventDeduplicationLayer({ homey, cleanupIntervalMs: 1000 });
      l.destroy();
      assert.strictEqual(l._destroyed, true);
      assert.strictEqual(l._cleanupInterval, null);
    });

    it('doit fail-open (traiter) si détruit', () => {
      layer.destroy();
      assert.strictEqual(layer.shouldProcess('x', 'y', 1), true);
    });
  });

  describe('getEventDeduplicationLayer (singleton)', () => {
    it('doit retourner la même instance (singleton)', () => {
      const h = mockHomey();
      const a = getEventDeduplicationLayer(h);
      const b = getEventDeduplicationLayer(h);
      assert.strictEqual(a, b);
      a.destroy();
      h._dispose();
    });

    it('doit recréer une instance si la précédente est détruite', () => {
      const h = mockHomey();
      const a = getEventDeduplicationLayer(h);
      a.destroy();
      const b = getEventDeduplicationLayer(h);
      assert.notStrictEqual(a, b);
      b.destroy();
      h._dispose();
    });
  });

  describe('getCompatReport (diagnostics)', () => {
    it('doit retourner un rapport complet', () => {
      const report = getCompatReport();
      assert.ok(report.EventDeduplicationLayer);
      assert.ok(report.HybridDriverSystem);
      assert.ok(typeof report.EventDeduplicationLayer.reason === 'string');
    });
  });
});
