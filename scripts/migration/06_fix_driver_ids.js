#!/usr/bin/env node

/**
 * FIX DRIVER IDS - Correction des ID mismatch
 * Synchronise les IDs dans driver.compose.json avec les noms de dossiers
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', '..', 'drivers');

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🔧 FIX DRIVER IDS - Correction ID Mismatch                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

const errors = [
  'energy_monitoring_plug_advanced_ac',
  'energy_plug_advanced_ac',
  'mini_switch_cr2032',
  'motion_sensor_mmwave_battery',
  'motion_sensor_pir_ac_battery',
  'motion_sensor_zigbee_204z_battery',
  'power_meter_socket_ac',
  'radar_motion_sensor_advanced_battery',
  'radar_motion_sensor_mmwave_battery',
  'radar_motion_sensor_tank_level_battery',
  'remote_switch_cr2032',
  'roller_shutter_switch_cr2032',
  'smart_plug_ac',
  'smart_plug_energy_ac',
  'wireless_switch_cr2032'
];

let fixed = 0;
let notFound = 0;

for (const driverFolder of errors) {
  const driverPath = path.join(driversDir, driverFolder);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  ${driverFolder}: driver.compose.json not found`);
    notFound++;
    continue;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    const oldId = compose.id;
    compose.id = driverFolder;
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    console.log(`✅ ${driverFolder}: ${oldId} → ${driverFolder}`);
    fixed++;
    
  } catch (err) {
    console.error(`❌ ${driverFolder}: ${err.message}`);
  }
}

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    CORRECTION TERMINÉE                        ║
╚═══════════════════════════════════════════════════════════════╝

✅ Corrigés: ${fixed}
⚠️  Non trouvés: ${notFound}

Relancer validation: node scripts/migration/05_validate.js
`);
