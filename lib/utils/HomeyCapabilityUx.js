'use strict';

/**
 * HomeyCapabilityUx (P2500 / P2553)
 *
 * WHY: Athom + Device Capabilities (T43287) - sensor readables must stay getable
 * so Homey shows tiles + Insights History. button.N getable:false remains OK (P2492).
 * Contre quoi: Peter Smartbutton battery hidden by getable:false (P2499).
 *
 * P2553: fleet History enable - force getable:true + preventInsights:false on
 * measure_/meter_/alarm_* except intelligent silence allowlist (duplicate motion,
 * mmWave distance flood).
 * P3362: restore standard units when missing so Insights and Apple Home agree.
 */

const SENSOR_PREFIXES = ['measure_', 'meter_', 'alarm_'];

/** Caps that flood Homey History if Insights stay on (mmWave / zone spam). */
const HISTORY_SILENCE_EXACT = new Set([
  // filled dynamically for distance.*
]);

const HISTORY_SILENCE_PREFIX = [
  'measure_luminance.distance',
  'measure_motion.classification',
];

/**
 * WHY(P2551/P2553): when alarm_human exists, silence alarm_motion Insights
 * so History is not dual English+locale spam (VicHY #2240).
 */
function shouldSilenceInsights(cap, deviceCaps) {
  const id = String(cap || '');
  if (HISTORY_SILENCE_EXACT.has(id)) {return true;}
  if (HISTORY_SILENCE_PREFIX.some((p) => id === p || id.startsWith(`${p}.`) || id.startsWith(p))) {
    return true;
  }
  const caps = Array.isArray(deviceCaps) ? deviceCaps : [];
  if (id === 'alarm_motion' && caps.includes('alarm_human')) {return true;}
  if (/^alarm_motion\.zone\d+$/.test(id) && caps.includes('alarm_human')) {return true;}
  return false;
}

function isSensorReadableCap(cap) {
  const id = String(cap || '');
  return SENSOR_PREFIXES.some((p) => id.startsWith(p));
}

function mustNeverGetableFalse(cap) {
  return isSensorReadableCap(cap);
}

function isButtonMaintenanceCap(cap) {
  return /^button(\.|$)/.test(String(cap || ''));
}

let _unitsTable = null;
function loadUnitsTable() {
  if (_unitsTable) {return _unitsTable;}
  try {
    _unitsTable = require('../../config/architecture/standard-capability-units.json');
  } catch (_e) {
    _unitsTable = { standardUnits: {}, overrides: [] };
  }
  return _unitsTable;
}

/**
 * WHY(P3362): Insights History and Apple Home need a standard unit on measure_*
 * / meter_* / target_temperature. Distance sub-caps are metres, not lux.
 * Characters stay in Latin-1 (degree is U+00B0).
 */
function standardUnitFor(cap) {
  const id = String(cap || '');
  const table = loadUnitsTable();
  for (const row of table.overrides || []) {
    const matchId = String(row.id || '');
    if (!matchId || !row.units) {continue;}
    if (row.match === 'prefix' && (id === matchId || id.startsWith(`${matchId}.`) || id.startsWith(matchId))) {
      return row.units;
    }
    if (row.match === 'exact' && id === matchId) {return row.units;}
  }
  const base = id.split('.')[0];
  const mapped = (table.standardUnits || {})[base];
  return mapped || null;
}

function hasDeclaredUnits(opts) {
  if (!opts || typeof opts !== 'object') {return false;}
  const u = opts.units;
  if (typeof u === 'string' && u.trim()) {return true;}
  if (u && typeof u === 'object') {
    for (const k of ['en', 'default', 'fr', 'nl', 'de']) {
      if (typeof u[k] === 'string' && u[k].trim()) {return true;}
    }
  }
  return false;
}


/**
 * Soft-heal: sensor measure_/meter_/alarm_* -> getable true + Insights on
 * (unless silence allowlist). Idempotent via `_homeyCapabilityUxHealed`.
 */
