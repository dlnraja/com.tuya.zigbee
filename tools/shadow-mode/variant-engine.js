/**
 * variant-engine.js
 *
 * Resolves the (1 manufacturerName × N devices × M implementations) matrix
 * per AI_CONTEXT_MANDATE.md:
 *   - one_mfr_many_ids: A single manufacturerName can map to 50+ devices
 *   - one_id_many_mfrs: A single productId can be 2000+ different devices
 *   - power_varies: Same mfr can have battery AND mains AND kinetic variants
 *
 * Loads fingerprints from:
 *   - master/data/fingerprints.json (canonical)
 *   - master/lib/tuya/fingerprints.json (sync with herdsman cache)
 *   - master/driver-mapping-database.json (canonical mfr→driver)
 *
 * App cible: BOTH master + stable.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const CANONICAL_FPS = path.resolve(__dirname, '..', '..', 'data', 'fingerprints.json');
const LIB_FPS = path.resolve(__dirname, '..', '..', 'lib', 'tuya', 'fingerprints.json');
const MFR_DRIVER_MAP = path.resolve(__dirname, '..', '..', 'driver-mapping-database.json');

let _cache = null;

/**
 * Load all fingerprint DBs (lazy + cached).
 */
function loadFpDbs() {
  if (_cache) return _cache;
  const cache = {
    canonical: null,
    lib: null,
    mfrMap: null,
  };
  try { cache.canonical = JSON.parse(fs.readFileSync(CANONICAL_FPS, 'utf8')); } catch (e) { /* ignore */ }
  try { cache.lib = JSON.parse(fs.readFileSync(LIB_FPS, 'utf8')); } catch (e) { /* ignore */ }
  try { cache.mfrMap = JSON.parse(fs.readFileSync(MFR_DRIVER_MAP, 'utf8')); } catch (e) { /* ignore */ }
  _cache = cache;
  return cache;
}

/**
 * Resolve all variants for a given manufacturerName.
 * Returns:
 *   {
 *     manufacturer: '_TZ3000_xxx',
 *     productIds: ['TS0601', 'TS0201'],
 *     drivers: ['climate_sensor', 'thermostat_tuya_dp'],
 *     powerSources: ['battery', 'mains'],
 *     protocols: ['ZCL', 'TuyaDP'],
 *     dpVariants: { 3: [...], 6: [...], ... },
 *     implementations: [{ driver, pid, power, protocol, dp?, fix }, ...],
 *   }
 */
