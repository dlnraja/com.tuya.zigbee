#!/usr/bin/env node

/**
 * PHASE 6: FIX VALIDATION ERRORS
 * Corrige les 16 erreurs d'ID mismatch
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔧 PHASE 6: FIX VALIDATION ERRORS\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

// Liste des drivers avec ID mismatch à corriger
const fixList = [
  { folder: 'energy_monitoring_plug_advanced_ac', correctId: 'energy_monitoring_plug_advanced_ac' },
  { folder: 'energy_plug_advanced_ac', correctId: 'energy_plug_advanced_ac' },
  { folder: 'mini_switch_cr2032', correctId: 'mini_switch_cr2032' },
  { folder: 'motion_sensor_mmwave_battery', correctId: 'motion_sensor_mmwave_battery' },
  { folder: 'motion_sensor_pir_ac_battery', correctId: 'motion_sensor_pir_ac_battery' },
  { folder: 'motion_sensor_zigbee_204z_battery', correctId: 'motion_sensor_zigbee_204z_battery' },
  { folder: 'power_meter_socket_ac', correctId: 'power_meter_socket_ac' },
  { folder: 'radar_motion_sensor_advanced_battery', correctId: 'radar_motion_sensor_advanced_battery' },
  { folder: 'radar_motion_sensor_mmwave_battery', correctId: 'radar_motion_sensor_mmwave_battery' },
  { folder: 'radar_motion_sensor_tank_level_battery', correctId: 'radar_motion_sensor_tank_level_battery' },
  { folder: 'remote_switch_cr2032', correctId: 'remote_switch_cr2032' },
  { folder: 'roller_shutter_switch_cr2032', correctId: 'roller_shutter_switch_cr2032' },
  { folder: 'smart_plug_ac', correctId: 'smart_plug_ac' },
  { folder: 'smart_plug_energy_ac', correctId: 'smart_plug_energy_ac' },
  { folder: 'wireless_switch_cr2032', correctId: 'wireless_switch_cr2032' }
];

let fixed = 0;
let errors = 0;

for (const item of fixList) {
  const driverPath = path.join(driversDir, item.folder);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⏭️  Skip: ${item.folder} (not found)`);
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Fix ID
    if (compose.id !== item.correctId) {
      compose.id = item.correctId;
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
      console.log(`✅ Fixed: ${item.folder} → ID: ${item.correctId}`);
      fixed++;
    } else {
      console.log(`⏭️  Skip: ${item.folder} (already correct)`);
    }
  } catch (err) {
    console.error(`❌ Error: ${item.folder} - ${err.message}`);
    errors++;
  }
}

console.log(`\n✅ PHASE 6 TERMINÉE`);
console.log(`Fixed: ${fixed}`);
console.log(`Errors: ${errors}\n`);
