#!/usr/bin/env node
/**
 * CLEANUP DUPLICATE MANUFACTURERS
 *
 * Removes manufacturers that are in too many drivers (>5)
 * These are likely generic patterns that were added incorrectly
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = 'drivers';

// Drivers that should keep generic manufacturers (catch-all drivers)
const CATCH_ALL_DRIVERS = [
  'zigbee_universal',
  'generic_tuya',
];

// Build manufacturer map
const allMfrs = new Map();
const drivers = fs.readdirSync(DRIVERS_DIR, { withFileTypes: true }).filter(d => d.isDirectory());

for (const driver of drivers) {
  const configPath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
  if (!fs.existsSync(configPath)) continue;
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const mfrs = config.zigbee?.manufacturerName || [];
    for (const mfr of mfrs) {
      if (!allMfrs.has(mfr)) allMfrs.set(mfr, []);
      allMfrs.get(mfr).push(driver.name);
    }
  } catch { }
}

// Find manufacturers in >5 drivers (excluding catch-all)
const problematic = new Map();
for (const [mfr, driverList] of allMfrs) {
  const nonCatchAll = driverList.filter(d => !CATCH_ALL_DRIVERS.includes(d));
  if (nonCatchAll.length > 5) {
    problematic.set(mfr, nonCatchAll);
  }
}

console.log(`Found ${problematic.size} manufacturers in >5 drivers`);

// For each problematic manufacturer, keep it only in the most specific driver
// Priority: specific type > generic type > catch-all
const DRIVER_PRIORITY = {
  // Sensors (most specific)
  'climate_sensor': 10,
  'soil_sensor': 10,
  'motion_sensor': 10,
  'motion_sensor_radar_mmwave': 10,
  'contact_sensor': 10,
  'water_leak_sensor': 10,
  'smoke_detector_advanced': 10,
  'vibration_sensor': 10,

  // Specific devices
  'thermostat_tuya_dp': 9,
  'curtain_motor': 9,
  'plug_energy_monitor': 9,
  'dimmer_wall_1gang': 9,
  'dimmer_dual_channel': 9,

  // Switches
  'switch_1gang': 8,
  'switch_2gang': 8,
  'switch_3gang': 8,
  'switch_4gang': 8,

  // Buttons
  'button_wireless_1': 7,
  'button_wireless_2': 7,
  'button_wireless_3': 7,
  'button_wireless_4': 7,

  // LED
  'led_controller_rgb': 6,
  'led_controller_cct': 6,
  'led_controller_dimmable': 6,

  // Bulbs (less specific)
  'bulb_rgb': 5,
  'bulb_rgbw': 5,
  'bulb_tunable_white': 5,
  'bulb_dimmable': 5,

  // Generic
  'plug_smart': 4,
  'socket': 4,

  // Catch-all (lowest)
  'zigbee_universal': 1,
  'generic_tuya': 1,
};

function getDriverPriority(driver) {
  return DRIVER_PRIORITY[driver] || 3;
}

// Process each problematic manufacturer
let totalRemoved = 0;
const driverChanges = new Map();

for (const [mfr, driverList] of problematic) {
  // Sort by priority (highest first)
  const sorted = driverList.sort((a, b) => getDriverPriority(b) - getDriverPriority(a));

  // Keep only in the top 2 most specific drivers
  const toKeep = sorted.slice(0, 2);
  const toRemove = sorted.slice(2);

  for (const driver of toRemove) {
    if (!driverChanges.has(driver)) {
      driverChanges.set(driver, []);
    }
    driverChanges.get(driver).push(mfr);
    totalRemoved++;
  }
}

console.log(`Will remove ${totalRemoved} manufacturer entries from ${driverChanges.size} drivers`);

// Apply changes
let driversModified = 0;
for (const [driver, mfrsToRemove] of driverChanges) {
  const configPath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const originalCount = config.zigbee.manufacturerName.length;

    config.zigbee.manufacturerName = config.zigbee.manufacturerName
      .filter(m => !mfrsToRemove.includes(m));

    if (config.zigbee.manufacturerName.length !== originalCount) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      driversModified++;
      console.log(`  ${driver}: -${originalCount - config.zigbee.manufacturerName.length} manufacturers`);
    }
  } catch { }
}

console.log(`\n✅ Modified ${driversModified} drivers`);
console.log(`✅ Removed ${totalRemoved} duplicate manufacturer entries`);