function resolveVariants(manufacturerName) {
  const dbs = loadFpDbs();
  const result = {
    manufacturer: manufacturerName,
    productIds: new Set(),
    drivers: new Set(),
    powerSources: new Set(),
    protocols: new Set(),
    clusters: new Set(),
    dps: new Set(),
    dpVariants: {},
    implementations: [],
  };

  // Search canonical
  if (dbs.canonical && typeof dbs.canonical === 'object') {
    for (const [fp, info] of Object.entries(dbs.canonical)) {
      if (fp === manufacturerName || (info.manufacturerName && info.manufacturerName.includes(manufacturerName))) {
        if (info.productIds) info.productIds.forEach((p) => result.productIds.add(p));
        if (info.driverId) result.drivers.add(info.driverId);
        if (info.powerSource) result.powerSources.add(info.powerSource);
        if (info.protocol) result.protocols.add(info.protocol);
        if (info.clusters) info.clusters.forEach((c) => result.clusters.add(c));
        if (info.dps) info.dps.forEach((d) => result.dps.add(d));
      }
    }
  }

  // Search lib/ (Z2M-sync)
  if (dbs.lib && typeof dbs.lib === 'object') {
    for (const [fp, info] of Object.entries(dbs.lib)) {
      if (fp === manufacturerName || (info.manufacturerName && info.manufacturerName.includes(manufacturerName))) {
        if (info.productIds) info.productIds.forEach((p) => result.productIds.add(p));
        if (info.driverId) result.drivers.add(info.driverId);
        if (info.powerSource) result.powerSources.add(info.powerSource);
        if (info.protocol) result.protocols.add(info.protocol);
      }
    }
  }

  // Search mfr→driver map
  if (dbs.mfrMap && typeof dbs.mfrMap === 'object') {
    for (const [mfr, driver] of Object.entries(dbs.mfrMap)) {
      if (mfr === manufacturerName) {
        if (typeof driver === 'string') {
          result.drivers.add(driver);
        } else if (driver && driver.id) {
          result.drivers.add(driver.id);
        }
      }
    }
  }

  // Add canonical power sources/protocols even if FP DB didn't specify
  if (result.powerSources.size === 0) {
    result.powerSources.add('unknown');
  }
  if (result.protocols.size === 0) {
    if (manufacturerName.startsWith('_TZE')) result.protocols.add('TuyaDP');
    else result.protocols.add('ZCL');
  }

  // DP variant intelligence (per INTELLIGENT_AUTOMATION.md)
  result.dpVariants = {
    3: ['min_brightness', 'measure_temperature', 'battery_low', 'consumption'],
    6: ['scene_data', 'battery_voltage', 'border', 'countdown', 'test'],
    9: ['power_on_state', 'countdown', 'eco_temp', 'temperature_unit', 'flow_rate'],
    19: ['local_temperature_calibration'],
    27: ['local_temperature_calibration'],
    47: ['local_temperature_calibration', 'open_window_off_time'],
    101: ['humidity', 'illuminance', 'humidity_calibration', 'running_state', 'local_temperature_calibration'],
    102: ['eco_temperature', 'illuminance_average', 'illuminance_maximum', 'illuminance', 'soil_calibration', 'position'],
    103: ['humidity_calibration', 'local_temperature_calibration'],
    104: ['local_temperature_calibration', 'temperature_calibration', 'humidity_calibration', 'soil_calibration', 'cleaning_reminder'],
    105: ['auto_setpoint_override', 'humidity_calibration', 'scale_protection', 'auto_temperature', 'temperature_calibration'],
    109: ['local_temperature_calibration'],
  };

  // Build implementations matrix (N drivers × M productIds × power × protocol)
  const drivers = [...result.drivers];
  const pids = [...result.productIds];
  for (const driver of drivers) {
    for (const pid of pids) {
      for (const power of result.powerSources) {
        for (const protocol of result.protocols) {
          result.implementations.push({
            driver,
            pid,
            power,
            protocol,
            fix: inferFixForImpl(driver, pid, power, protocol),
          });
        }
      }
    }
  }

  // Convert Sets to Arrays for serialization
  return {
    manufacturer: result.manufacturer,
    productIds: [...result.productIds],
    drivers: [...result.drivers],
    powerSources: [...result.powerSources],
    protocols: [...result.protocols],
    clusters: [...result.clusters],
    dps: [...result.dps],
    dpVariants: result.dpVariants,
    implementations: result.implementations,
  };
}

/**
 * Infer a likely fix for a (driver, pid, power, protocol) combination.
 * Heuristic-based, not ML. Returns null if no known fix.
 */
function inferFixForImpl(driver, pid, power, protocol) {
  // Climate/thermostat with temperature_calibration → use divideBy10
  if (/thermostat|radiator|climate|temp/i.test(driver)) {
    return 'verify local_temperature_calibration uses divideBy10 (per PR #508)';
  }
  // Soil sensor → humidity raw, temp divideBy10
  if (/soil/i.test(driver)) {
    return 'verify soil_calibration + humidity raw, temp divideBy10 (per PR #508, #510)';
  }
  // Plug/energy → check metering cluster + customClusterEwelink
  if (/plug|energy|sonoff|s60|s40|outlet/i.test(driver)) {
    return 'verify currentSummDelivered reporting + customClusterEwelink for SONOFF (per PR #508)';
  }
  // Button → verify E000 + scene mode
  if (/button|scene_switch|handheld|wall_remote/i.test(driver)) {
    return 'verify E000 BoundCluster + 0x8004 scene mode attribute (per v9.0.x)';
  }
  // Presence/radar → verify stuck pattern detection + illuminance
  if (/presence|radar|mmwave/i.test(driver)) {
    return 'verify stuck pattern detection (DP106 lux dedup, v5.11.13 fix)';
  }
  return null;
}

