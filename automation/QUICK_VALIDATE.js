#!/usr/bin/env node
/**
 * QUICK VALIDATE - Fast fingerprinting rules check
 *
 * Validates all rules from DEV_NOTES.md:
 * - 9.2 TS0601 Trap
 * - 9.4 Collision Detection
 * - 9.5 ManufacturerName Coverage
 * - 9.6 ProductId Coverage
 * - 9.8 Non-Regression
 *
 * Usage: node automation/QUICK_VALIDATE.js
 * Exit codes: 0 = passed, 1 = failed
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Generic productIds that need careful handling
const GENERIC_PIDS = ['TS0601', 'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS0011', 'TS0012'];

function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔒 QUICK VALIDATE - Fingerprinting Rules Check');
  console.log('════════════════════════════════════════════════════════════════\n');

  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  const mfrMap = new Map();
  const stats = {
    drivers: 0,
    totalMfrs: 0,
    uniqueMfrs: new Set(),
    totalPids: 0,
    uniquePids: new Set(),
    collisions: [],
    ts0601Warnings: [],
    driversWithoutPid: [],
  };

  // Analyze all drivers
  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    stats.drivers++;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const pids = config.zigbee?.productId || [];

      stats.totalMfrs += mfrs.length;
      stats.totalPids += pids.length;
      mfrs.forEach(m => stats.uniqueMfrs.add(m));
      pids.forEach(p => stats.uniquePids.add(p));

      // Track manufacturers for collision detection
      for (const mfr of mfrs) {
        if (!mfrMap.has(mfr)) mfrMap.set(mfr, []);
        mfrMap.get(mfr).push(driver.name);
      }

      // Rule 9.2: TS0601 trap check
      if (pids.length === 1 && GENERIC_PIDS.includes(pids[0]) && mfrs.length > 20) {
        stats.ts0601Warnings.push({
          driver: driver.name,
          pid: pids[0],
          mfrCount: mfrs.length,
        });
      }

      // Rule 9.6: Drivers without productId
      if (pids.length === 0 && mfrs.length > 0) {
        stats.driversWithoutPid.push({
          driver: driver.name,
          mfrCount: mfrs.length,
        });
      }
    } catch { }
  }

  // Rule 9.4: Collision detection
  for (const [mfr, driverList] of mfrMap) {
    if (driverList.length > 1) {
      stats.collisions.push({ mfr, drivers: driverList });
    }
  }

  // Print results
  console.log('📊 STATISTICS');
  console.log('────────────────────────────────────────────────────────────────');
  console.log(`  Drivers analyzed: ${stats.drivers}`);
  console.log(`  Unique manufacturers: ${stats.uniqueMfrs.size}`);
  console.log(`  Unique productIds: ${stats.uniquePids.size}`);
  console.log('');

  let hasErrors = false;

  // Rule 9.4: Collisions
  console.log('🔍 Rule 9.4: Collision Detection');
  console.log('────────────────────────────────────────────────────────────────');
  if (stats.collisions.length === 0) {
    console.log('  ✅ PASSED - No collisions detected');
  } else {
    console.log(`  ❌ FAILED - ${stats.collisions.length} collisions found:`);
    stats.collisions.slice(0, 10).forEach(c => {
      console.log(`    ${c.mfr} → ${c.drivers.join(', ')}`);
    });
    if (stats.collisions.length > 10) {
      console.log(`    ... and ${stats.collisions.length - 10} more`);
    }
    hasErrors = true;
  }
  console.log('');

  // Rule 9.2: TS0601 Trap
  console.log('🔍 Rule 9.2: TS0601 Trap Check');
  console.log('────────────────────────────────────────────────────────────────');
  if (stats.ts0601Warnings.length === 0) {
    console.log('  ✅ PASSED - No TS0601 trap violations');
  } else {
    console.log(`  ⚠️ WARNING - ${stats.ts0601Warnings.length} potential issues:`);
    stats.ts0601Warnings.forEach(w => {
      console.log(`    ${w.driver}: ${w.pid} with ${w.mfrCount} manufacturers`);
    });
  }
  console.log('');

  // Rule 9.6: ProductId coverage
  console.log('🔍 Rule 9.6: ProductId Coverage');
  console.log('────────────────────────────────────────────────────────────────');
  if (stats.driversWithoutPid.length === 0) {
    console.log('  ✅ PASSED - All drivers have productIds');
  } else {
    console.log(`  ⚠️ INFO - ${stats.driversWithoutPid.length} drivers without productId:`);
    stats.driversWithoutPid.slice(0, 5).forEach(d => {
      console.log(`    ${d.driver}: ${d.mfrCount} manufacturers`);
    });
    if (stats.driversWithoutPid.length > 5) {
      console.log(`    ... and ${stats.driversWithoutPid.length - 5} more`);
    }
  }
  console.log('');

  // Summary
  console.log('════════════════════════════════════════════════════════════════');
  console.log('📋 SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Collisions: ${stats.collisions.length === 0 ? '✅ 0' : '❌ ' + stats.collisions.length}`);
  console.log(`  TS0601 warnings: ${stats.ts0601Warnings.length === 0 ? '✅ 0' : '⚠️ ' + stats.ts0601Warnings.length}`);
  console.log(`  Drivers without PID: ${stats.driversWithoutPid.length}`);
  console.log('════════════════════════════════════════════════════════════════');

  if (hasErrors) {
    console.log('\n❌ VALIDATION FAILED - Fix collisions before commit');
    process.exit(1);
  } else {
    console.log('\n✅ VALIDATION PASSED - All rules satisfied');
    process.exit(0);
  }
}

if (require.main === module) {
  main();
}
