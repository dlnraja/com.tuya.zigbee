#!/usr/bin/env node
/**
 * fingerprint-health-check.js - Fingerprint Database Health Verification
 * ======================================================================
 * Checks all fingerprints for:
 *   1. Collisions (same manufacturerName + productId in different drivers)
 *   2. Empty manufacturerName arrays
 *   3. Missing manufacturerName entries
 *   4. Duplicate fingerprints across drivers
 *   5. Wildcard violations (_TZE200_* patterns)
 *   6. Empty productId arrays
 *   7. Case-insensitive duplicates (same name, different case)
 *   8. Orphaned fingerprints (in data/fingerprints.json but no matching driver)
 *   9. Manufacturer conflict report (same mfr, different productIds across different-type drivers)
 *  10. Fingerprint database integrity (data/fingerprints.json)
 *
 * Usage: node scripts/automation/fingerprint-health-check.js
 * Exit code: 0 = healthy, 1 = errors found, 2 = warnings only
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const DATA_DIR = path.join(ROOT, 'data');

// ── ANSI colors ──────────────────────────────────────────────────
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ── Report ───────────────────────────────────────────────────────
const report = {
  errors: [],
  warnings: [],
  info: [],
  stats: {
    totalDrivers: 0,
    zigbeeDrivers: 0,
    wifiDrivers: 0,
    totalManufacturerNames: 0,
    totalProductIds: 0,
    uniqueManufacturerNames: new Set(),
    uniqueProductIds: new Set(),
    collisions: 0,
    emptyMfrArrays: 0,
    missingMfrEntries: 0,
    emptyPidArrays: 0,
    wildcardViolations: 0,
    caseInsensitiveDuplicates: 0,
    driverlessFingerprints: 0,
  },
};

function log(msg) { console.log(`${CYAN}[FINGERPRINT]${RESET} ${msg}`); }
function err(msg) { report.errors.push(msg); console.error(`${RED}[ERROR]${RESET} ${msg}`); }
function warn(msg) { report.warnings.push(msg); console.warn(`${YELLOW}[WARN]${RESET} ${msg}`); }

// ── Fallback drivers allowed to have collisions ──────────────────
const FALLBACK_DRIVERS = ['universal_fallback', 'generic_tuya'];

// ── Wildcard patterns forbidden in manufacturerName ──────────────
const WILDCARD_PATTERNS = [
  '_TZE200_', '_TZE204_', '_TZE284_',
  '_TZ3000_', '_TZ3210_', '_TZ3400_',
  'Tuya', 'MOES', 'TUYA', 'tuya', 'moes',
];

// ── Driver category classification ───────────────────────────────
const SENSOR_PATTERNS = /sensor|detector|monitor|thermo|humid|temp|motion|door|window|leak|smoke|air|quality|rain|soil|radar|presence|illuminance|pressure|vibration|gas|water_level/;
const SWITCH_PATTERNS = /switch|plug|socket|breaker|relay|curtain|cover|garage|light|bulb|led|lamp|fan|dimmer|strip|rgb|ir_remote|siren|lock|valve|heater|radiator|thermostat|dehumidifier|humidifier|air_purifier|pet_feeder|ir_blaster|speaker|camera|vacuum/;

function classifyDriver(driverName) {
  if (SENSOR_PATTERNS.test(driverName)) return 'sensor';
  if (SWITCH_PATTERNS.test(driverName)) return 'switch';
  return 'other';
}

// ── Load all driver compose configs ──────────────────────────────
function loadAllDrivers() {
  const drivers = new Map();
  try {
    const dirs = fs.readdirSync(DRIVERS_DIR);
    for (const name of dirs) {
      const dirPath = path.join(DRIVERS_DIR, name);
      try {
        const stat = fs.statSync(dirPath);
        if (!stat.isDirectory()) continue;
      } catch (e) { continue; }

      const composePath = path.join(dirPath, 'driver.compose.json');
      if (!fs.existsSync(composePath)) continue;

      try {
        const raw = fs.readFileSync(composePath);
        const config = JSON.parse(raw);

        const isZigbee = !!(config.zigbee);
        const isWifi = !!(config.wifi || name.startsWith('wifi_'));

        drivers.set(name, {
          name,
          path: composePath,
          config,
          isZigbee,
          isWifi,
          class: config.class || 'unknown',
          mfrs: config.zigbee ? (config.zigbee.manufacturerName || []) : [],
          pids: config.zigbee ? (config.zigbee.productId || []) : [],
          capabilities: config.capabilities || [],
        });
      } catch (e) {
        warn(`Failed to parse ${composePath}: ${e.message}`);
      }
    }
  } catch (e) {
    err(`Cannot read drivers directory: ${e.message}`);
  }
  return drivers;
}

// ── 1. Collision Detection ───────────────────────────────────────
function checkCollisions(drivers) {
  log('Phase 1: Checking for manufacturerName + productId collisions...');

  const combos = new Map(); // key: mfr|pid -> [driverNames]

  for (const [name, driver] of drivers) {
    if (!driver.isZigbee) continue;

    for (const mfr of driver.mfrs) {
      for (const pid of driver.pids) {
        const key = `${mfr}|${pid}`;
        if (!combos.has(key)) combos.set(key, []);
        combos.get(key).push(name);
      }
    }
  }

  for (const [key, driverNames] of combos) {
    const unique = [...new Set(driverNames)];
    if (unique.length <= 1) continue;

    // Filter out fallback drivers
    const realDrivers = unique.filter(d => !FALLBACK_DRIVERS.includes(d));
    if (realDrivers.length <= 1) continue;

    const [mfr, pid] = key.split('|');
    const types = realDrivers.map(d => classifyDriver(d));
    const uniqueTypes = [...new Set(types)];

    // Same type collisions are less severe (e.g., two switch drivers)
    const isCrossType = uniqueTypes.length > 1;

    if (isCrossType) {
      err(`CRITICAL COLLISION [${mfr} + ${pid}]: ${realDrivers.join(', ')} (${uniqueTypes.join('/')})`);
    } else {
      warn(`Collision [${mfr} + ${pid}]: ${realDrivers.join(', ')}`);
    }
    report.stats.collisions++;
  }
}

// ── 2. Empty manufacturerName Arrays ─────────────────────────────
function checkEmptyMfrArrays(drivers) {
  log('Phase 2: Checking for empty manufacturerName arrays...');

  for (const [name, driver] of drivers) {
    if (!driver.isZigbee) continue;

    if (driver.mfrs.length === 0) {
      warn(`Empty manufacturerName[] in ${name} - causes AggregateError at runtime`);
      report.stats.emptyMfrArrays++;
    }

    // Check for empty strings within the array
    const emptyEntries = driver.mfrs.filter(m => !m || m.trim() === '');
    if (emptyEntries.length > 0) {
      warn(`Empty string entries in manufacturerName[] of ${name} (${emptyEntries.length} empty)`);
      report.stats.missingMfrEntries++;
    }
  }
}

// ── 3. Missing manufacturerName ──────────────────────────────────
function checkMissingMfr(drivers) {
  log('Phase 3: Checking for missing manufacturerName in zigbee drivers...');

  for (const [name, driver] of drivers) {
    if (!driver.isZigbee) continue;

    if (!driver.config.zigbee.manufacturerName) {
      warn(`No manufacturerName field in zigbee config of ${name}`);
      report.stats.missingMfrEntries++;
    }
  }
}

// ── 4. Empty productId Arrays ────────────────────────────────────
function checkEmptyPidArrays(drivers) {
  log('Phase 4: Checking for empty productId arrays...');

  for (const [name, driver] of drivers) {
    if (!driver.isZigbee) continue;

    if (driver.pids.length === 0) {
      warn(`Empty productId[] in ${name}`);
      report.stats.emptyPidArrays++;
    }
  }
}

// ── 5. Wildcard Violations ───────────────────────────────────────
function checkWildcardViolations(drivers) {
  log('Phase 5: Checking for wildcard manufacturerName violations...');

  for (const [name, driver] of drivers) {
    if (!driver.isZigbee) continue;

    for (const mfr of driver.mfrs) {
      // Check if it's a prefix-only entry (no unique suffix)
      if (WILDCARD_PATTERNS.includes(mfr)) {
        err(`FORBIDDEN wildcard "${mfr}" in ${name} - must use full manufacturer ID`);
        report.stats.wildcardViolations++;
      }
    }
  }
}

// ── 6. Case-Insensitive Duplicates ───────────────────────────────
function checkCaseInsensitiveDuplicates(drivers) {
  log('Phase 6: Checking for case-insensitive manufacturer duplicates...');

  // Build a map of lowercase mfr -> [{original, driver}]
  const mfrMap = new Map();

  for (const [name, driver] of drivers) {
    if (!driver.isZigbee) continue;

    for (const mfr of driver.mfrs) {
      const lower = mfr.toLowerCase().trim();
      if (!mfrMap.has(lower)) mfrMap.set(lower, []);
      mfrMap.get(lower).push({ original: mfr, driver: name });
    }
  }

  // Find entries where the same lowercase name has different casings
  for (const [lower, entries] of mfrMap) {
    const originals = [...new Set(entries.map(e => e.original))];
    if (originals.length > 1) {
      const driverNames = [...new Set(entries.map(e => e.driver))];
      if (driverNames.length > 1) {
        // Cross-driver case variants
        warn(`Case-insensitive duplicate across drivers: ${originals.join(' vs ')} in [${driverNames.join(', ')}]`);
        report.stats.caseInsensitiveDuplicates++;
      }
    }
  }
}

// ── 7. data/fingerprints.json Integrity ──────────────────────────
function checkFingerprintDB() {
  log('Phase 7: Checking data/fingerprints.json integrity...');

  const fpPath = path.join(DATA_DIR, 'fingerprints.json');
  if (!fs.existsSync(fpPath)) {
    warn('data/fingerprints.json not found - fingerprint DB not present');
    return;
  }

  try {
    const raw = fs.readFileSync(fpPath);
    const fps = JSON.parse(raw);

    if (!Array.isArray(fps)) {
      err('data/fingerprints.json root is not an array');
      return;
    }

    log(`  Fingerprint DB contains ${fps.length} entries`);

    // Check for entries without required fields
    let missingMfr = 0;
    let missingPid = 0;
    let missingDriver = 0;

    for (const fp of fps) {
      if (!fp.manufacturerName && !fp.mfr) missingMfr++;
      if (!fp.productId && !fp.pid) missingPid++;
      if (!fp.driver && !fp.driverId) missingDriver++;
    }

    if (missingMfr > 0) {
      warn(`${missingMfr} fingerprint entries missing manufacturerName`);
    }
    if (missingPid > 0) {
      warn(`${missingPid} fingerprint entries missing productId`);
    }
    if (missingDriver > 0) {
      warn(`${missingDriver} fingerprint entries missing driver reference`);
    }
  } catch (e) {
    err(`Failed to parse data/fingerprints.json: ${e.message}`);
  }
}

// ── 8. Orphaned Fingerprint Detection ────────────────────────────
function checkOrphanedFingerprints(drivers) {
  log('Phase 8: Checking for orphaned fingerprints...');

  const fpPath = path.join(DATA_DIR, 'fingerprints.json');
  if (!fs.existsSync(fpPath)) return;

  try {
    const raw = fs.readFileSync(fpPath);
    const fps = JSON.parse(raw);

    if (!Array.isArray(fps)) return;

    const existingDrivers = new Set(drivers.keys());

    for (const fp of fps) {
      const driverId = fp.driver || fp.driverId;
      if (driverId && !existingDrivers.has(driverId)) {
        warn(`Orphaned fingerprint: driver "${driverId}" no longer exists`);
        report.stats.driverlessFingerprints++;
      }
    }
  } catch (e) { /* skip */ }
}

