#!/usr/bin/env node
'use strict';

/**
 * Fingerprint Health Check - Modernized
 *
 * Consolidates functionality from:
 *   - scripts/legacy/verify_current_conflicts.js
 *   - scripts/legacy/verify_legitimate_duplicates.js
 *   - scripts/legacy/analyze_remaining_duplicates.js
 *   - scripts/legacy/check_deleted_legitimate_shares.js
 *
 * Features:
 *   - Detects real conflicts (same manufacturerName + productId in incompatible drivers)
 *   - Identifies legitimate shares (same manufacturerName, different productId)
 *   - Validates Tuya ID format patterns
 *   - Case sensitivity normalization check
 *   - --json output for CI integration
 *   - --dry-run mode
 *   - Proper error handling and logging
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Valid Tuya manufacturer ID patterns
const VALID_TUYA_PATTERNS = [
  /^_TZ[0-9]{4}_[a-z0-9]{8}$/i,
  /^_TYST11_[a-z0-9]{8}$/i,
  /^_TYZB01_[a-z0-9]{8}$/i,
  /^_TZB210_[a-z0-9]{8}$/i,
  /^_TZC[0-9]{3}_[a-z0-9]{8}$/i,
  /^_TZ1800_[a-z0-9]{8}$/i,
  /^_TZ2000_[a-z0-9]{8}$/i,
];

// Generic/non-Tuya manufacturer names that should be flagged
const GENERIC_MANUFACTURERS = [
  'GE', 'IKEA of Sweden', 'Samsung', 'Sengled', 'SmartThings',
  'LEDVANCE', 'OSRAM', 'Philips', 'SYLVANIA', 'CentraLite',
  'Iris', 'Jasco Products', 'Xiaomi', 'Aqara', 'MLI',
  'GLEDOPTO', 'innr', 'Paulmann', 'Sunricher',
];

// Compatible driver groups (drivers within same group can share manufacturerName)
const COMPATIBLE_GROUPS = {
  switches: ['switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang', 'switch_wall_5gang', 'switch_wall_6gang', 'switch_wall_7gang', 'switch_wall_8gang'],
  bulbs: ['bulb_dimmable', 'bulb_white', 'bulb_tunable_white', 'bulb_rgb', 'bulb_rgbw'],
  led: ['led_strip', 'led_strip_advanced', 'led_strip_rgbw', 'led_controller_cct', 'led_controller_dimmable', 'led_controller_rgb'],
  plugs: ['plug_smart', 'plug_energy_monitor', 'switch_plug_1', 'switch_plug_2'],
  buttons: ['button_wireless', 'button_wireless_1', 'button_wireless_2', 'button_wireless_3', 'button_wireless_4', 'button_wireless_6', 'button_wireless_8'],
  scene_switches: ['scene_switch_1', 'scene_switch_2', 'scene_switch_3', 'scene_switch_4', 'scene_switch_6'],
  thermostats: ['thermostat_tuya_dp', 'thermostat_4ch', 'radiator_valve', 'radiator_controller'],
  covers: ['curtain_motor', 'curtain_motor_tilt', 'shutter_roller_controller'],
  sensors_climate: ['climate_sensor', 'temphumidsensor', 'lcdtemphumidsensor'],
  sensors_motion: ['motion_sensor', 'motion_sensor_radar_mmwave', 'presence_sensor_radar', 'presence_sensor_ceiling'],
  sensors_safety: ['smoke_detector_advanced', 'co_sensor', 'gas_detector', 'gas_sensor'],
  air_quality: ['air_quality_co2', 'air_quality_comprehensive', 'formaldehyde_sensor'],
  dimmers: ['dimmer_wall_1gang', 'dimmer_dual_channel', 'dimmer_3gang'],
};

// Build reverse lookup for compatible groups
const driverToGroup = {};
for (const [group, drivers] of Object.entries(COMPATIBLE_GROUPS)) {
  for (const driver of drivers) {
    driverToGroup[driver] = group;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    json: args.includes('--json'),
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    fix: args.includes('--fix'),
  };
}

/**
 * Logger with optional JSON output
 */
class Logger {
  constructor(opts = {}) {
    this.json = opts.json || false;
    this.verbose = opts.verbose || false;
    this.messages = [];
  }

  info(msg) {
    if (!this.json) console.log(msg);
    this.messages.push({ level: 'info', message: msg });
  }

  warn(msg) {
    if (!this.json) console.warn(`WARNING: ${msg}`);
    this.messages.push({ level: 'warn', message: msg });
  }

  error(msg) {
    if (!this.json) console.error(`ERROR: ${msg}`);
    this.messages.push({ level: 'error', message: msg });
  }

  debug(msg) {
    if (this.verbose && !this.json) console.log(`  DEBUG: ${msg}`);
  }