/**
 * Generate a fix proposal for a ticket.
 * Returns: { strategy, files, confidence }
 */
function generateFixProposal(ticket, variants) {
  if (!variants) return null;

  // Heuristic strategy selection
  let strategy = 'unknown';
  let confidence = 0;
  const files = [];

  // If ticket mentions a specific mfr
  if (ticket.mfr) {
    // If the mfr is in our canonical DB and routes to a specific driver
    if (variants.drivers.length === 1) {
      strategy = `add FP to ${variants.drivers[0]} + verify DP mappings against Z2M source`;
      confidence = 80;
      files.push({
        path: `drivers/${variants.drivers[0]}/driver.compose.json`,
        change: `add manufacturerName: ["${ticket.mfr}"] if not already present`,
      });
    } else if (variants.drivers.length > 1) {
      strategy = `mfr is ambiguous (${variants.drivers.length} drivers). Pick highest-priority driver + cross-ref with driver-mapping-database.json`;
      confidence = 60;
      files.push({
        path: `master/.diag/johan-shadow-comments-audit.json`,
        change: `flag this mfr for human review (Johan attribution audit)`,
      });
    } else {
      strategy = 'mfr not in canonical DB. Search Z2M and add to correct driver';
      confidence = 40;
      files.push({
        path: 'master/.github/cache/z2m/',
        change: 'pull latest Z2M and re-run weekly-fingerprint-sync.yml',
      });
    }
  }

  // If ticket mentions specific DPs (e.g. calibration issue)
  if (ticket.body && /(calibration|calibr)/i.test(ticket.body)) {
    strategy = 'local_temperature_calibration fix (Volta bugs V1-V5, PR #508)';
    confidence = 90;
    files.push({
      path: 'master/.github/cache/herdsman/tuya-lib.ts',
      change: 'replace localTempCalibration1-5 with divideBy10/raw (per PR #508)',
    });
  }

  // If ticket mentions a specific power source issue
  if (ticket.body && /(battery|mains|crash|0%)/i.test(ticket.body)) {
    strategy = 'battery handler fix (per BATTERY_ANALYSIS.md, PR #501)';
    confidence = 75;
    files.push({
      path: 'master/lib/battery/UnifiedBatteryHandler.js',
      change: 'use _findEndpointByCluster helper for multi-endpoint + add exception list for kinetic',
    });
  }

  // If ticket mentions configureReporting / reporting failure
  if (ticket.body && /(report|sleepy|wake)/i.test(ticket.body)) {
    strategy = 'configureReportingWithRetry migration (per APPLY_ZIGBEE_RETRY_FIX.md)';
    confidence = 70;
    files.push({
      path: 'master/lib/devices/BaseUnifiedDevice.js',
      change: 'replace 12 cluster.configureReporting with configureReportingWithRetry',
    });
  }

  // If ticket mentions UTF-8 / mojibake / emoji
  if (ticket.body && /(emoji|mojibake|utf|corrupt|💧|\?\?)/u.test(ticket.body)) {
    strategy = 'UTF-8 mojibake fix + prevention script (per PR_DRAFT_HEGEL_FIXES.md)';
    confidence = 95;
    files.push({
      path: 'master/drivers/valve_irrigation/device.js',
      change: 'restore 💧 (was `??`) on line 173',
    });
    files.push({
      path: 'master/tools/ci/prevent-apply-patch-corruption.js',
      change: 'NEW: pre-commit hook for 11 mojibake patterns',
    });
  }

  return {
    strategy,
    files,
    confidence,
    estimated_effort: confidence > 80 ? '5-15 min' : confidence > 60 ? '30-60 min' : '1-2 hours (needs human review)',
  };
}

module.exports = { resolveVariants, generateFixProposal, loadFpDbs };