// ── 9. Manufacturer Conflict Report ──────────────────────────────
function checkManufacturerConflicts(drivers) {
  log('Phase 9: Cross-type manufacturer conflict analysis...');

  // Group manufacturers by their driver types
  const mfrTypes = new Map(); // mfr -> Set<class>

  for (const [name, driver] of drivers) {
    if (!driver.isZigbee) continue;

    const type = classifyDriver(name);
    for (const mfr of driver.mfrs) {
      const lower = mfr.toLowerCase();
      if (!mfrTypes.has(lower)) mfrTypes.set(lower, new Map());
      const typeMap = mfrTypes.get(lower);
      if (!typeMap.has(type)) typeMap.set(type, []);
      typeMap.get(type).push(name);
    }
  }

  let conflicts = 0;
  for (const [mfr, typeMap] of mfrTypes) {
    if (typeMap.size > 1) {
      // Same manufacturer used in both sensor and switch drivers
      const types = [...typeMap.keys()];
      if (types.includes('sensor') && types.includes('switch')) {
        const sensorDrivers = typeMap.get('sensor');
        const switchDrivers = typeMap.get('switch');
        warn(`Cross-type conflict: "${mfr}" in both sensor [${sensorDrivers.slice(0, 3).join(', ')}${sensorDrivers.length > 3 ? '...' : ''}] and switch [${switchDrivers.slice(0, 3).join(', ')}${switchDrivers.length > 3 ? '...' : ''}]`);
        conflicts++;
      }
    }
  }

  if (conflicts === 0) {
    log('  No cross-type manufacturer conflicts found.');
  }
}

