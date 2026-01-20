'use strict';

/**
 * Fix Duplicate ManufacturerNames Script v5.5.701
 * 
 * This script identifies and fixes manufacturerNames that are duplicated
 * across incompatible driver types. When a manufacturerName is in multiple
 * drivers, Homey may match the device to the wrong driver.
 * 
 * RULES:
 * 1. Each manufacturerName should only be in ONE driver (the most specific one)
 * 2. If manufacturerName is shared between similar drivers (e.g. switch_1gang, switch_2gang),
 *    that's acceptable - same device type with different gangs
 * 3. If manufacturerName is shared between incompatible types (e.g. bulb_rgb AND contact_sensor),
 *    it must be fixed by keeping it in the most likely correct driver
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// Define compatible groups - manufacturerNames CAN be shared within these groups
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
  dimmers: ['dimmer_wall_1gang', 'dimmer_dual_channel', 'dimmer_3gang']
};

// Build reverse lookup: driver -> group
const driverToGroup = {};
for (const [group, drivers] of Object.entries(COMPATIBLE_GROUPS)) {
  for (const driver of drivers) {
    driverToGroup[driver] = group;
  }
}

// Priority order for resolving conflicts (higher = more specific, keep this one)
const DRIVER_PRIORITY = {
  // Specific device types get priority over generic ones
  'contact_sensor': 100,
  'motion_sensor': 100,
  'water_leak_sensor': 100,
  'smoke_detector_advanced': 100,
  'co_sensor': 100,
  'gas_detector': 100,
  'vibration_sensor': 100,
  'soil_sensor': 100,
  'rain_sensor': 100,
  
  // Specific buttons/switches
  'scene_switch_4': 95,
  'scene_switch_6': 95,
  'button_wireless_4': 90,
  'button_wireless_6': 90,
  'button_wireless_8': 90,
  
  // Energy monitoring variants
  'plug_energy_monitor': 85,
  'din_rail_meter': 85,
  'power_meter': 85,
  
  // Specific thermostats
  'radiator_valve': 80,
  'radiator_controller': 80,
  
  // Standard devices
  'switch_4gang': 70,
  'switch_3gang': 65,
  'switch_2gang': 60,
  'switch_1gang': 55,
  
  // Generic/fallback
  'generic_tuya': 1,
  'thermostat_tuya_dp': 50,
  'plug_smart': 50,
  'bulb_rgb': 50,
  'bulb_rgbw': 50,
  
  // Default
  '_default': 40
};

function getDriverPriority(driverId) {
  return DRIVER_PRIORITY[driverId] || DRIVER_PRIORITY['_default'];
}

function areDriversCompatible(driver1, driver2) {
  const group1 = driverToGroup[driver1];
  const group2 = driverToGroup[driver2];
  
  if (group1 && group2 && group1 === group2) {
    return true;
  }
  
  // Also check if both are in the same "family" by prefix
  const prefix1 = driver1.split('_')[0];
  const prefix2 = driver2.split('_')[0];
  
  if (prefix1 === prefix2) {
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔍 Scanning for duplicate manufacturerNames...\n');
  
  // Collect all manufacturerNames from all drivers
  const mfrMap = new Map(); // manufacturerName -> [{driverId, filePath}]
  
  const driverFolders = fs.readdirSync(driversDir);
  
  for (const folder of driverFolders) {
    const composePath = path.join(driversDir, folder, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];
      
      for (const mfr of mfrs) {
        if (!mfr.startsWith('_T')) continue; // Only check Tuya IDs
        
        if (!mfrMap.has(mfr)) {
          mfrMap.set(mfr, []);
        }
        mfrMap.get(mfr).push({
          driverId: folder,
          filePath: composePath
        });
      }
    } catch (err) {
      console.error(`Error reading ${composePath}:`, err.message);
    }
  }
  
  // Find duplicates
  const duplicates = [...mfrMap.entries()]
    .filter(([mfr, drivers]) => drivers.length > 1);
  
  console.log(`Found ${duplicates.length} duplicate manufacturerNames\n`);
  
  // Find CRITICAL duplicates (incompatible driver types)
  const criticalDuplicates = duplicates.filter(([mfr, drivers]) => {
    const driverIds = drivers.map(d => d.driverId);
    
    // Check if all drivers are compatible
    for (let i = 0; i < driverIds.length; i++) {
      for (let j = i + 1; j < driverIds.length; j++) {
        if (!areDriversCompatible(driverIds[i], driverIds[j])) {
          return true; // Found incompatible pair
        }
      }
    }
    return false;
  });
  
  console.log(`Found ${criticalDuplicates.length} CRITICAL duplicates (incompatible types)\n`);
  
  // Generate fixes
  const fixes = []; // {mfr, removeFrom: [], keepIn: driverId}
  
  for (const [mfr, drivers] of criticalDuplicates) {
    const driverIds = drivers.map(d => d.driverId);
    
    // Find the highest priority driver
    let bestDriver = driverIds[0];
    let bestPriority = getDriverPriority(driverIds[0]);
    
    for (let i = 1; i < driverIds.length; i++) {
      const priority = getDriverPriority(driverIds[i]);
      if (priority > bestPriority) {
        bestPriority = priority;
        bestDriver = driverIds[i];
      }
    }
    
    // Remove from all others
    const removeFrom = driverIds.filter(d => d !== bestDriver);
    
    fixes.push({
      mfr,
      keepIn: bestDriver,
      removeFrom
    });
  }
  
  console.log('📝 Proposed fixes:\n');
  
  // Group fixes by driver to remove from
  const removeByDriver = new Map();
  
  for (const fix of fixes) {
    for (const driverId of fix.removeFrom) {
      if (!removeByDriver.has(driverId)) {
        removeByDriver.set(driverId, []);
      }
      removeByDriver.get(driverId).push(fix.mfr);
    }
  }
  
  // Apply fixes
  let totalRemoved = 0;
  
  for (const [driverId, mfrsToRemove] of removeByDriver) {
    const composePath = path.join(driversDir, driverId, 'driver.compose.json');
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const originalCount = compose.zigbee?.manufacturerName?.length || 0;
      
      compose.zigbee.manufacturerName = compose.zigbee.manufacturerName.filter(
        m => !mfrsToRemove.includes(m)
      );
      
      const newCount = compose.zigbee.manufacturerName.length;
      const removed = originalCount - newCount;
      
      if (removed > 0) {
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        console.log(`✅ ${driverId}: Removed ${removed} duplicate manufacturerNames`);
        totalRemoved += removed;
      }
    } catch (err) {
      console.error(`❌ Error fixing ${driverId}:`, err.message);
    }
  }
  
  console.log(`\n🎉 Total: Removed ${totalRemoved} duplicate manufacturerNames from ${removeByDriver.size} drivers`);
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    totalDuplicates: duplicates.length,
    criticalDuplicates: criticalDuplicates.length,
    fixes: fixes.slice(0, 100), // First 100 for reference
    driversModified: [...removeByDriver.keys()],
    totalRemoved
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'duplicate-mfr-fix-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n📊 Report saved to scripts/duplicate-mfr-fix-report.json');
}

main();