async function healSensorCapabilityGetable(device) {
  if (!device || device._homeyCapabilityUxHealed) {
    return { skipped: true, healed: [], silenced: [], unitsHealed: [] };
  }
  device._homeyCapabilityUxHealed = true;
  const healed = [];
  const silenced = [];

  if (typeof device.setCapabilityOptions !== 'function'
    || typeof device.getCapabilities !== 'function') {
    return { healed, silenced, unitsHealed: [], noApi: true };
  }

  const caps = device.getCapabilities() || [];
  const unitsHealed = [];
  for (const cap of caps) {
    const unit = standardUnitFor(cap);
    const isSensor = mustNeverGetableFalse(cap);
    if (!isSensor && !unit) {continue;}
    try {
      const cur = (typeof device.getCapabilityOptions === 'function'
        && device.getCapabilityOptions(cap)) || {};
      const silence = isSensor && shouldSilenceInsights(cap, caps);
      const needsUnits = !!(unit && !hasDeclaredUnits(cur));

      if (silence) {
        // WHY(P2551/P2553): still getable (UI tile) but no Insights flood/dup
        // P3362: still restore a missing unit (distance uses m, not lx).
        if (cur.preventInsights !== true || cur.getable === false || needsUnits) {
          const next = {
            ...cur,
            getable: true,
            preventInsights: true,
          };
          if (needsUnits) {next.units = unit;}
          await device.setCapabilityOptions(cap, next);
          if (cur.preventInsights !== true || cur.getable === false) {silenced.push(cap);}
          if (needsUnits) {unitsHealed.push(cap);}
        }
        continue;
      }

      if (!isSensor && needsUnits) {
        await device.setCapabilityOptions(cap, { ...cur, units: unit });
        unitsHealed.push(cap);
        continue;
      }
      if (!isSensor) {continue;}

      // WHY(P2553 / Peter #2239 + fleet): force History ON even when getable
      // already true - older tips left preventInsights stuck / unset.
      // WHY(P2522): getable already true but Insights still blocked
      // P3354: a missing flag is Homey's default (getable true, preventInsights false). The upload
      // app.json drops flags equal to the default (P3342), so only an explicit bad value is healed;
      // no fleet-wide setCapabilityOptions rewrite at start.
      const needsGetable = cur.getable === false;
      const needsInsights = cur.preventInsights === true;
      if (needsGetable || needsInsights || needsUnits) {
        const next = { ...cur };
        if (needsGetable || needsInsights) {
          next.getable = true;
          next.preventInsights = false;
          healed.push(cap);
        }
        if (needsUnits) {
          next.units = unit;
          unitsHealed.push(cap);
        }
        await device.setCapabilityOptions(cap, next);
      }
    } catch (_e) { /* soft - Athom may reject option merges */ }
  }

  if (unitsHealed.length && typeof device.log === 'function') {
    device.log(`[P3362] units restored -> ${unitsHealed.slice(0, 12).join(',')}${unitsHealed.length > 12 ? '...' : ''}`);
  }
  try {
    scheduleUnitsRecycle(device, unitsHealed);
  } catch (_eRecycle) { /* soft */ }

  if ((healed.length || silenced.length) && typeof device.log === 'function') {
    if (healed.length) {
      device.log(`[P2500/P2553] History ON -> ${healed.slice(0, 12).join(',')}${healed.length > 12 ? '...' : ''}`);
    }
    if (silenced.length) {
      device.log(`[P2553] History silence (flood/dup) -> ${silenced.join(',')}`);
    }
  }
  return { healed, silenced, unitsHealed };
}


/**
 * WHY(P3362 / P3361): setCapabilityOptions alone can leave Insights History
 * empty on already-paired devices. One-shot staggered recycle, bounded,
 * never blocks boot, never repeats after the store flag is set.
 */
function scheduleUnitsRecycle(device, caps) {
  const list = (caps || []).filter((c) => c && !shouldSilenceInsights(c, (device.getCapabilities && device.getCapabilities()) || []));
  if (!device || !list.length) {return;}
  if (typeof device.removeCapability !== 'function' || typeof device.addCapability !== 'function') {return;}
  if (typeof device.getStoreValue === 'function' && device.getStoreValue('p3362_units_insights_recycle')) {return;}
  if (typeof device.setStoreValue === 'function') {
    Promise.resolve(device.setStoreValue('p3362_units_insights_recycle', 1)).catch(() => {});
  }
  const max = Math.min(list.length, 6);
  const runOne = async (cap) => {
    const cur = (typeof device.getCapabilityOptions === 'function' && device.getCapabilityOptions(cap)) || {};
    const value = (typeof device.getCapabilityValue === 'function') ? device.getCapabilityValue(cap) : null;
    const unit = standardUnitFor(cap) || cur.units;
    await device.removeCapability(cap).catch(() => {});
    await device.addCapability(cap).catch(() => {});
    if (typeof device.setCapabilityOptions === 'function') {
      const next = { ...cur };
      if (unit) {next.units = unit;}
      await device.setCapabilityOptions(cap, next).catch(() => {});
    }
    if (value !== null && value !== undefined && typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue(cap, value).catch(() => {});
    }
  };
  const start = () => {
    let i = 0;
    const tick = () => {
      if (i >= max) {return;}
      const cap = list[i++];
      Promise.resolve(runOne(cap)).catch(() => {}).then(() => {
        if (i < max) {setTimeout(tick, 1500);}
      });
    };
    tick();
  };
  setTimeout(start, 2000);
}

/**
 * Compose helper - complementary options for one cap (no wipe).
 */
function complementaryHistoryOptions(cap, existingOpts, driverCaps) {
  const cur = existingOpts && typeof existingOpts === 'object' ? { ...existingOpts } : {};
  if (shouldSilenceInsights(cap, driverCaps)) {
    const silenced = {
      ...cur,
      getable: cur.getable === false ? true : cur.getable !== undefined ? cur.getable : true,
      preventInsights: true,
    };
    const unit = standardUnitFor(cap);
    if (unit && !hasDeclaredUnits(cur)) {silenced.units = unit;}
    return silenced;
  }
  if (!isSensorReadableCap(cap)) {
    const unitOnly = standardUnitFor(cap);
    if (unitOnly && !hasDeclaredUnits(cur)) {cur.units = unitOnly;}
    return cur;
  }
  const next = {
    ...cur,
    getable: true,
    preventInsights: false,
  };
  const unit = standardUnitFor(cap);
  if (unit && !hasDeclaredUnits(cur)) {next.units = unit;}
  return next;
}

module.exports = {
  SENSOR_PREFIXES,
  HISTORY_SILENCE_PREFIX,
  isSensorReadableCap,
  mustNeverGetableFalse,
  isButtonMaintenanceCap,
  shouldSilenceInsights,
  complementaryHistoryOptions,
  healSensorCapabilityGetable,
  standardUnitFor,
  hasDeclaredUnits,
  loadUnitsTable,
  scheduleUnitsRecycle,
};
