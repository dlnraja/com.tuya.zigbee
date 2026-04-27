/**
 * Script: fix-corrupted-drivers-v2.js
 * Purpose: Fix corrupted flow card patterns in driver.js files
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Pattern 1: Corrupted nested blocks like "} catch (e) { return null; } })();"
const CORRUPT_PATTERN_1 = /\s*\}\s*catch\s*\([^)]*\)\s*\{\s*return\s+null;\s*\}\s*\}\s*\(\s*\)\s*\(\s*\)\s*;?/g;

// Pattern 2: Empty try returns like "(() => { try { return ; } catch..."
const CORRUPT_PATTERN_2 = /\(\(\)\s*=>\s*\{\s*try\s*\{\s*return\s*;\s*\}\s*catch[^}]+\}\s*\)\s*\(\s*\)/g;

// Pattern 3: Multiple nested catch blocks
const CORRUPT_PATTERN_3 = /\}\s*catch[^}]+return\s+null[^}]+\}\s*\(\s*\)\s*\(\s*\)[^;]*;/g;

// Pattern 4: Extra closing braces before semicolons in flow card sections
const CORRUPT_PATTERN_4 = /\}\s*\}\s*;?\s*$/gm;

// List of known corrupted drivers
const CORRUPTED_DRIVERS = [
  'air_purifier',
  'air_purifier_curtain_hybrid',
  'air_purifier_din_hybrid',
  'air_purifier_lcdtemphumidsensor_hybrid',
  'air_purifier_motion_hybrid',
  'air_purifier_quality_hybrid',
  'air_purifier_sensor_hybrid',
  'button_wireless_usb_hybrid',
  'curtain_motor_tilt',
  'device_air_purifier_climate_hybrid',
  'device_air_purifier_humidifier_hybrid',
  'device_air_purifier_radiator_hybrid',
  'device_air_purifier_thermostat_hybrid',
  'device_din_rail_meter_hybrid',
  'device_generic_tuya_universal_hybrid',
  'device_plug_smart_hybrid',
  'device_radiator_valve_hybrid',  // Already fixed
  'device_radiator_valve_smart_hybrid',
  'device_radiator_valve_thermostat_hybrid',
  'dimmer_3gang',
  'din_rail_switch',
  'diy_custom_zigbee',
  'fingerprint_lock',
  'formaldehyde_sensor',
  'generic_tuya',
  'humidifier',
  'hvac_air_conditioner',
  'hvac_dehumidifier',
  'lcdtemphumidsensor_plug_energy_hybrid',
  'led_controller_cct',
  'led_controller_dimmable',
  'led_controller_rgb',
  'motion_sensor_radar_mmwave',
  'pet_feeder',
  'plug_energy_monitor_hybrid',
  'pool_pump',
  'presence_sensor_ceiling',
  'remote_button_wireless_plug_hybrid',
  'remote_button_wireless_usb_hybrid',
  'sensor_climate_smart_hybrid',
  'sensor_contact_plug_hybrid',
  'sensor_lcdtemphumidsensor_soil_hybrid',
  'sensor_motion_radar_hybrid',
  'sensor_presence_radar_hybrid',
  'smart_breaker',
  'smart_heater',
  'smart_heater_controller',
  'smart_rcbo',
  'soil_sensor',
  'switch_dimmer_1gang',
  'switch_plug_1',
  'switch_plug_2',
  'switch_temp_sensor',
  'thermostat_4ch',
  'thermostat_tuya_dp',
  'usb_dongle_dual_repeater',
  'usb_dongle_triple',
  'valve_irrigation',
  'valve_single',
  'wall_switch_1gang_1way',
  'wall_switch_2gang_1way',
  'water_leak_sensor',
  'water_tank_monitor',
  'water_valve_smart',
  'weather_station_outdoor',
  'wifi_cover',
  'wifi_siren',
];

function fixDriver(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Skip already fixed drivers
  if (filePath.includes('device_radiator_valve_hybrid')) {
    console.log(`  [SKIP] Already fixed: ${path.basename(path.dirname(filePath))}`);
    return false;
  }
  
  // Fix Pattern 1: Remove corrupted nested blocks
  content = content.replace(CORRUPT_PATTERN_1, '');
  
  // Fix Pattern 2: Remove empty try returns
  content = content.replace(CORRUPT_PATTERN_2, '');
  
  // Fix Pattern 3: Multiple nested catch blocks
  content = content.replace(CORRUPT_PATTERN_3, '');
  
  // Fix Pattern 4: Extra closing braces
  content = content.replace(CORRUPT_PATTERN_4, '  }');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

console.log('=== Corrupted Driver Fixer v2 ===\n');

let fixed = 0;
let skipped = 0;
let errors = 0;

for (const driverName of CORRUPTED_DRIVERS) {
  const driverPath = path.join(DRIVERS_DIR, driverName, 'driver.js');
  
  if (!fs.existsSync(driverPath)) {
    console.log(`  [MISSING] ${driverName}/driver.js`);
    continue;
  }
  
  try {
    const wasFixed = fixDriver(driverPath);
    if (wasFixed) {
      console.log(`  [FIXED] ${driverName}`);
      fixed++;
    } else {
      console.log(`  [OK] ${driverName} (no changes needed)`);
      skipped++;
    }
  } catch (err) {
    console.log(`  [ERROR] ${driverName}: ${err.message}`);
    errors++;
  }
}

console.log(`\n=== Summary ===`);
console.log(`Fixed: ${fixed}`);
console.log(`Skipped: ${skipped}`);
console.log(`Errors: ${errors}`);
console.log(`Total: ${CORRUPTED_DRIVERS.length}`);
