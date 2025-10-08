#!/usr/bin/env node
// ============================================================================
// FIX ENERGY IN APP.JSON - Ajouter energy.batteries directement dans app.json
// ============================================================================

const fs = require('fs');
const path = require('path');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const driversPath = path.join(rootPath, 'drivers');
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🔋 FIX ENERGY IN APP.JSON');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

const report = {
  timestamp: new Date().toISOString(),
  fixed: 0,
  errors: []
};

// ============================================================================
// DÉTECTION TYPE BATTERIE
// ============================================================================
function detectBatteryType(driverName) {
  const nameLower = driverName.toLowerCase();
  
  if (nameLower.includes('cr2032')) return ['CR2032'];
  if (nameLower.includes('cr2450')) return ['CR2450'];
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
  
  return ['CR2032', 'AAA'];
}

// ============================================================================
// CORRECTION APP.JSON
// ============================================================================
function fixAppJson() {
  console.log('📋 Lecture app.json...\n');
  
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  if (!appJson.drivers) {
    console.log('❌ Pas de drivers dans app.json\n');
    return;
  }
  
  for (const driver of appJson.drivers) {
    const driverId = driver.id;
    
    // Vérifier si measure_battery présent
    const capabilities = driver.capabilities || [];
    const hasBattery = capabilities.some(cap => {
      const capStr = typeof cap === 'string' ? cap : cap.id || '';
      return capStr === 'measure_battery' || capStr.startsWith('measure_battery.');
    });
    
    if (hasBattery) {
      // Ajouter energy.batteries
      if (!driver.energy) {
        driver.energy = {};
      }
      
      if (!driver.energy.batteries || driver.energy.batteries.length === 0) {
        const batteries = detectBatteryType(driverId);
        driver.energy.batteries = batteries;
        console.log(`  🔋 ${driverId}: [${batteries.join(', ')}]`);
        report.fixed++;
      }
    } else {
      // Supprimer energy si pas de battery
      if (driver.energy) {
        delete driver.energy;
      }
    }
  }
  
  // Sauvegarder
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log(`\n✅ app.json mis à jour\n`);
}

// ============================================================================
// RAPPORT
// ============================================================================
function generateReport() {
  console.log('='.repeat(80));
  console.log('📊 RAPPORT FINAL');
  console.log('='.repeat(80));
  
  console.log(`\n✅ Batteries configurées: ${report.fixed}`);
  console.log(`❌ Erreurs: ${report.errors.length}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ APP.JSON CORRIGÉ');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// EXÉCUTION
// ============================================================================
fixAppJson();
generateReport();
