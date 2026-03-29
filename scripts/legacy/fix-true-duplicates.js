'use strict';

/**
 * Fix TRUE Duplicates Script v5.5.701
 * 
 * IMPORTANT RULE: ManufacturerNames CAN be in multiple drivers IF they have different productIds!
 * 
 * Example VALID configuration:
 *   - _TZ3000_abc + TS0001 → switch_1gang ✅
 *   - _TZ3000_abc + TS0002 → switch_2gang ✅ (same mfr, DIFFERENT productId)
 * 
 * Example INVALID (TRUE duplicate):
 *   - _TZ3000_abc + TS0001 → switch_1gang ❌
 *   - _TZ3000_abc + TS0001 → bulb_rgb ❌ (same mfr, SAME productId, DIFFERENT incompatible drivers)
 * 
 * This script ONLY removes TRUE duplicates where:
 *   1. Same manufacturerName
 *   2. Same productId  
 *   3. Incompatible driver types
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

// Compatible groups - drivers within same group can share mfr+productId
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

// Build reverse lookup
const driverToGroup = {};
for (const [group, drivers] of Object.entries(COMPATIBLE_GROUPS)) {
  for (const driver of drivers) {
    driverToGroup[driver] = group;
  }
}

function areDriversCompatible(driver1, driver2) {
  const group1 = driverToGroup[driver1];
  const group2 = driverToGroup[driver2];
  
  if (group1 && group2 && group1 === group2) return true;
  
  // Same prefix = compatible (switch_1gang, switch_2gang, etc.)
  const prefix1 = driver1.split('_')[0];
  const prefix2 = driver2.split('_')[0];
  if (prefix1 === prefix2) return true;
  
  return false;
}

function main() {
  console.log('🔍 Scanning for TRUE duplicates (same mfr + same productId in incompatible drivers)...\n');
  
  // Collect all mfr+productId combinations from all drivers
  const comboMap = new Map(); // "mfr|productId" -> [{driverId, filePath}]
  
  const driverFolders = fs.readdirSync(driversDir);
  
  for (const folder of driverFolders) {
    const composePath = path.join(driversDir, folder, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrs = compose.zigbee?.manufacturerName || [];
      const productIds = compose.zigbee?.productId || [];
      
      // For each mfr+productId combination
      for (const mfr of mfrs) {
        if (!mfr.startsWith('_T')) continue; // Only Tuya IDs
        
        for (const productId of productIds) {
          const key = `${mfr}|${productId}`;
          
          if (!comboMap.has(key)) {
            comboMap.set(key, []);
          }
          comboMap.get(key).push({
            driverId: folder,
            filePath: composePath,
            mfr,
            productId
          });
        }
      }
    } catch (err) {
      console.error(`Error reading ${composePath}:`, err.message);
    }
  }
  
  // Find TRUE duplicates (same combo in INCOMPATIBLE drivers)
  const trueDuplicates = [];
  
  for (const [key, entries] of comboMap) {
    if (entries.length < 2) continue;
    
    const driverIds = entries.map(e => e.driverId);
    
    // Check if any pair is incompatible
    let hasIncompatible = false;
    for (let i = 0; i < driverIds.length && !hasIncompatible; i++) {
      for (let j = i + 1; j < driverIds.length; j++) {
        if (!areDriversCompatible(driverIds[i], driverIds[j])) {
          hasIncompatible = true;
          break;
        }
      }
    }
    
    if (hasIncompatible) {
      trueDuplicates.push({
        key,
        mfr: entries[0].mfr,
        productId: entries[0].productId,
        drivers: driverIds
      });
    }
  }
  
  console.log(`Found ${trueDuplicates.length} TRUE duplicates (same mfr+productId in incompatible drivers)\n`);
  
  if (trueDuplicates.length === 0) {
    console.log('✅ No TRUE duplicates found! ManufacturerNames are correctly distributed.');
    console.log('   (Same mfr in multiple drivers is OK when productIds differ)');
    return;
  }
  
  // Report TRUE duplicates
  console.log('📋 TRUE DUPLICATES (need manual review):');
  console.log('─'.repeat(80));
  
  for (const dup of trueDuplicates) {
    console.log(`\n${dup.mfr} + ${dup.productId}`);
    console.log(`  → ${dup.drivers.join(', ')}`);
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    totalCombinations: comboMap.size,
    trueDuplicates: trueDuplicates.length,
    duplicates: trueDuplicates
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'true-duplicates-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  console.log('\n\n📊 Report saved to scripts/true-duplicates-report.json');
  console.log('\n⚠️  These TRUE duplicates need MANUAL review to determine correct driver.');
}

main();
