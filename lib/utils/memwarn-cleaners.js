'use strict';
// WHY: Homey emits `memwarn` before killing an app over its memory budget (SDK docs).
// Register the app's real, rebuildable caches with MemwarnGuard. Every entry is optional
// (module may not exist on a branch) and only clears data that is recomputed on demand.
const SHARED = [
  ['lazy-load', '../performance/IntelligentLazyLoad', (m) => m.clearLazyCache && m.clearLazyCache()],
  ['soft-features', '../features/SoftFeatureCatalog', (m) => m.clearCache && m.clearCache()],
  ['divisors', '../managers/SmartDivisorManager', (m) => m.clearDivisorCache && m.clearDivisorCache()],
  ['mfr-names', '../utils/ManufacturerNameHelper', (m) => m.clearCache && m.clearCache()],
];

function allDevices(homey) {
  const out = [];
  try {
    const drivers = homey && homey.drivers && homey.drivers.getDrivers ? homey.drivers.getDrivers() : {};
    for (const d of Object.values(drivers || {})) {
      try { out.push(...d.getDevices ? d.getDevices() : []); } catch (_) { /* driver not ready */ }
    }
  } catch (_) { /* soft */ }
  return out;
}

function registerAppCleaners(guard, homey, { load = require } = {}) {
  const registered = [];
  for (const [name, path, fn] of SHARED) {
    let mod = null;
    try { mod = load(path); } catch (_) { continue; }
    guard.register(name, () => fn(mod)); registered.push(name);
  }
  // Lazily loaded big JSON data (dp_registry, energy reference...): parsed again on next use.
  guard.register('json-cache', () => { try { load('./BoundedJsonCache').clearShared(); } catch (_) { /* soft */ } });
  registered.push('json-cache');
  // Per-device derived caches: capability map (rebuilt lazily) and in-memory log ring buffers.
  guard.register('device-caches', () => {
    for (const dev of allDevices(homey)) {
      try { if (typeof dev._invalidateCapabilityMap === 'function') {dev._invalidateCapabilityMap();} } catch (_) { /* soft */ }
      for (const k of ['_logBuffer', '_debugLog', '_rxHistory']) {
        if (Array.isArray(dev[k]) && dev[k].length > 50) {dev[k].splice(0, dev[k].length - 50);}
      }
    }
  });
  registered.push('device-caches');
  // P3023: memwarn → MemoryBudget critical for 10 min (catalogue release, device trims,
  // heuristics paused, re-probes slowed). No-op if the budget module is unavailable.
  guard.register('p3023-budget', () => { try { load('../memory/MemoryBudget').shared().onMemwarn(); } catch (_) { /* soft */ } });
  registered.push('p3023-budget');
  return registered;
}

module.exports = { registerAppCleaners, _allDevices: allDevices };
