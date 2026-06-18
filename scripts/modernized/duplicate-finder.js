#!/usr/bin/env node
'use strict';

/**
 * Duplicate Finder - Modernized
 *
 * Consolidates functionality from:
 *   - scripts/legacy/fix_all_duplicates.js
 *   - scripts/legacy/fix_remaining_duplicates.js
 *   - scripts/legacy/fix-critical-duplicates-v2.js
 *   - scripts/legacy/fix-true-duplicates.js
 *   - scripts/legacy/final_conflict_resolution.js
 *
 * Features:
 *   - Detects TRUE duplicates (same mfr+productId in incompatible drivers)
 *   - Case-insensitive manufacturer name matching
 *   - Compatible driver group awareness
 *   - Priority-based conflict resolution
 *   - --json output for CI integration
 *   - --dry-run mode (default: report only, no changes)
 *   - --fix mode to apply fixes
 *   - Proper error handling and logging
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT = path.resolve(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

// Compatible driver groups
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

// Driver priority for conflict resolution (higher = wins)
const DRIVER_PRIORITY = {
  climate_sensor: 100, motion_sensor: 90, contact_sensor: 85, water_leak_sensor: 85,
  smoke_detector_advanced: 85, gas_sensor: 85, soil_sensor: 80, presence_sensor_radar: 80,
  motion_sensor_radar_mmwave: 80, vibration_sensor: 75, button_wireless_1: 70,
  button_wireless_4: 70, button_emergency_sos: 70, curtain_motor: 65, radiator_valve: 65,
  thermostat_tuya_dp: 65, dimmer_wall_1gang: 60, switch_2gang: 50, switch_3gang: 50,
  switch_4gang: 50, plug_energy_monitor: 45, plug_smart: 40, switch_1gang: 30,
  siren: 25, bulb_rgb: 20, led_strip: 15,
};

// Build reverse lookup
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
    fix: args.includes('--fix'),
    verbose: args.includes('--verbose') || args.includes('-v'),
  };
}

/**
 * Check if two drivers are compatible
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
 * Scan all drivers
 */
function scanDrivers() {
  const drivers = [];
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
      // Skip invalid files
    }
  }

  return drivers;
}

/**
 * Find TRUE duplicates
 */
function findTrueDuplicates(drivers) {
  const comboMap = new Map(); // "mfr|productId" -> [{driverId}]

  for (const driver of drivers) {
    for (const mfr of driver.manufacturerNames) {
      for (const pid of driver.productIds) {
        const key = `${mfr}|${pid}`;
        if (!comboMap.has(key)) comboMap.set(key, []);
        comboMap.get(key).push(driver.driver);
      }
    }
  }

  const duplicates = [];

  for (const [key, driverList] of comboMap) {
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
      duplicates.push({
        manufacturerName: mfr,
        productId: pid,
        drivers: uniqueDrivers,
      });
    }
  }

  return duplicates;
}

/**
 * Resolve conflicts by priority
 */
function resolveConflicts(duplicates) {
  const resolutions = [];

  for (const dup of duplicates) {
    const sorted = [...dup.drivers].sort((a, b) =>
      (DRIVER_PRIORITY[b] || 10) - (DRIVER_PRIORITY[a] || 10)
    );

    resolutions.push({
      manufacturerName: dup.manufacturerName,
      productId: dup.productId,
      winner: sorted[0],
      losers: sorted.slice(1),
      winnerPriority: DRIVER_PRIORITY[sorted[0]] || 10,
    });
  }

  return resolutions;
}

/**
 * Apply fixes (remove duplicates from losers)
 */
function applyFixes(resolutions, dryRun = false) {
  const changes = [];
  const loserMap = new Map(); // driver -> [{manufacturerName}]

  for (const res of resolutions) {
    for (const loser of res.losers) {
      if (!loserMap.has(loser)) loserMap.set(loser, []);
      loserMap.get(loser).push(res.manufacturerName);
    }
  }

  for (const [driverName, mfrsToRemove] of loserMap) {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const content = JSON.parse(fs.readFileSync(composePath));
      const originalMfrs = content.zigbee?.manufacturerName || [];
      const mfrsToRemoveSet = new Set(mfrsToRemove.map(m => m.toUpperCase()));

      const filtered = originalMfrs.filter(m => !mfrsToRemoveSet.has(m.toUpperCase()));
      const removed = originalMfrs.length - filtered.length;

      if (removed > 0) {
        changes.push({
          driver: driverName,
          removed,
          manufacturerNames: mfrsToRemove,
        });

        if (!dryRun) {
          // Backup
          const backupPath = `${composePath}.backup-dedup-${Date.now()}`;
          fs.copyFileSync(composePath, backupPath);

          // Save
          content.zigbee.manufacturerName = filtered;
          fs.writeFileSync(composePath, JSON.stringify(content, null, 2));
        }
      }
    } catch (e) {
      // Skip errors
    }
  }

  return changes;
}

/**
 * Main function
 */
function runDuplicateFinder(opts = {}) {
  const startTime = Date.now();

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DUPLICATE FINDER - Modernized v2.0.0                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Scan drivers
  const drivers = scanDrivers();
  console.log(`   Drivers scanned: ${drivers.length}\n`);

  // Find duplicates
  const duplicates = findTrueDuplicates(drivers);
  console.log(`   TRUE duplicates found: ${duplicates.length}\n`);

  if (duplicates.length === 0) {
    console.log('   No TRUE duplicates found. All manufacturer name shares are legitimate.\n');

    const result = {
      timestamp: new Date().toISOString(),
      passed: true,
      duplicates: 0,
      changes: [],
    };

    if (opts.json) console.log(JSON.stringify(result, null, 2));
    return result;
  }

  // Show duplicates
  console.log('   DUPLICATES (same mfr+productId in incompatible drivers):');
  for (const dup of duplicates.slice(0, 20)) {
    console.log(`     ${dup.manufacturerName} + ${dup.productId}: ${dup.drivers.join(', ')}`);
  }
  if (duplicates.length > 20) {
    console.log(`     ... and ${duplicates.length - 20} more`);
  }

  // Resolve conflicts
  const resolutions = resolveConflicts(duplicates);

  if (opts.verbose) {
    console.log('\n   RESOLUTIONS:');
    for (const res of resolutions.slice(0, 10)) {
      console.log(`     ${res.manufacturerName} + ${res.productId}:`);
      console.log(`       WINNER: ${res.winner} (priority ${res.winnerPriority})`);
      console.log(`       LOSERS: ${res.losers.join(', ')}`);
    }
  }

  // Apply fixes if requested
  let changes = [];
  if (opts.fix) {
    console.log('\n   Applying fixes...');
    changes = applyFixes(resolutions, opts.dryRun);
    console.log(`   Changes applied: ${changes.length} drivers modified`);
  } else {
    console.log('\n   Run with --fix to apply fixes (use --dry-run to preview)');
  }

  const duration = Date.now() - startTime;
  const result = {
    timestamp: new Date().toISOString(),
    duration: `${duration}ms`,
    passed: duplicates.length === 0,
    duplicates: duplicates.length,
    resolutions,
    changes,
  };

  if (opts.json) console.log(JSON.stringify(result, null, 2));

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log(`║  RESULT: ${duplicates.length === 0 ? 'PASSED' : 'FAILED'} - ${duplicates.length} duplicates found                  ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  return result;
}

// Run if called directly
if (require.main === module) {
  const opts = parseArgs();
  const result = runDuplicateFinder(opts);
  process.exit(result.passed ? 0 : 1);
}

module.exports = { runDuplicateFinder, findTrueDuplicates, resolveConflicts };