  output(data) {
    if (this.json) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

/**
 * Check if two drivers are compatible (can share manufacturerName)
 */
function areDriversCompatible(driver1, driver2) {
  const group1 = driverToGroup[driver1];
  const group2 = driverToGroup[driver2];
  if (group1 && group2 && group1 === group2) return true;

  const prefix1 = driver1.split('_')[0];
  const prefix2 = driver2.split('_')[0];
  if (prefix1 === prefix2) return true;

  return false;
}

/**
 * Scan all drivers and collect fingerprint data
 */
function scanDrivers(logger) {
  const drivers = [];

  if (!fs.existsSync(DRIVERS_DIR)) {
    logger.error(`Drivers directory not found: ${DRIVERS_DIR}`);
    return drivers;
  }

  const entries = fs.readdirSync(DRIVERS_DIR);

  for (const entry of entries) {
    const driverPath = path.join(DRIVERS_DIR, entry);
    const stat = fs.statSync(driverPath);

    if (!stat.isDirectory() || entry.startsWith('.')) continue;

    const composePath = path.join(driverPath, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const content = JSON.parse(fs.readFileSync(composePath));
      const manufacturerNames = content.zigbee?.manufacturerName || [];
      const productIds = content.zigbee?.productId || [];

      drivers.push({
        driver: entry,
        manufacturerNames,
        productIds,
        composePath,
      });
    } catch (e) {
      logger.warn(`Failed to parse ${composePath}: ${e.message}`);
    }
  }

  return drivers;
}

/**
 * Detect real conflicts (same manufacturerName + productId in incompatible drivers)
 */
function detectRealConflicts(drivers, logger) {
  const pairMap = new Map(); // "mfr|productId" -> [drivers]

  for (const driver of drivers) {
    for (const mfr of driver.manufacturerNames) {
      for (const pid of driver.productIds) {
        const key = `${mfr}|${pid}`;
        if (!pairMap.has(key)) pairMap.set(key, []);
        pairMap.get(key).push(driver.driver);
      }
    }
  }

  const conflicts = [];

  for (const [key, driverList] of pairMap) {
    if (driverList.length < 2) continue;

    const uniqueDrivers = [...new Set(driverList)];
    if (uniqueDrivers.length < 2) continue;

    // Check if any pair is incompatible
    let hasIncompatible = false;
    for (let i = 0; i < uniqueDrivers.length && !hasIncompatible; i++) {
      for (let j = i + 1; j < uniqueDrivers.length; j++) {
        if (!areDriversCompatible(uniqueDrivers[i], uniqueDrivers[j])) {
          hasIncompatible = true;
          break;
        }
      }
    }

    if (hasIncompatible) {
      const [mfr, pid] = key.split('|');
      conflicts.push({
        manufacturerName: mfr,
        productId: pid,
        drivers: uniqueDrivers,
      });
    }
  }

  return conflicts;
}

/**
 * Detect legitimate shares (same manufacturerName, different productIds)
 */
function detectLegitimateShares(drivers, logger) {
  const mfrMap = new Map(); // manufacturerName -> [{driver, productIds}]

  for (const driver of drivers) {
    for (const mfr of driver.manufacturerNames) {
      if (!mfrMap.has(mfr)) mfrMap.set(mfr, []);
      mfrMap.get(mfr).push({
        driver: driver.driver,
        productIds: driver.productIds,
      });
    }
  }

  const legitimate = [];
  const problematic = [];

  for (const [mfr, entries] of mfrMap) {
    if (entries.length <= 1) continue;

    // Check if productIds overlap
    let hasOverlap = false;
    for (let i = 0; i < entries.length && !hasOverlap; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const overlap = entries[i].productIds.filter(pid => entries[j].productIds.includes(pid));
        if (overlap.length > 0) {
          hasOverlap = true;
          break;
        }
      }
    }

    if (hasOverlap) {
      problematic.push({
        manufacturerName: mfr,
        drivers: entries.map(e => e.driver),
      });
    } else {
      legitimate.push({
        manufacturerName: mfr,
        drivers: entries.map(e => ({ name: e.driver, productIds: e.productIds })),
      });
    }
  }

  return { legitimate, problematic };
}

/**
 * Validate Tuya ID format
 */
function validateTuyaIds(drivers, logger) {
  const invalid = [];
  const generic = [];
  const caseIssues = [];

  for (const driver of drivers) {
    for (const mfr of driver.manufacturerNames) {
      // Check for generic manufacturers
      if (GENERIC_MANUFACTURERS.includes(mfr)) {
        generic.push({ driver: driver.driver, manufacturerName: mfr });
        continue;
      }

      // Check for case normalization issues
      if (/^_tz[0-9a-z_]+$/i.test(mfr) && mfr !== mfr.toUpperCase()) {
        caseIssues.push({
          driver: driver.driver,
          manufacturerName: mfr,
          suggestion: mfr.toUpperCase(),
        });
      }

      // Check if it's a valid Tuya ID pattern
      const isValid = VALID_TUYA_PATTERNS.some(p => p.test(mfr));
      if (!isValid && !GENERIC_MANUFACTURERS.includes(mfr) && mfr.length > 3) {
        // Only flag non-Tuya, non-generic IDs that look like they should be Tuya
        if (/^_TZ/i.test(mfr)) {
          invalid.push({ driver: driver.driver, manufacturerName: mfr });
        }
      }
    }
  }

  return { invalid, generic, caseIssues };
}

/**
 * Main health check function
 */
function runHealthCheck(opts = {}) {
  const logger = new Logger(opts);
  const startTime = Date.now();

  logger.info('\n╔══════════════════════════════════════════════════════════════╗');
  logger.info('║  FINGERPRINT HEALTH CHECK - Modernized v2.0.0              ║');
  logger.info('╚══════════════════════════════════════════════════════════════╝\n');

  // Scan all drivers
  const drivers = scanDrivers(logger);
  logger.info(`   Drivers scanned: ${drivers.length}\n`);

  // Detect conflicts
  const conflicts = detectRealConflicts(drivers, logger);
  logger.info(`   Real conflicts: ${conflicts.length}`);

  // Detect shares
  const shares = detectLegitimateShares(drivers, logger);
  logger.info(`   Legitimate shares: ${shares.legitimate.length}`);
  logger.info(`   Problematic shares: ${shares.problematic.length}`);

  // Validate IDs
  const validation = validateTuyaIds(drivers, logger);
  logger.info(`   Invalid Tuya IDs: ${validation.invalid.length}`);
  logger.info(`   Generic manufacturers: ${validation.generic.length}`);
  logger.info(`   Case normalization issues: ${validation.caseIssues.length}`);

  // Calculate stats
  const totalPairs = drivers.reduce((sum, d) => sum + d.manufacturerNames.length * d.productIds.length, 0);
  const legitimatePairs = totalPairs - conflicts.length;
  const legitimateRate = totalPairs > 0 ? (legitimatePairs / totalPairs * 100).toFixed(1) : '100.0';

  const duration = Date.now() - startTime;
  const passed = conflicts.length === 0 && shares.problematic.length === 0;

  // Build result
  const result = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    passed,
    summary: {
      driversScanned: drivers.length,
      totalPairs,
      legitimatePairs,
      legitimateRate: `${legitimateRate}%`,
      realConflicts: conflicts.length,
      legitimateShares: shares.legitimate.length,
      problematicShares: shares.problematic.length,
      invalidTuyaIds: validation.invalid.length,
      genericManufacturers: validation.generic.length,
      caseNormalizationIssues: validation.caseIssues.length,
    },
    conflicts,
    problematicShares: shares.problematic,
    validation,
  };

