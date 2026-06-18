#!/usr/bin/env node
'use strict';

/**
 * TITAN Protocol v5 — Check TS0601 Catchall Drivers
 *
 * Finds all drivers with TS0601 in productId but no manufacturerName restrictions.
 * These drivers will match ANY TS0601 device, causing misclassification.
 *
 * Usage:
 *   node scripts/validation/check-ts0601-catchall.js [--json]
 *
 * Exit codes:
 *   0 = no violations
 *   1 = violations found
 *   2 = script failure
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const JSON_OUTPUT = process.argv.includes('--json');

let totalDrivers = 0;
let totalViolations = 0;
const violations = [];

// Get all driver compose files
function getDriverComposeFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const composeFile = path.join(dir, entry.name, 'driver.compose.json');
      if (fs.existsSync(composeFile)) {
        files.push({ driver: entry.name, file: composeFile });
      }
    }
  }

  return files;
}

// Check a single driver compose file
function checkDriver(driverName, filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const compose = JSON.parse(content);

    // Check if has TS0601 in productId (match TS0601, TS0601_xxx variants)
    const productIds = compose.zigbee?.productId || [];
    const hasTS0601 = productIds.some(pid => pid === 'TS0601' || pid.startsWith('TS0601'));

    if (!hasTS0601) return;

    // Check if has manufacturerName restrictions
    const manufacturerNames = compose.zigbee?.manufacturerName || [];
    const hasManufacturerName = manufacturerNames.length > 0;

    // Check if it's a catchall driver
    const isCatchall = compose.metadata?.driver?.catchall === true;

    if (!hasManufacturerName) {
      totalViolations++;
      violations.push({
        driver: driverName,
        file: path.relative(process.cwd(), filePath),
        isCatchall,
        productIds,
        manufacturerNames,
      });
    }

    totalDrivers++;
  } catch (err) {
    // Skip files with parse errors
  }
}

// Main execution
console.log('🔍 TITAN v5 — Checking TS0601 catchall drivers...\n');

const driverFiles = getDriverComposeFiles(DRIVERS_DIR);
console.log(`Found ${driverFiles.length} driver compose files to check\n`);

for (const { driver, file } of driverFiles) {
  checkDriver(driver, file);
}

// Output results
if (JSON_OUTPUT) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    totalDrivers,
    totalViolations,
    violations,
    exitCode: violations.length > 0 ? 1 : 0,
  }, null, 2));
  process.exit(violations.length > 0 ? 1 : 0);
}

if (violations.length === 0) {
  console.log('✅ No TS0601 catchall drivers found');
  process.exit(0);
} else {
  console.log(`❌ Found ${totalViolations} TS0601 catchall drivers:\n`);

  for (const v of violations) {
    console.log(`📁 ${v.driver}`);
    console.log(`   File: ${v.file}`);
    console.log(`   Catchall: ${v.isCatchall}`);
    console.log(`   ProductIds: ${v.productIds.join(', ')}`);
    console.log(`   ManufacturerNames: ${v.manufacturerNames.length > 0 ? v.manufacturerNames.join(', ') : 'NONE'}`);
    console.log('');
  }

  console.log('💡 Fix: Add manufacturerName array to restrict which devices match');
  console.log('   Or remove TS0601 from productId if not needed');
  process.exit(1);
}
