#!/usr/bin/env node
// ============================================================================
// FIX BATTERY ENERGY - Ajout energy.batteries pour measure_battery
// ============================================================================

const fs = require('fs');
const path = require('path');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

console.log('🔋 FIX BATTERY ENERGY - Ajout energy.batteries');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

const report = {
  timestamp: new Date().toISOString(),
  totalDrivers: 0,
  fixed: 0,
  skipped: 0,
  errors: []
};

// Batteries communes par type de device
const BATTERY_TYPES = {
  'CR2032': ['button', 'switch', 'remote', 'wireless'],
  'CR2450': ['switch', 'button', 'remote'],
  'AAA': ['sensor', 'detector', 'contact', 'motion'],
  'AA': ['sensor', 'detector', 'lock', 'valve'],
  'INTERNAL': ['smart', 'advanced', 'pro']
};

// ============================================================================
// DÉTECTION TYPE BATTERIE
// ============================================================================
function detectBatteryType(driverName) {
  const nameLower = driverName.toLowerCase();
  
  // Détection explicite dans le nom
  if (nameLower.includes('cr2032')) return ['CR2032'];
  if (nameLower.includes('cr2450')) return ['CR2450'];
  if (nameLower.includes('cr2')) return ['CR2032'];
  
  // Par type de device
  if (nameLower.includes('button') || nameLower.includes('wireless') || nameLower.includes('remote')) {
    return ['CR2032'];
  }
  if (nameLower.includes('motion') || nameLower.includes('pir') || nameLower.includes('contact')) {
    return ['AAA', 'CR2032'];
  }
  if (nameLower.includes('sensor') || nameLower.includes('detector')) {
    return ['AAA', 'CR2032'];
  }
  if (nameLower.includes('lock') || nameLower.includes('valve')) {
    return ['AA'];
  }
  if (nameLower.includes('smart') || nameLower.includes('pro') || nameLower.includes('advanced')) {
    return ['INTERNAL'];
  }
  
  // Défaut
  return ['CR2032', 'AAA'];
}

// ============================================================================
// CORRECTION DRIVERS
// ============================================================================
function processDrivers() {
  console.log('📋 Traitement des drivers...\n');
  
  const drivers = fs.readdirSync(driversPath)
    .filter(d => fs.statSync(path.join(driversPath, d)).isDirectory());
  
  report.totalDrivers = drivers.length;
  
  for (const driverName of drivers) {
    const composeFile = path.join(driversPath, driverName, 'driver.compose.json');
    
    if (!fs.existsSync(composeFile)) continue;
    
    try {
      let compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      let modified = false;
      
      // Vérifier si measure_battery présent
      const capabilities = compose.capabilities || [];
      const hasBatteryCapability = capabilities.some(cap => {
        const capStr = typeof cap === 'string' ? cap : cap.id || '';
        return capStr === 'measure_battery' || capStr.startsWith('measure_battery.');
      });
      
      if (hasBatteryCapability) {
        // Ajouter ou corriger energy.batteries
        if (!compose.energy) {
          compose.energy = {};
        }
        
        if (!compose.energy.batteries || compose.energy.batteries.length === 0) {
          const batteries = detectBatteryType(driverName);
          compose.energy.batteries = batteries;
          console.log(`  🔋 ${driverName}: Ajout batteries [${batteries.join(', ')}]`);
          modified = true;
          report.fixed++;
        } else {
          report.skipped++;
        }
      }
      
      if (modified) {
        fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
      }
      
    } catch (e) {
      console.log(`  ❌ ${driverName}: ${e.message}`);
      report.errors.push({ driver: driverName, error: e.message });
    }
  }
}

// ============================================================================
// RAPPORT FINAL
// ============================================================================
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RAPPORT FINAL');
  console.log('='.repeat(80));
  
  console.log(`\n✅ STATISTIQUES:`);
  console.log(`  Total drivers: ${report.totalDrivers}`);
  console.log(`  Batteries ajoutées: ${report.fixed}`);
  console.log(`  Déjà configurés: ${report.skipped}`);
  console.log(`  Erreurs: ${report.errors.length}`);
  
  if (report.errors.length > 0) {
    console.log(`\n❌ ERREURS:`);
    report.errors.forEach(err => {
      console.log(`  • ${err.driver}: ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ BATTERIES CONFIGURÉES');
  console.log('='.repeat(80) + '\n');
  
  console.log('🔄 PROCHAINES ÉTAPES:');
  console.log('  1. homey app build');
  console.log('  2. homey app validate --level=publish');
  console.log('  3. Commit + Publish\n');
}

// ============================================================================
// EXÉCUTION
// ============================================================================
processDrivers();
generateReport();