  // Output
  if (opts.json) {
    logger.output(result);
  } else {
    // Print conflicts
    if (conflicts.length > 0) {
      logger.info('\n   CONFLICTS (same mfr+productId in incompatible drivers):');
      for (const conflict of conflicts.slice(0, 20)) {
        logger.info(`     ${conflict.manufacturerName} + ${conflict.productId}: ${conflict.drivers.join(', ')}`);
      }
      if (conflicts.length > 20) {
        logger.info(`     ... and ${conflicts.length - 20} more`);
      }
    }

    // Print problematic shares
    if (shares.problematic.length > 0) {
      logger.info('\n   PROBLEMATIC SHARES (overlapping productIds):');
      for (const share of shares.problematic.slice(0, 10)) {
        logger.info(`     ${share.manufacturerName}: ${share.drivers.join(', ')}`);
      }
    }

    // Print case issues
    if (validation.caseIssues.length > 0 && opts.verbose) {
      logger.info('\n   CASE NORMALIZATION ISSUES:');
      for (const issue of validation.caseIssues.slice(0, 10)) {
        logger.info(`     ${issue.driver}: ${issue.manufacturerName} -> ${issue.suggestion}`);
      }
    }

    // Summary
    logger.info('\n╔══════════════════════════════════════════════════════════════╗');
    logger.info(`║  RESULT: ${passed ? 'PASSED' : 'FAILED'}                                            ║`);
    logger.info(`║  Legitimate rate: ${legitimateRate}%                                    ║`);
    logger.info(`║  Duration: ${duration}ms                                           ║`);
    logger.info('╚══════════════════════════════════════════════════════════════╝\n');
  }

  return result;
}

// Run if called directly
if (require.main === module) {
  const opts = parseArgs();
  const result = runHealthCheck(opts);
  process.exit(result.passed ? 0 : 1);
}

module.exports = { runHealthCheck, scanDrivers, detectRealConflicts, detectLegitimateShares };
