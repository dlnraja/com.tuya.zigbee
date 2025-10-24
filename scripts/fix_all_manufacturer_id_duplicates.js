#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION GLOBALE MANUFACTURER IDs DUPLICATES\n');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Mapper tous les drivers et leurs IDs
const allDrivers = new Map();
const duplicates = new Map();

console.log('📊 Phase 1: Analyse des drivers...\n');

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
  const stat = fs.statSync(path.join(DRIVERS_DIR, d));
  return stat.isDirectory() && !d.startsWith('.');
});

drivers.forEach(driverName => {
  const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
  
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      
      if (compose.zigbee) {
        const mfgNames = Array.isArray(compose.zigbee.manufacturerName) 
          ? compose.zigbee.manufacturerName 
          : (compose.zigbee.manufacturerName ? [compose.zigbee.manufacturerName] : []);
        
        const productIds = Array.isArray(compose.zigbee.productId)
          ? compose.zigbee.productId
          : (compose.zigbee.productId ? [compose.zigbee.productId] : []);
        
        allDrivers.set(driverName, {
          manufacturerName: mfgNames,
          productId: productIds,
          path: composePath
        });
      }
    } catch (err) {
      console.log(`⚠️  ${driverName}: Erreur lecture - ${err.message}`);
    }
  }
});

console.log(`   Trouvé: ${allDrivers.size} drivers avec manufacturer IDs\n`);

// Identifier les duplicates
console.log('🔍 Phase 2: Identification des duplicates...\n');

const idToDrivers = new Map();

allDrivers.forEach((data, driver) => {
  data.manufacturerName.forEach(mfg => {
    data.productId.forEach(pid => {
      const key = `${mfg}::${pid}`;
      if (!idToDrivers.has(key)) {
        idToDrivers.set(key, []);
      }
      idToDrivers.get(key).push(driver);
    });
  });
});

let totalDuplicates = 0;
idToDrivers.forEach((driverList, key) => {
  if (driverList.length > 1) {
    duplicates.set(key, driverList);
    totalDuplicates++;
  }
});

console.log(`   ❌ ${totalDuplicates} paires (mfg, product) dupliquées\n`);

// Identifier drivers avec trop d'IDs (suspects)
console.log('🚨 Phase 3: Drivers suspects (>20 manufacturer IDs)...\n');

const suspects = [];
allDrivers.forEach((data, driver) => {
  if (data.manufacturerName.length > 20) {
    suspects.push({
      name: driver,
      mfgCount: data.manufacturerName.length,
      pidCount: data.productId.length
    });
  }
});

suspects.sort((a, b) => b.mfgCount - a.mfgCount);

console.log(`   Trouvé: ${suspects.length} drivers suspects\n`);

suspects.forEach(s => {
  console.log(`   ❌ ${s.name}: ${s.mfgCount} mfg IDs, ${s.pidCount} product IDs`);
});

// CORRECTION MANUELLE pour les drivers problématiques connus
console.log('\n\n🔧 Phase 4: Correction des drivers identifiés...\n');

const CORRECTIONS = {
  'water_leak_sensor': {
    manufacturerName: [
      'lumi.sensor_wleak',
      'lumi.sensor_wleak.aq1',
      '_TZE200_qq9mpfhw',
      '_TZE200_c88teujp',
      '_TZ3000_upgcbody',
      '_TZ3000_26fmupbb'
    ],
    productId: ['TS0207', 'TS0203', 'q9mpfhw']
  },
  'water_leak_sensor_temp_humidity': {
    manufacturerName: [
      '_TZE200_qq9mpfhw',
      '_TZE200_81isopgh',
      '_TZ3000_upgcbody'
    ],
    productId: ['TS0601', 'q9mpfhw']
  }
};

let fixed = 0;

Object.entries(CORRECTIONS).forEach(([driverName, correctIds]) => {
  if (!allDrivers.has(driverName)) {
    console.log(`⚠️  ${driverName}: Non trouvé\n`);
    return;
  }
  
  const composePath = allDrivers.get(driverName).path;
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Backup
    const backupPath = composePath + '.backup-fix-all-ids.' + Date.now();
    fs.copyFileSync(composePath, backupPath);
    
    const before = {
      mfg: compose.zigbee.manufacturerName?.length || 0,
      pid: compose.zigbee.productId?.length || 0
    };
    
    // Appliquer corrections
    compose.zigbee.manufacturerName = correctIds.manufacturerName;
    compose.zigbee.productId = correctIds.productId;
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    
    console.log(`✅ ${driverName}`);
    console.log(`   Manufacturer IDs: ${before.mfg} → ${correctIds.manufacturerName.length}`);
    console.log(`   Product IDs: ${before.pid} → ${correctIds.productId.length}\n`);
    
    fixed++;
  } catch (err) {
    console.log(`❌ ${driverName}: ${err.message}\n`);
  }
});

console.log(`\n📊 RÉSUMÉ FINAL:\n`);
console.log(`   Drivers analysés: ${allDrivers.size}`);
console.log(`   Drivers suspects: ${suspects.length}`);
console.log(`   Paires dupliquées: ${totalDuplicates}`);
console.log(`   Drivers corrigés: ${fixed}\n`);

// Générer rapport des duplicates restants
if (suspects.length > fixed) {
  console.log('⚠️  ATTENTION: Drivers suspects restants à vérifier manuellement:\n');
  
  suspects.slice(0, 10).forEach(s => {
    if (!CORRECTIONS[s.name]) {
      console.log(`   ${s.name} (${s.mfgCount} mfg IDs)`);
    }
  });
  
  console.log('\n💡 Pour chaque driver suspect:');
  console.log('   1. Identifier le TYPE réel du device (category)');
  console.log('   2. Chercher manufacturer IDs authentiques (Zigbee2MQTT, Johan Bendz)');
  console.log('   3. Conserver uniquement les IDs pertinents');
  console.log('   4. Supprimer IDs génériques (GE, Samsung, IKEA si non pertinent)\n');
}

console.log('🎯 PROCHAINES ÉTAPES:');
console.log('   1. node scripts/audit_sdk3_complete.js (vérifier amélioration)');
console.log('   2. Corriger drivers suspects restants si nécessaire');
console.log('   3. homey app build');
console.log('   4. homey app validate --level publish\n');

process.exit(suspects.length > fixed ? 1 : 0);
