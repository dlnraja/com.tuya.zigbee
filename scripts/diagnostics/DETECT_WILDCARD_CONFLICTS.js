#!/usr/bin/env node

/**
 * 🔍 DÉTECTION CONFLITS WILDCARDS
 * 
 * Scanne TOUS les drivers pour détecter les wildcards en conflit
 * Ex: usb_outlet_2port vs switch_wall_2gang avaient les mêmes wildcards
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

// Wildcards connus problématiques
const PROBLEMATIC_WILDCARDS = [
  '_TZ3000_',
  '_TZ3040_',
  '_TZ3400_',
  '_TZE200_',
  '_TZE204_',
  '_TZE284_',
  '_TYZB01_',
  '_TYZB02_'
];

function isWildcard(id) {
  return PROBLEMATIC_WILDCARDS.includes(id) || 
         (id.length <= 10 && id.endsWith('_'));
}

function scanDrivers() {
  console.log('🔍 SCAN CONFLITS WILDCARDS\n');
  
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );
  
  const wildcardMap = new Map(); // wildcard -> [drivers]
  const driverData = new Map(); // driver -> {wildcards, completeIds}
  
  // Phase 1: Collecter tous les wildcards
  for (const driverId of drivers) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) continue;
    
    try {
      const driver = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const manufacturerIds = driver.zigbee?.manufacturerName || [];
      
      const wildcards = manufacturerIds.filter(id => isWildcard(id));
      const completeIds = manufacturerIds.filter(id => !isWildcard(id));
      
      driverData.set(driverId, { wildcards, completeIds, all: manufacturerIds });
      
      // Map wildcards
      for (const wildcard of wildcards) {
        if (!wildcardMap.has(wildcard)) {
          wildcardMap.set(wildcard, []);
        }
        wildcardMap.get(wildcard).push(driverId);
      }
      
    } catch (err) {
      console.error(`Error reading ${driverId}: ${err.message}`);
    }
  }
  
  // Phase 2: Détecter conflits
  console.log('📊 WILDCARDS EN CONFLIT:\n');
  
  const conflicts = [];
  
  for (const [wildcard, driversList] of wildcardMap.entries()) {
    if (driversList.length > 1) {
      conflicts.push({ wildcard, drivers: driversList });
      console.log(`🚨 ${wildcard}:`);
      driversList.forEach(d => {
        const data = driverData.get(d);
        console.log(`   - ${d} (${data.completeIds.length} complete IDs)`);
      });
      console.log();
    }
  }
  
  // Phase 3: Statistiques
  console.log('='.repeat(70));
  console.log('📈 STATISTIQUES:\n');
  
  let totalWildcards = 0;
  let driversWithWildcards = 0;
  
  for (const [driverId, data] of driverData.entries()) {
    if (data.wildcards.length > 0) {
      driversWithWildcards++;
      totalWildcards += data.wildcards.length;
    }
  }
  
  console.log(`Drivers scannés: ${drivers.length}`);
  console.log(`Drivers avec wildcards: ${driversWithWildcards}`);
  console.log(`Total wildcards: ${totalWildcards}`);
  console.log(`Wildcards en conflit: ${conflicts.length}`);
  console.log(`Paires de conflits: ${conflicts.reduce((sum, c) => sum + (c.drivers.length * (c.drivers.length - 1) / 2), 0)}`);
  
  // Phase 4: Recommandations
  if (conflicts.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('💡 RECOMMANDATIONS:\n');
    
    for (const conflict of conflicts) {
      console.log(`🔧 Wildcard: ${conflict.wildcard}`);
      console.log(`   Drivers affectés: ${conflict.drivers.join(', ')}`);
      console.log(`   Solution: Supprimer "${conflict.wildcard}" de TOUS ces drivers`);
      console.log(`   Impact: Évite pairing ambigu entre ces drivers`);
      console.log();
    }
  }
  
  // Phase 5: Top conflits critiques
  if (conflicts.length > 0) {
    console.log('='.repeat(70));
    console.log('⚠️  TOP CONFLITS CRITIQUES:\n');
    
    conflicts
      .sort((a, b) => b.drivers.length - a.drivers.length)
      .slice(0, 10)
      .forEach((conflict, i) => {
        console.log(`${i + 1}. ${conflict.wildcard}: ${conflict.drivers.length} drivers`);
      });
  }
  
  return conflicts;
}

// Exécution
try {
  const conflicts = scanDrivers();
  
  if (conflicts.length > 0) {
    console.log('\n⚠️  Des conflits de wildcards ont été détectés!');
    console.log('Utilisez REMOVE_ALL_WILDCARDS.js pour les corriger.');
    process.exit(1);
  } else {
    console.log('\n✅ Aucun conflit de wildcard détecté!');
    process.exit(0);
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
