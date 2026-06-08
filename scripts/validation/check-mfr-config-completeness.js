#!/usr/bin/env node
/**
 * check-mfr-config-completeness.js
 *
 * Verifies that MFRs in compose.json have corresponding entries in
 * per-MFR configuration maps (e.g., MFR_CONFIGS in bed_sensor device.js).
 * Catches MFRs that will fall to default config instead of getting proper handling.
 *
 * Bug category: #3 (Missing MFR configs)
 * Severity: WARNING — MFRs without configs may behave incorrectly
 *
 * Usage: node scripts/validation/check-mfr-config-completeness.js [--verbose]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');

// Drivers known to have per-MFR configs (MFR_CONFIGS or equivalent)
const DRIVERS_WITH_MFR_CONFIGS = [
  'bed_sensor',
  'presence_sensor_radar',
  'soil_sensor',
  'rain_sensor',
];

let totalIssues = 0;
const results = [];

for (const driverName of DRIVERS_WITH_MFR_CONFIGS) {
  const devicePath = path.join(__dirname, '..', '..', 'drivers', driverName, 'device.js');
  const composePath = path.join(__dirname, '..', '..', 'drivers', driverName, 'driver.compose.json');

  if (!fs.existsSync(devicePath) || !fs.existsSync(composePath)) continue;

  const deviceContent = fs.readFileSync(devicePath, 'utf8');
  const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));

  // Extract MFRs from compose.json
  const composeMFRs = new Set(
    (compose.zigbee?.manufacturerName || []).map(m => m.toLowerCase())
  );

  // Extract MFRs from MFR_CONFIGS in device.js
  const configMatches = deviceContent.match(/'([A-Z0-9_-]+)':\s*\{/g) || [];
  const configMFRs = new Set(
    configMatches
      .map(m => m.replace(/[': {]/g, '').toLowerCase())
      .filter(m => !['protocol', 'description', 'default', 'true', 'false'].includes(m))
  );

  // Find MFRs in compose but not in config
  const missing = [];
  for (const mfr of composeMFRs) {
    if (!configMFRs.has(mfr)) {
      missing.push(mfr);
    }
  }

  if (missing.length > 0) {
    results.push({ driver: driverName, missing });
    totalIssues += missing.length;
  }
}

// Report
console.log('\n═══════════════════════════════════════════════════════');
console.log('  MFR CONFIG COMPLETENESS CHECKER');
console.log('═══════════════════════════════════════════════════════');
console.log(`  Drivers checked: ${DRIVERS_WITH_MFR_CONFIGS.length}`);
console.log(`  Missing configs: ${totalIssues}`);

if (results.length > 0) {
  console.log('\n  ⚠️  WARNING — MFRs without per-MFR configs:');
  for (const { driver, missing } of results) {
    console.log(`\n  ${driver}:`);
    for (const mfr of missing) {
      console.log(`    - ${mfr} (will fall to default config)`);
    }
  }
  console.log('\n  These MFRs may behave incorrectly without device-specific configuration.');
  console.log('  Add entries to the MFR_CONFIGS map in the driver device.js file.');
  // WARNING only — do not block CI
  process.exit(0);
} else {
  console.log('\n  ✅ PASSED — All MFRs have per-MFR configs');
  process.exit(0);
}
