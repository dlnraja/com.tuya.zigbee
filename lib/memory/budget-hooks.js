'use strict';

/**
 * P3023: wire the app-wide MemoryBudget (one instance per app) to the optional caches.
 *
 * Degradation ladder (never touches core control, never removes a capability):
 *   elevated → drop the catalogue caches (rebuilt per couple, from one shard, on next use)
 *   high     → trim every device's optional caches, halve the couple-knowledge LRU
 *              (+ re-probes ×2–×4 slower via MemoryBudget.reprobeFactor())
 *   critical → heuristics paused (MemoryBudget.heuristicsPaused(): exact / user / catalogue
 *              decoding keeps working, only guesses stop learning and emitting)
 * Homey `memwarn` forces `critical` for 10 min (via the MemwarnGuard cleaner 'p3023-budget').
 */

const { shared } = require('./MemoryBudget');

function install(homey, { log, allDevices } = {}) {
  const budget = shared();
  const devs = typeof allDevices === 'function' ? allDevices : () => [];
  let ck = null;
  try { ck = require('../smart/CoupleKnowledge').shared().attach(homey); } catch (_e) { ck = null; }
  budget.register('p3023-catalog', 'elevated', () => {
    try { require('./CatalogStore').release(); } catch (_e) { /* soft */ }
  });
  budget.register('p3023-trim', 'high', () => {
    try { require('./DeviceTrim').trimAll(homey, devs); } catch (_e) { /* soft */ }
    try { if (ck) { ck.trim(); } } catch (_e) { /* soft */ }
  });
  budget.start(homey, { log });
  return budget;
}

function uninstall() {
  try { require('../smart/CoupleKnowledge').shared().stop(); } catch (_e) { /* soft */ }
  try { shared().stop(); } catch (_e) { /* soft */ }
}

module.exports = { install, uninstall };