// ── 10. Summary Statistics ────────────────────────────────────────
function computeStats(drivers) {
  log('Phase 10: Computing statistics...');

  report.stats.totalDrivers = drivers.size;

  for (const [name, driver] of drivers) {
    if (driver.isZigbee) report.stats.zigbeeDrivers++;
    if (driver.isWifi) report.stats.wifiDrivers++;

    for (const mfr of driver.mfrs) {
      report.stats.uniqueManufacturerNames.add(mfr);
      report.stats.totalManufacturerNames++;
    }
    for (const pid of driver.pids) {
      report.stats.uniqueProductIds.add(pid);
      report.stats.totalProductIds++;
    }
  }
}

// ── Main ─────────────────────────────────────────────────────────
function main() {
  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  Fingerprint Health Check${RESET}`);
  console.log(`${BOLD}============================================${RESET}\n`);

  const startTime = Date.now();

  const drivers = loadAllDrivers();
  if (drivers.size === 0) {
    err('No drivers found!');
    process.exit(1);
  }

  log(`Loaded ${drivers.size} driver configs\n`);

  // Run all checks
  checkCollisions(drivers);
  checkEmptyMfrArrays(drivers);
  checkMissingMfr(drivers);
  checkEmptyPidArrays(drivers);
  checkWildcardViolations(drivers);
  checkCaseInsensitiveDuplicates(drivers);
  checkFingerprintDB();
  checkOrphanedFingerprints(drivers);
  checkManufacturerConflicts(drivers);
  computeStats(drivers);

  // ── Summary ──────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n${BOLD}============================================${RESET}`);
  console.log(`${BOLD}  FINGERPRINT HEALTH REPORT${RESET}`);
  console.log(`${BOLD}============================================${RESET}`);
  console.log(`  Total drivers:            ${report.stats.totalDrivers}`);
  console.log(`  Zigbee drivers:           ${report.stats.zigbeeDrivers}`);
  console.log(`  WiFi drivers:             ${report.stats.wifiDrivers}`);
  console.log(`  Total mfr entries:        ${report.stats.totalManufacturerNames}`);
  console.log(`  Unique mfr names:         ${report.stats.uniqueManufacturerNames.size}`);
  console.log(`  Total PID entries:        ${report.stats.totalProductIds}`);
  console.log(`  Unique PIDs:              ${report.stats.uniqueProductIds.size}`);
  console.log(`  -----------------------------------------`);
  console.log(`  Collisions:               ${RED}${report.stats.collisions}${RESET}`);
  console.log(`  Empty mfr arrays:         ${YELLOW}${report.stats.emptyMfrArrays}${RESET}`);
  console.log(`  Missing mfr entries:      ${YELLOW}${report.stats.missingMfrEntries}${RESET}`);
  console.log(`  Empty PID arrays:         ${YELLOW}${report.stats.emptyPidArrays}${RESET}`);
  console.log(`  Wildcard violations:      ${RED}${report.stats.wildcardViolations}${RESET}`);
  console.log(`  Case-insensitive dupes:   ${YELLOW}${report.stats.caseInsensitiveDuplicates}${RESET}`);
  console.log(`  Orphaned fingerprints:    ${YELLOW}${report.stats.driverlessFingerprints}${RESET}`);
  console.log(`  -----------------------------------------`);
  console.log(`  ${RED}Errors:   ${report.errors.length}${RESET}`);
  console.log(`  ${YELLOW}Warnings: ${report.warnings.length}${RESET}`);
  console.log(`  Completed in ${elapsed}s\n`);

  if (report.errors.length > 0) {
    console.log(`${RED}${BOLD}RESULT: FAIL - ${report.errors.length} error(s) found${RESET}`);
    process.exit(1);
  } else if (report.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}RESULT: WARN - ${report.warnings.length} warning(s) found${RESET}`);
    process.exit(2);
  } else {
    console.log(`${GREEN}${BOLD}RESULT: PASS - All fingerprint checks passed${RESET}`);
    process.exit(0);
  }
}

main();
