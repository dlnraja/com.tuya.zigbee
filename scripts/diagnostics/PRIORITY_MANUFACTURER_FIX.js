#!/usr/bin/env node

/**
 * 🏆 PRIORITY MANUFACTURER IDs - FORUM USERS FIRST
 * 
 * Met les manufacturer IDs des utilisateurs du forum EN PREMIER dans chaque driver
 * Ceci garantit que leurs devices pairent en priorité avec le bon driver
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// 🏆 MANUFACTURER IDs du FORUM - PRIORITÉ ABSOLUE
const FORUM_PRIORITY_IDS = {
  // ⭐ Peter van Werkhoven (Forum #492) - HAUTE PRIORITÉ
  motion_sensor_multi: [
    '_TZ3000_mmtwjmaq',  // ⭐ Peter's actual device
    '_TZ3000_kmh5qpmb',  // ⭐ Peter's second device
    '_TZ3000_mcxw5ehu',
    '_TZ3000_msl6wxk9',
    '_TZ3040_bb6xaihh',
    '_TZE200_3towulqd'
  ],
  
  button_emergency_sos: [
    '_TZ3000_26fmupbb',  // ⭐ Peter's SOS button
    '_TZ3000_4uuaja4a',
    '_TZ3000_8rppvwda',
    '_TZ3000_a7ouggvs',
    '_TZ3000_mmtwjmaq',
    '_TZ3000_kmh5qpmb'
  ],
  
  // Motion sensors - Common forum reports
  motion_sensor: [
    '_TZ3000_mmtwjmaq',
    '_TZ3000_kmh5qpmb',
    '_TZE200_3towulqd',
    '_TZ3000_msl6wxk9'
  ],
  
  motion_sensor_pir: [
    '_TZ3000_mmtwjmaq',
    '_TZ3000_kmh5qpmb',
    '_TZE200_3towulqd'
  ],
  
  // Plugs - Most reported
  plug_smart: [
    'TS011F',           // Most common
    '_TZ3000_g5xawfcq',
    '_TZ3000_cehuw1lw',
    '_TZ3000_plyvnuf5'
  ],
  
  plug_energy_monitor: [
    'TS011F',
    '_TZ3000_g5xawfcq'
  ],
  
  // Switches - Forum favorites
  switch_wall_1gang: [
    'TS0001',
    '_TZ3000_qzjcsmar',
    '_TZ3000_ji4araar',
    '_TZ3000_zmy1waw6'
  ],
  
  switch_wall_2gang: [
    'TS0011',
    '_TZ3000_qzjcsmar',
    '_TZ3000_ji4araar'
  ],
  
  switch_wall_3gang: [
    'TS0013',
    '_TZ3000_qzjcsmar',
    '_TZ3000_ji4araar'
  ],
  
  // Contact sensors
  contact_sensor: [
    'TS0203',
    '_TZ3000_26fmupbb',
    '_TZ3000_n2egfsli',
    '_TZ3000_402jjyro'
  ],
  
  contact_sensor_basic: [
    'TS0203',
    '_TZ3000_26fmupbb'
  ],
  
  // Buttons - Forum users
  button_wireless_1: [
    '_TZ3000_26fmupbb',
    '_TZ3000_qzjcsmar'
  ],
  
  button_wireless_2: [
    '_TZ3000_26fmupbb',
    '_TZ3000_qzjcsmar'
  ],
  
  // Climate sensors
  climate_monitor_temp_humidity: [
    'TS0201',
    '_TZ3000_fllyghyj',
    '_TZE200_bjawzodf'
  ],
  
  // Water sensors
  water_leak_sensor: [
    '_TZ3000_kyb656no',
    '_TZE200_qq9mpfhw'
  ]
};

function prioritizeManufacturerIDs() {
  console.log('🏆 PRIORITIZING FORUM MANUFACTURER IDs\n');
  console.log('Placing forum users\' devices FIRST in driver lists...\n');
  
  let fixed = 0;
  let total = 0;
  
  for (const [driverId, priorityIds] of Object.entries(FORUM_PRIORITY_IDS)) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
      console.log(`⚠️  Driver not found: ${driverId}`);
      continue;
    }
    
    total++;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (!driver.zigbee || !driver.zigbee.manufacturerName) {
        console.log(`⚠️  No manufacturer IDs in ${driverId}`);
        continue;
      }
      
      const currentIds = driver.zigbee.manufacturerName;
      const originalOrder = [...currentIds];
      
      // Séparer les IDs prioritaires et les autres
      const otherIds = currentIds.filter(id => !priorityIds.includes(id));
      
      // Construire nouvelle liste: prioritaires EN PREMIER, puis autres
      const newIds = [...priorityIds, ...otherIds];
      
      // Vérifier si l'ordre a changé
      const changed = JSON.stringify(originalOrder) !== JSON.stringify(newIds);
      
      if (changed) {
        driver.zigbee.manufacturerName = newIds;
        fs.writeFileSync(composePath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
        console.log(`✅ ${driverId}: ${priorityIds.length} forum IDs → TOP`);
        fixed++;
      } else {
        console.log(`✓  ${driverId}: Already prioritized`);
      }
      
    } catch (err) {
      console.log(`❌ Error processing ${driverId}: ${err.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RÉSULTAT:`);
  console.log(`  Drivers vérifiés: ${total}`);
  console.log(`  Drivers modifiés: ${fixed}`);
  console.log(`  Forum IDs prioritaires: ${Object.keys(FORUM_PRIORITY_IDS).length} drivers`);
  console.log('='.repeat(60));
  console.log('\n✅ Forum users\' devices will now pair FIRST!');
}

// Exécution
try {
  prioritizeManufacturerIDs();
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
