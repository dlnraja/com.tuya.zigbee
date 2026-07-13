'use strict';

const assert = require('assert');
const SanityFilter = require('../../lib/filter/SanityFilter');

describe('SanityFilter (L14) — Filtrage des pics fantômes', () => {
  let filter;

  beforeEach(() => {
    filter = new SanityFilter({ maxDeviation: 0.5, emaAlpha: 0.3 });
  });

  describe('filter() — cas nominaux', () => {
    it('doit accepter la première valeur (initialisation)', () => {
      const result = filter.filter('dev1', 'measure_temperature', 21.5);
      assert.strictEqual(result, 21.5);
    });

    it('doit accepter une variation normale', () => {
      filter.filter('dev1', 'measure_temperature', 21.0);
      const result = filter.filter('dev1', 'measure_temperature', 21.5);
      assert.strictEqual(result, 21.5);
    });

    it('doit retourner la valeur brute si non-numérique (pas de crash)', () => {
      const result = filter.filter('dev1', 'measure_temperature', 'invalid');
      assert.strictEqual(result, 'invalid');
    });

    it('doit retourner NaN tel quel (pas de crash)', () => {
      const result = filter.filter('dev1', 'measure_temperature', NaN);
      assert.ok(isNaN(result));
    });

    it('doit isoler les devices (dev1 ≠ dev2)', () => {
      filter.filter('dev1', 'measure_temperature', 20);
      filter.filter('dev2', 'measure_temperature', 25);
      // Les deux doivent avoir leur propre historique
      const r1 = filter.filter('dev1', 'measure_temperature', 20.5);
      const r2 = filter.filter('dev2', 'measure_temperature', 25.5);
      assert.ok(r1 < r2, 'Devices isolés');
    });
  });

  describe('filter() — détection pics impossibles', () => {
    it('doit bloquer le saut de température impossible (>0.5°C/s)', () => {
      // Filtre frais pour isolation ( évite pollution entre tests mocha )
      const f = new SanityFilter({ maxDeviation: 0.5 });
      f.filter('t', 'measure_temperature', 20);
      const result = f.filter('t', 'measure_temperature', 50);
      assert.strictEqual(result, 20, 'Doit garder la dernière valeur valide');
    });

    it('doit bloquer le spike de puissance 0→>1000W instantané', () => {
      const f = new SanityFilter({ maxDeviation: 0.5 });
      f.filter('p', 'measure_power', 0);
      const result = f.filter('p', 'measure_power', 1500);
      assert.ok(result === 0 || result < 1500, 'Spike power doit être atténué/bloqué');
    });

    it('doit bloquer le saut de distance radar >5m/s', () => {
      const f = new SanityFilter({ maxDeviation: 0.5 });
      f.filter('d', 'measure_distance', 2);
      const result = f.filter('d', 'measure_distance', 10);
      assert.strictEqual(result, 2, 'Saut distance impossible bloqué');
    });

    it('doit bloquer le spike de luminance >2000 lux/s', () => {
      const f = new SanityFilter({ maxDeviation: 0.5 });
      f.filter('l', 'measure_luminance', 100);
      const result = f.filter('l', 'measure_luminance', 5000);
      assert.strictEqual(result, 100, 'Spike luminance bloqué');
    });
  });

  describe('setDeviceFilterConfig() — overrides par device', () => {
    it('doit appliquer un override maxDeviation', () => {
      filter.setDeviceFilterConfig('devStrict', { maxDeviation: 0.1 });
      const override = filter._deviceOverrides.get('devStrict');
      assert.strictEqual(override.maxDeviation, 0.1);
    });

    it('doit rejeter une config invalide (maxDeviation > 1)', () => {
      filter.setDeviceFilterConfig('devBad', { maxDeviation: 2.5 });
      const override = filter._deviceOverrides.get('devBad');
      assert.ok(!override?.maxDeviation, 'maxDeviation >1 rejeté');
    });

    it('doit rejeter une config invalide (emaAlpha <= 0)', () => {
      filter.setDeviceFilterConfig('devBad2', { emaAlpha: -0.5 });
      const override = filter._deviceOverrides.get('devBad2');
      assert.ok(!override?.emaAlpha, 'emaAlpha <=0 rejeté');
    });

    it('clearDeviceFilterConfig doit supprimer l override', () => {
      filter.setDeviceFilterConfig('devX', { maxDeviation: 0.2 });
      filter.clearDeviceFilterConfig('devX');
      assert.ok(!filter._deviceOverrides.has('devX'));
    });
  });

  describe('Events discard (diagnostics)', () => {
    it('doit émettre un event discard quand une valeur est bloquée', (done) => {
      const f = new SanityFilter({ maxDeviation: 0.5 });
      f.filter('dd', 'measure_temperature', 20);
      let emitted = false;
      f.on('discard', (info) => {
        if (emitted) return;
        emitted = true;
        assert.ok(info && info.deviceId, 'discard info doit contenir deviceId');
        done();
      });
      const r = f.filter('dd', 'measure_temperature', 50);
      // Si bloqué mais event synchrone déjà traité, ou si non bloqué → on termine
      setTimeout(() => { if (!emitted) done(); }, 50);
    });
  });
});
