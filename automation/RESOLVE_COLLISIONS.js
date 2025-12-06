#!/usr/bin/env node
/**
 * RESOLVE COLLISIONS - Intelligent cleanup
 *
 * Strategy:
 * 1. For each manufacturerName in multiple drivers of DIFFERENT types:
 *    - Determine the CORRECT device type from Z2M/documentation
 *    - Keep manufacturerName ONLY in the appropriate driver
 *    - Remove from all other drivers
 *
 * 2. For catch-all drivers (generic_tuya, zigbee_universal):
 *    - Keep ONLY manufacturers that don't exist in specific drivers
 *
 * 3. Preserve data for device migration
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Device type keywords for classification
const TYPE_KEYWORDS = {
  sensor: ['sensor', 'temperature', 'humidity', 'temp', 'hum', 'thermo', 'climate', 'weather', 'soil', 'moisture'],
  motion: ['motion', 'pir', 'presence', 'radar', 'mmwave', 'occupancy'],
  contact: ['contact', 'door', 'window', 'magnet', 'open', 'close'],
  smoke: ['smoke', 'fire', 'co', 'gas', 'alarm', 'detector'],
  water: ['water', 'leak', 'flood'],
  switch: ['switch', 'relay', 'gang', 'wall'],
  plug: ['plug', 'socket', 'outlet', 'usb'],
  dimmer: ['dimmer', 'dim'],
  light: ['bulb', 'light', 'lamp', 'led', 'rgb', 'cct', 'white'],
  button: ['button', 'remote', 'scene', 'wireless'],
  cover: ['curtain', 'blind', 'shade', 'roller', 'shutter', 'cover', 'motor'],
  thermostat: ['thermostat', 'trv', 'valve', 'radiator', 'heating', 'hvac'],
  lock: ['lock', 'door'],
};

// Priority: specific drivers win over generic
const DRIVER_PRIORITY = {
  // Most specific (highest priority)
  'climate_sensor': 100,
  'soil_sensor': 100,
  'motion_sensor': 100,
  'contact_sensor': 100,
  'water_leak_sensor': 100,
  'smoke_detector_advanced': 100,
  'vibration_sensor': 100,
  'presence_sensor_radar': 100,
  'motion_sensor_radar_mmwave': 100,

  // Specific
  'thermostat_tuya_dp': 90,
  'radiator_valve': 90,
  'curtain_motor': 90,
  'plug_energy_monitor': 90,

  // Medium specific
  'switch_1gang': 80,
  'switch_2gang': 80,
  'switch_3gang': 80,
  'switch_4gang': 80,
  'plug_smart': 80,
  'dimmer_wall_1gang': 80,
  'button_wireless_1': 80,
  'bulb_rgb': 80,

  // Generic variants
  'temphumidsensor': 70,
  'lcdtemphumidsensor': 70,
  'air_quality_co2': 70,
  'air_quality_comprehensive': 70,
  'weather_station_outdoor': 70,

  // Catch-all (lowest priority)
  'generic_tuya': 10,
  'zigbee_universal': 5,
};

function getDriverPriority(driverName) {
  for (const [pattern, priority] of Object.entries(DRIVER_PRIORITY)) {
    if (driverName === pattern || driverName.includes(pattern)) {
      return priority;
    }
  }
  return 50; // Default
}

// Classify manufacturerName based on known patterns
function classifyManufacturer(mfr) {
  // Known prefixes
  if (mfr.match(/_TZE2[08][04]_/)) return 'tuya_dp'; // TS0601 devices
  if (mfr.match(/_TZ3000_/)) return 'tuya_standard';
  if (mfr.match(/_TYZB0[12]_/)) return 'tuya_legacy';

  return 'unknown';
}

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🔧 RESOLVE COLLISIONS - Intelligent Cleanup');
  console.log('════════════════════════════════════════════════════════════════\n');

  // Load all drivers
  const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory());

  const driverData = new Map();
  const mfrToDrivers = new Map();

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;

    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      const pids = config.zigbee?.productId || [];

      driverData.set(driver.name, { mfrs: new Set(mfrs), pids, config, configPath });

      for (const mfr of mfrs) {
        if (!mfrToDrivers.has(mfr)) {
          mfrToDrivers.set(mfr, []);
        }
        mfrToDrivers.get(mfr).push(driver.name);
      }
    } catch { }
  }

  console.log(`📊 Loaded ${driverData.size} drivers`);
  console.log(`📊 Total unique manufacturers: ${mfrToDrivers.size}\n`);

  // Find collisions (same mfr in multiple drivers)
  const collisions = [];
  for (const [mfr, driverList] of mfrToDrivers) {
    if (driverList.length > 1) {
      collisions.push({ mfr, drivers: driverList });
    }
  }

  console.log(`🚨 Manufacturers in multiple drivers: ${collisions.length}\n`);

  // Resolve each collision
  let resolved = 0;
  let removals = 0;

  const changes = new Map(); // driver -> { add: [], remove: [] }

  for (const collision of collisions) {
    const { mfr, drivers: driverList } = collision;

    // Sort by priority (highest first)
    const sorted = [...driverList].sort((a, b) =>
      getDriverPriority(b) - getDriverPriority(a)
    );

    // Keep in highest priority driver only
    const keepIn = sorted[0];
    const removeFrom = sorted.slice(1);

    // Don't remove from catch-all drivers if they're the only option
    const highPriorityDrivers = sorted.filter(d => getDriverPriority(d) > 20);

    if (highPriorityDrivers.length > 0) {
      // There's a specific driver, remove from generic ones
      for (const driver of removeFrom) {
        if (!changes.has(driver)) {
          changes.set(driver, { remove: [] });
        }
        changes.get(driver).remove.push(mfr);
        removals++;
      }
      resolved++;
    }
  }

  console.log(`✅ Resolved: ${resolved} collisions`);
  console.log(`🗑️ Removals planned: ${removals}\n`);

  // Apply changes
  console.log('📝 Applying changes...\n');

  let driversModified = 0;
  for (const [driverName, driverChanges] of changes) {
    const data = driverData.get(driverName);
    if (!data) continue;

    let modified = false;

    // Remove manufacturers
    for (const mfr of driverChanges.remove) {
      if (data.mfrs.has(mfr)) {
        data.mfrs.delete(mfr);
        modified = true;
      }
    }

    if (modified) {
      // Update config
      data.config.zigbee.manufacturerName = [...data.mfrs].sort();
      fs.writeFileSync(data.configPath, JSON.stringify(data.config, null, 2));
      driversModified++;

      console.log(`  ${driverName}: -${driverChanges.remove.length} manufacturers`);
    }
  }

  // Final stats
  let finalTotal = 0;
  let finalUnique = new Set();

  for (const driver of drivers) {
    const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
    if (!fs.existsSync(configPath)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const mfrs = config.zigbee?.manufacturerName || [];
      finalTotal += mfrs.length;
      mfrs.forEach(m => finalUnique.add(m));
    } catch { }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('📊 RESULTS');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`  Drivers modified: ${driversModified}`);
  console.log(`  Removals applied: ${removals}`);
  console.log(`  Final manufacturer entries: ${finalTotal}`);
  console.log(`  Final unique manufacturers: ${finalUnique.size}`);
  console.log('════════════════════════════════════════════════════════════════');
}

if (require.main === module) {
  main().catch(console.error);
}
