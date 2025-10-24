#!/usr/bin/env node
/**
 * SDK3 COMPLIANCE FIX
 * Retire alarm_battery de tous les driver.compose.json
 * alarm_battery n'est plus supporté dans Homey SDK3
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_PATH = path.join(__dirname, '..', 'drivers');

let fixed = 0;
let errors = 0;
let skipped = 0;

function fixDriverCompose(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Vérifier si alarm_battery existe
    if (!content.includes('"alarm_battery"')) {
      skipped++;
      return false;
    }

    console.log(`\n🔧 Correction: ${path.basename(path.dirname(filePath))}`);
    
    let fixedContent = content;
    
    // Pattern 1: ",\n    \"alarm_battery\""
    fixedContent = String(fixedContent).replace(/,\s*\n\s*"alarm_battery"/g, '');
    
    // Pattern 2: "alarm_battery",
    fixedContent = String(fixedContent).replace(/"alarm_battery",\s*\n/g, '');
    
    // Pattern 3: Dernier élément avant ]
    fixedContent = String(fixedContent).replace(/,\s*"alarm_battery"\s*\]/g, ']');
    fixedContent = String(fixedContent).replace(/\[\s*"alarm_battery"\s*\]/g, '[]');
    
    // Vérifier si changement effectué
    if (fixedContent === content) {
      console.log('  ⚠️  Aucun changement détecté');
      return false;
    }
    
    // Sauvegarder
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    fixed++;
    console.log('  ✅ Corrigé');
    return true;
    
  } catch (err) {
    console.error(`  ❌ Erreur: ${err.message}`);
    errors++;
    return false;
  }
}

function scanDrivers() {
  console.log('🔍 Recherche des drivers avec alarm_battery...\n');
  
  const drivers = fs.readdirSync(DRIVERS_PATH);
  
  drivers.forEach(driverName => {
    const driverPath = path.join(DRIVERS_PATH, driverName);
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (fs.existsSync(composePath)) {
      fixDriverCompose(composePath);
    }
  });
}

// Exécution
console.log('═══════════════════════════════════════════════════');
console.log('  SDK3 COMPLIANCE - alarm_battery REMOVAL');
console.log('═══════════════════════════════════════════════════\n');

scanDrivers();

console.log('\n═══════════════════════════════════════════════════');
console.log('  RÉSUMÉ:');
console.log(`  ✅ Fichiers corrigés: ${fixed}`);
console.log(`  ⏭️  Fichiers ignorés: ${skipped}`);
console.log(`  ❌ Erreurs: ${errors}`);
console.log('═══════════════════════════════════════════════════\n');

if (fixed > 0) {
  console.log('✅ alarm_battery retiré avec succès de tous les drivers\n');
}

process.exit(errors > 0 ? 1 : 0);
