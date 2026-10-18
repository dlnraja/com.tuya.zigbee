'use strict';

/**
 * Tests — HomeModeManager (v9.0.409, P92.113)
 */

const assert = require('assert');
const testApi = global.describe && global.it ? global : require('node:test');
const { describe, it } = testApi;

const HomeModeManager = require('../lib/managers/HomeModeManager');

function solarAt(elevation, isDay) {
  return { getElevation: () => elevation, isDaytime: () => isDay };
}

describe('HomeModeManager', () => {
  it('computes natural mode from solar data', () => {
    const day = new HomeModeManager(null, { solarElevation: solarAt(40, true) });
    assert.strictEqual(day.naturalMode(), 'day');
    const evening = new HomeModeManager(null, { solarElevation: solarAt(-2, false) });
    assert.strictEqual(evening.naturalMode(), 'evening');
    const night = new HomeModeManager(null, { solarElevation: solarAt(-30, false) });
    assert.strictEqual(night.naturalMode(), 'night');
  });

  it('falls back to clock without solar data', () => {
    const mgr = new HomeModeManager(null);
    const noon = new Date(); noon.setHours(12);
    assert.strictEqual(mgr.naturalMode(noon), 'day');
    const h20 = new Date(); h20.setHours(20);
    assert.strictEqual(mgr.naturalMode(h20), 'evening');
    const h2 = new Date(); h2.setHours(2);
    assert.strictEqual(mgr.naturalMode(h2), 'night');
  });

  it('setMode emits mode_changed with previous and manual flag', () => {
    const mgr = new HomeModeManager(null);
    const events = [];
    mgr.on('mode_changed', (d) => events.push(d));
    mgr.setMode('night', { manual: true });
    assert.strictEqual(mgr.mode, 'night');
    assert.deepStrictEqual(events[0], { mode: 'night', previous: 'day', manual: true });
    mgr.destroy();
  });

  it('rejects invalid modes and is idempotent on same mode', () => {
    const mgr = new HomeModeManager(null);
    assert.strictEqual(mgr.setMode('vacation'), false);
    assert.strictEqual(mgr.setMode('day'), true); // même mode, ok
    mgr.destroy();
  });

  it('manual choice wins during override window, auto resumes after', () => {
    const mgr = new HomeModeManager(null, { solarElevation: solarAt(40, true) });
    mgr.setMode('night', { manual: true });
    mgr._evaluate();
    assert.strictEqual(mgr.mode, 'night'); // override actif
    mgr._manualUntil = 0; // expire l'override
    mgr._evaluate();
    assert.strictEqual(mgr.mode, 'day'); // retour au naturel
    mgr.destroy();
  });

  it('away mode is never auto-overridden', () => {
    const mgr = new HomeModeManager(null, { solarElevation: solarAt(40, true) });
    mgr.setMode('away', { manual: true });
    mgr._manualUntil = 0;
    mgr._evaluate();
    assert.strictEqual(mgr.mode, 'away');
    mgr.destroy();
  });

  it('auto transitions can be disabled', () => {
    const mgr = new HomeModeManager(null, { solarElevation: solarAt(-30, false) });
    mgr.setAutoEnabled(false);
    mgr._manualUntil = 0;
    mgr._evaluate();
    assert.strictEqual(mgr.mode, 'day'); // pas de transition
    assert.strictEqual(mgr.autoEnabled, false);
    mgr.destroy();
  });

  it('report reflects current state', () => {
    const mgr = new HomeModeManager(null);
    mgr.setMode('evening');
    const r = mgr.getReport();
    assert.strictEqual(r.mode, 'evening');
    assert.strictEqual(r.auto_enabled, true);
    mgr.destroy();
  });
});
