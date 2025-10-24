#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION MANUFACTURER IDs - WATER VALVE DRIVERS\n');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Définition des VRAIS manufacturer IDs pour water valves
const WATER_VALVE_IDS = {
  manufacturerName: [
    'lumi.sensor_wleak',
    'lumi.sensor_wleak.aq1',
    '_TZE200_qq9mpfhw',  // Tuya water leak sensor
    '_TZE200_c88teujp',  // Tuya water leak sensor  
    '_TZE200_jthf7vb6',  // Tuya water valve
    '_TZ3000_kdi2o9m6'   // Tuya water valve
  ],
  productId: [
    'TS0601',  // Tuya water valve/leak sensor
    'q9mpfhw'  // Model number
  ]
};

const WATER_VALVE_SMART_IDS = {
  manufacturerName: [
    'lumi.sensor_wleak',
    'lumi.sensor_wleak.aq1',
    '_TZE200_qq9mpfhw',
    '_TZE200_c88teujp',
    '_TZE200_jthf7vb6',
    '_TZ3000_kdi2o9m6',
    '_TZE200_81isopgh'
  ],
  productId: [
    'TS0601',
    'q9mpfhw'
  ]
};

const WATER_VALVE_SMART_HYBRID_IDS = {
  manufacturerName: [
    '_TZE200_jthf7vb6',  // Hybrid water valve (battery + AC)
    '_TZE200_81isopgh',
    '_TZ3000_kdi2o9m6'
  ],
  productId: [
    'TS0601',
    'q9mpfhw'
  ]
};

const DRIVERS_TO_FIX = [
  {
    name: 'water_valve',
    ids: WATER_VALVE_IDS
  },
  {
    name: 'water_valve_smart',
    ids: WATER_VALVE_SMART_IDS
  },
  {
    name: 'water_valve_smart_hybrid',
    ids: WATER_VALVE_SMART_HYBRID_IDS
  }
];

let totalFixed = 0;

DRIVERS_TO_FIX.forEach(driver => {
  const composePath = path.join(DRIVERS_DIR, driver.name, 'driver.compose.json');
  
  if (!fs.existsSync(composePath)) {
    console.log(`⚠️  ${driver.name}: driver.compose.json non trouvé\n`);
    return;
  }
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Backup
    const backupPath = composePath + '.backup-fix-ids.' + Date.now();
    fs.copyFileSync(composePath, backupPath);
    
    // Compter avant
    const beforeMfg = compose.zigbee?.manufacturerName?.length || 0;
    const beforePid = compose.zigbee?.productId?.length || 0;
    
    // Remplacer
    if (compose.zigbee) {
      compose.zigbee.manufacturerName = driver.ids.manufacturerName;
      compose.zigbee.productId = driver.ids.productId;
    }
    
    // Compter après
    const afterMfg = driver.ids.manufacturerName.length;
    const afterPid = driver.ids.productId.length;
    
    // Sauvegarder
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    
    console.log(`✅ ${driver.name}`);
    console.log(`   Manufacturer IDs: ${beforeMfg} → ${afterMfg}`);
    console.log(`   Product IDs: ${beforePid} → ${afterPid}`);
    console.log(`   Backup: ${path.basename(backupPath)}\n`);
    
    totalFixed++;
    
  } catch (err) {
    console.log(`❌ ${driver.name}: Erreur - ${err.message}\n`);
  }
});

console.log(`📊 RÉSULTAT: ${totalFixed}/${DRIVERS_TO_FIX.length} drivers corrigés\n`);

console.log('💡 MANUFACTURER IDs CONSERVÉS:\n');

console.log('water_valve (leak sensor):');
WATER_VALVE_IDS.manufacturerName.forEach(id => console.log(`   - ${id}`));
console.log();

console.log('water_valve_smart (advanced leak sensor):');
WATER_VALVE_SMART_IDS.manufacturerName.forEach(id => console.log(`   - ${id}`));
console.log();

console.log('water_valve_smart_hybrid (battery + AC valve):');
WATER_VALVE_SMART_HYBRID_IDS.manufacturerName.forEach(id => console.log(`   - ${id}`));
console.log();

console.log('🎯 PROCHAINES ÉTAPES:');
console.log('   1. homey app build');
console.log('   2. node scripts/audit_sdk3_complete.js (vérifier 0 duplicates)');
console.log('   3. homey app validate --level publish');
console.log('   4. Re-pair les water valves si nécessaire\n');
