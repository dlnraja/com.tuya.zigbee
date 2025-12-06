#!/usr/bin/env node
/**
 * APPLY DP DATABASE SCRIPT v1.0
 *
 * Uses COMPLETE_DP_DATABASE.json to enrich all drivers with:
 * - ManufacturerNames
 * - ProductIds
 * - Clusters
 * - DP Mappings
 * - Capabilities
 * - Flow cards
 * - Settings
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATABASE_FILE = path.join(DATA_DIR, 'COMPLETE_DP_DATABASE.json');

// Load database
const database = JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf8'));

function loadDriverConfig(driverName) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  if (!fs.existsSync(driverPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(driverPath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function saveDriverConfig(driverName, config) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  fs.writeFileSync(driverPath, JSON.stringify(config, null, 2) + '\n');
}

function enrichDriver(driverName, deviceType) {
  const config = loadDriverConfig(driverName);
  if (!config) {
    console.log(`⚠️  Driver ${driverName} not found`);
    return null;
  }

  const dbInfo = database.device_types[deviceType];
  if (!dbInfo) {
    console.log(`⚠️  Device type ${deviceType} not in database`);
    return null;
  }

  let changes = [];

  // Enrich manufacturers
  const currentMfrs = config.zigbee?.manufacturerName || [];
  let addedMfrs = 0;
  for (const mfr of dbInfo.manufacturers) {
    if (!currentMfrs.includes(mfr)) {
      currentMfrs.push(mfr);
      addedMfrs++;
    }
  }
  if (addedMfrs > 0) {
    config.zigbee.manufacturerName = currentMfrs;
    changes.push(`+${addedMfrs} mfrs`);
  }

  // Enrich product IDs
  const currentProducts = config.zigbee?.productId || [];
  let addedProducts = 0;
  for (const pid of dbInfo.zigbee_models) {
    if (!currentProducts.includes(pid)) {
      currentProducts.push(pid);
      addedProducts++;
    }
  }
  if (addedProducts > 0) {
    config.zigbee.productId = currentProducts;
    changes.push(`+${addedProducts} products`);
  }

  // Ensure clusters are defined
  if (dbInfo.clusters && !config.zigbee.endpoints) {
    config.zigbee.endpoints = {
      "1": {
        "clusters": [...dbInfo.clusters.input, ...dbInfo.clusters.output],
        "bindings": dbInfo.clusters.output || []
      }
    };
    changes.push('+clusters');
  }

  // Ensure capabilities
  const currentCaps = config.capabilities || [];
  let addedCaps = 0;
  for (const cap of dbInfo.homey_capabilities) {
    if (!currentCaps.includes(cap)) {
      currentCaps.push(cap);
      addedCaps++;
    }
  }
  if (addedCaps > 0) {
    config.capabilities = currentCaps;
    changes.push(`+${addedCaps} caps`);
  }

  // Ensure class
  if (!config.class && dbInfo.homey_class) {
    config.class = dbInfo.homey_class;
    changes.push(`+class:${dbInfo.homey_class}`);
  }

  if (changes.length > 0) {
    saveDriverConfig(driverName, config);
    console.log(`✅ ${driverName}: ${changes.join(', ')}`);
    return { success: true, changes };
  }

  return { success: true, changes: [] };
}

function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 APPLY DP DATABASE SCRIPT v1.0');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Map driver names to device types
  const driverMappings = {
    'climate_sensor': 'climate_sensor',
    'soil_sensor': 'soil_sensor',
    'motion_sensor': 'motion_sensor',
    'motion_sensor_radar_mmwave': 'motion_sensor_radar_mmwave',
    'button_emergency_sos': 'button_emergency_sos',
    'plug_energy_monitor': 'plug_energy_monitor',
    'usb_outlet_advanced': 'usb_outlet_advanced',
    'curtain_motor': 'curtain_motor',
    'thermostat_tuya_dp': 'thermostat_tuya_dp',
    'smoke_detector_advanced': 'smoke_detector_advanced',
    'contact_sensor': 'contact_sensor',
    'button_wireless_1': 'button_wireless_1',
    'switch_2gang': 'switch_2gang',
    'switch_4gang': 'switch_4gang',
    'dimmer_dual_channel': 'dimmer_dual_channel',
  };

  let enriched = 0;
  let unchanged = 0;

  for (const [driverName, deviceType] of Object.entries(driverMappings)) {
    const result = enrichDriver(driverName, deviceType);
    if (result && result.changes.length > 0) {
      enriched++;
    } else {
      unchanged++;
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Drivers enriched: ${enriched}`);
  console.log(`  Drivers unchanged: ${unchanged}`);
  console.log(`  Device types in database: ${Object.keys(database.device_types).length}`);
  console.log('════════════════════════════════════════════════════════════════\n');
}

main();
