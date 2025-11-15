#!/usr/bin/env node

'use strict';

/**
 * ADD BATTERY BINDINGS v4.9.340
 *
 * Automatically adds cluster 1 (genPowerCfg) binding to all drivers
 * that have measure_battery capability.
 *
 * This enables automatic battery reporting instead of manual polling.
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

let stats = {
  processed: 0,
  modified: 0,
  skipped: 0,
  errors: 0,
  details: []
};

/**
 * Check if driver has measure_battery capability
 * @param {Object} driverData - Parsed driver.compose.json
 * @returns {boolean}
 */
function hasMeasureBattery(driverData) {
  if (!driverData.capabilities) return false;

  if (Array.isArray(driverData.capabilities)) {
    return driverData.capabilities.includes('measure_battery');
  }

  return false;
}

/**
 * Add binding 1 (genPowerCfg) to endpoints if not present
 * @param {Object} driverData - Parsed driver.compose.json
 * @returns {boolean} - True if modified
 */
function addBatteryBinding(driverData) {
  let modified = false;

  // Check if zigbee endpoints exist
  if (!driverData.zigbee || !driverData.zigbee.endpoints) {
    return false;
  }

  // Iterate over all endpoints
  for (const [epId, endpoint] of Object.entries(driverData.zigbee.endpoints)) {
    // Check if bindings array exists
    if (!endpoint.bindings) {
      // Create bindings array with cluster 1
      endpoint.bindings = [1];
      modified = true;
      console.log(`  → Added bindings [1] to endpoint ${epId}`);
      continue;
    }

    // Check if binding 1 already exists
    if (!endpoint.bindings.includes(1)) {
      // Add cluster 1 to beginning (preferred order)
      endpoint.bindings.unshift(1);
      modified = true;
      console.log(`  → Added binding 1 to endpoint ${epId} (now: [${endpoint.bindings.join(', ')}])`);
    } else {
      console.log(`  → Endpoint ${epId} already has binding 1`);
    }
  }

  return modified;
}

/**
 * Process a single driver
 * @param {string} driverPath - Path to driver directory
 */
function processDriver(driverPath) {
  const driverName = path.basename(driverPath);
  const composeFile = path.join(driverPath, 'driver.compose.json');

  // Check if driver.compose.json exists
  if (!fs.existsSync(composeFile)) {
    return;
  }

  stats.processed++;

  try {
    // Read and parse driver.compose.json
    const content = fs.readFileSync(composeFile, 'utf8');
    const driverData = JSON.parse(content);

    // Check if driver has measure_battery capability
    if (!hasMeasureBattery(driverData)) {
      stats.skipped++;
      return;
    }

    console.log(`\n📦 Processing: ${driverName}`);

    // Add battery binding
    const modified = addBatteryBinding(driverData);

    if (modified) {
      // Write back to file
      const newContent = JSON.stringify(driverData, null, 2);
      fs.writeFileSync(composeFile, newContent, 'utf8');

      stats.modified++;
      stats.details.push({
        driver: driverName,
        status: 'MODIFIED',
        message: 'Added genPowerCfg binding'
      });

      console.log(`  ✅ ${driverName}: MODIFIED`);
    } else {
      stats.skipped++;
      stats.details.push({
        driver: driverName,
        status: 'SKIPPED',
        message: 'Bindings already present or no endpoints'
      });

      console.log(`  ⏭️  ${driverName}: SKIPPED (already has binding 1)`);
    }

  } catch (err) {
    stats.errors++;
    stats.details.push({
      driver: driverName,
      status: 'ERROR',
      message: err.message
    });

    console.error(`  ❌ ${driverName}: ERROR - ${err.message}`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔋 ADD BATTERY BINDINGS v4.9.340');
  console.log('   Adding genPowerCfg (cluster 1) bindings to all battery drivers');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Get all driver directories
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => path.join(DRIVERS_DIR, dirent.name));

  console.log(`Found ${drivers.length} drivers to check\n`);

  // Process each driver
  drivers.forEach(processDriver);

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Total Processed: ${stats.processed}`);
  console.log(`Modified:        ${stats.modified} ✅`);
  console.log(`Skipped:         ${stats.skipped} ⏭️`);
  console.log(`Errors:          ${stats.errors} ❌`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Print details if errors
  if (stats.errors > 0) {
    console.log('❌ ERRORS:\n');
    stats.details
      .filter(d => d.status === 'ERROR')
      .forEach(d => {
        console.log(`  ${d.driver}: ${d.message}`);
      });
    console.log('');
  }

  // Print modified drivers
  if (stats.modified > 0) {
    console.log('✅ MODIFIED DRIVERS:\n');
    stats.details
      .filter(d => d.status === 'MODIFIED')
      .forEach(d => {
        console.log(`  ✅ ${d.driver}`);
      });
    console.log('');
  }

  console.log('🎉 Battery bindings update complete!');
  console.log(`   ${stats.modified} drivers now have genPowerCfg binding enabled`);
  console.log('   Battery reporting will be automatic on next device pair/restart\n');
}

// Execute
main();
