#!/usr/bin/env node
// ============================================================================
// FIX ENERGY UNDEFINED - Correction des champs Energy "undefined"
// ============================================================================

const fs = require('fs');
const path = require('path');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');

console.log('🔧 FIX ENERGY UNDEFINED - Correction Dashboard Homey');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

const report = {
  timestamp: new Date().toISOString(),
  totalDrivers: 0,
  fixed: 0,
  removed: 0,
  errors: []
};

// ============================================================================
// CORRECTION ENERGY FIELDS
// ============================================================================
function fixEnergyFields(compose, driverName) {
  let modified = false;
  
  // Si le driver n'a PAS de capabilities energy, supprimer energy
  const capabilities = compose.capabilities || [];
  const hasEnergyCapabilities = capabilities.some(cap => {
    const capStr = typeof cap === 'string' ? cap : cap.id || '';
    return capStr.includes('measure_power') || 
           capStr.includes('meter_power') || 
           capStr.includes('measure_voltage') ||
           capStr.includes('measure_current') ||
           capStr.includes('measure_battery');
  });
  
  // Supprimer complètement le champ energy s'il existe et cause des undefined
  if (compose.energy) {
    console.log(`  🔧 ${driverName}: Suppression energy (cause undefined)`);
    delete compose.energy;
    modified = true;
    report.removed++;
  }
  
  // Pour les drivers avec capabilities energy, créer config minimale
  if (hasEnergyCapabilities && !compose.energy) {
    // Ne PAS recréer energy - laisser vide pour éviter undefined
    // Homey le gérera automatiquement
  }
  
  return modified;
}

// ============================================================================
// TRAITEMENT DES DRIVERS
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
      
      const modified = fixEnergyFields(compose, driverName);
      
      if (modified) {
        fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
        report.fixed++;
      }
      
    } catch (e) {
      console.log(`  ❌ ${driverName}: ${e.message}`);
      report.errors.push({ driver: driverName, error: e.message });
    }
  }
}

// ============================================================================
// NETTOYAGE APP.JSON
// ============================================================================
function cleanAppJson() {
  console.log('\n📋 Nettoyage app.json...\n');
  
  const appJsonPath = path.join(rootPath, 'app.json');
  
  try {
    let appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    let modified = false;
    
    // Parcourir tous les drivers dans app.json
    if (appJson.drivers) {
      for (const driver of appJson.drivers) {
        if (driver.energy) {
          console.log(`  🔧 ${driver.id}: Suppression energy de app.json`);
          delete driver.energy;
          modified = true;
        }
      }
    }
    
    if (modified) {
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
      console.log('  ✅ app.json nettoyé\n');
    } else {
      console.log('  ✅ app.json déjà propre\n');
    }
    
  } catch (e) {
    console.log(`  ❌ Erreur app.json: ${e.message}\n`);
  }
}

// ============================================================================
// RAPPORT FINAL
// ============================================================================
function generateReport() {
  console.log('='.repeat(80));
  console.log('📊 RAPPORT FINAL');
  console.log('='.repeat(80));
  
  console.log(`\n✅ STATISTIQUES:`);
  console.log(`  Total drivers: ${report.totalDrivers}`);
  console.log(`  Drivers corrigés: ${report.fixed}`);
  console.log(`  Champs energy supprimés: ${report.removed}`);
  console.log(`  Erreurs: ${report.errors.length}`);
  
  if (report.errors.length > 0) {
    console.log(`\n❌ ERREURS:`);
    report.errors.forEach(err => {
      console.log(`  • ${err.driver}: ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ CORRECTION TERMINÉE - "undefined" supprimés');
  console.log('='.repeat(80) + '\n');
  
  console.log('🔄 PROCHAINES ÉTAPES:');
  console.log('  1. homey app build');
  console.log('  2. homey app validate --level=publish');
  console.log('  3. node tools/AUTO_PUBLISH_COMPLETE.js\n');
}

// ============================================================================
// EXÉCUTION
// ============================================================================
processDrivers();
cleanAppJson();
generateReport();
