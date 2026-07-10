#!/usr/bin/env node
'use strict';

/**
 * TITAN Protocol v5 — Check Energy Divisor Validation
 *
 * Finds all drivers with meter_power capability (from compose.json) and validates
 * they use proper divisor settings (smartDivisor or explicit divisor).
 *
 * Usage:
 *   node scripts/validation/check-energy-divisor.js [--json]
 *
 * Exit codes:
 *   0 = all energy drivers have proper divisor
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

// Get all driver directories that have meter_power in compose.json
function getEnergyDrivers(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const composePath = path.join(dir, entry.name, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath));
      const caps = compose.capabilities || [];
      const hasMeterPower = caps.includes('meter_power');
      if (!hasMeterPower) continue;

      const devicePath = path.join(dir, entry.name, 'device.js');
      files.push({
        driver: entry.name,
        composeFile: composePath,
        deviceFile: fs.existsSync(devicePath) ? devicePath : null,
      });
    } catch (e) {
      // skip parse errors
    }
  }

  return files;
}

// Check a single driver device file for divisor handling
function checkDriver(driverName, deviceFilePath) {
  try {
    const content = fs.readFileSync(deviceFilePath, 'utf8');

    totalDrivers++;

    // Check for smartDivisor usage
    const hasSmartDivisor = content.includes('smartDivisor: true') || content.includes('smartDivisor:true');

    // Check for explicit divisor in dpMappings
    const hasExplicitDivisor = content.includes('divisor:') || content.includes('divisor :');

    // Check for SmartDivisorManager import
    const hasSmartDivisorManager = content.includes('SmartDivisorManager') || content.includes('smartDivisorDetect');

    // Check for AdaptiveDataParser (also handles divisor)
    const hasAdaptiveParser = content.includes('AdaptiveDataParser') || content.includes('adaptiveData');

    if (!hasSmartDivisor && !hasExplicitDivisor && !hasSmartDivisorManager && !hasAdaptiveParser) {
      totalViolations++;
      violations.push({
        driver: driverName,
        file: path.relative(process.cwd(), deviceFilePath),
        hasSmartDivisor,
        hasExplicitDivisor,
        hasSmartDivisorManager,
        hasAdaptiveParser,
      });
    }
  } catch (err) {
    // Skip files with parse errors
  }
}

// Main execution
if (!JSON_OUTPUT) console.log('🔍 TITAN v5 — Checking energy divisor validation...\n');

const energyDrivers = getEnergyDrivers(DRIVERS_DIR);
if (!JSON_OUTPUT) console.log(`Found ${energyDrivers.length} drivers with meter_power capability\n`);

for (const { driver, deviceFile } of energyDrivers) {
  if (deviceFile) {
    checkDriver(driver, deviceFile);
  } else {
    // Has meter_power in compose but no device.js
    totalDrivers++;
    totalViolations++;
    violations.push({
      driver,
      file: 'device.js MISSING',
      hasSmartDivisor: false,
      hasExplicitDivisor: false,
      hasSmartDivisorManager: false,
      hasAdaptiveParser: false,
    });
  }
}

// Output results
if (JSON_OUTPUT) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    energyDrivers: energyDrivers.length,
    totalDrivers,
    totalViolations,
    violations,
    exitCode: violations.length > 0 ? 1 : 0,
  }, null, 2));
  process.exit(violations.length > 0 ? 1 : 0);
}

console.log(`\n📊 Results:`);
console.log(`   Drivers with energy capability: ${totalDrivers}`);
console.log(`   Drivers without divisor: ${totalViolations}`);

if (violations.length === 0) {
  console.log('\n✅ All energy drivers have proper divisor settings');
  process.exit(0);
} else {
  console.log(`\n❌ Found ${totalViolations} drivers without proper divisor:\n`);

  for (const v of violations) {
    console.log(`📁 ${v.driver}`);
    console.log(`   File: ${v.file}`);
    console.log(`   smartDivisor: ${v.hasSmartDivisor}`);
    console.log(`   explicit divisor: ${v.hasExplicitDivisor}`);
    console.log(`   SmartDivisorManager: ${v.hasSmartDivisorManager}`);
    console.log(`   AdaptiveDataParser: ${v.hasAdaptiveParser}`);
    console.log('');
  }

  console.log('💡 Fix: Add smartDivisor: true or explicit divisor to energy DPs');
  process.exit(1);
}
