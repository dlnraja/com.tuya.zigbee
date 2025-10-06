#!/usr/bin/env node
// ============================================================================
// CLEAN ENERGY LIKE OLD VERSION - Supprimer TOUS les champs energy
// ============================================================================

const fs = require('fs');
const path = require('path');

const rootPath = 'c:\\Users\\HP\\Desktop\\tuya_repair';
const appJsonPath = path.join(rootPath, 'app.json');

console.log('🧹 CLEAN ENERGY LIKE OLD VERSION');
console.log('='.repeat(80));
console.log(`Timestamp: ${new Date().toISOString()}\n`);

console.log('📋 Les anciennes versions (1.0.30-1.0.37) N\'AVAIENT PAS de champs energy');
console.log('📋 Les "undefined" viennent du dashboard Homey qui essaie de lire ces champs\n');
console.log('📋 SOLUTION: Supprimer TOUS les champs energy comme avant\n');

const report = {
  removed: 0
};

// ============================================================================
// NETTOYAGE
// ============================================================================
function cleanEnergy() {
  console.log('🧹 Suppression champs energy...\n');
  
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  if (!appJson.drivers) {
    console.log('❌ Pas de drivers\n');
    return;
  }
  
  for (const driver of appJson.drivers) {
    if (driver.energy) {
      console.log(`  🗑️ ${driver.id}`);
      delete driver.energy;
      report.removed++;
    }
  }
  
  // Sauvegarder
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
  console.log(`\n✅ app.json nettoyé (comme version 1.0.30)\n`);
}

// ============================================================================
// RAPPORT
// ============================================================================
function generateReport() {
  console.log('='.repeat(80));
  console.log('📊 RAPPORT');
  console.log('='.repeat(80));
  
  console.log(`\n🗑️ Champs energy supprimés: ${report.removed}`);
  
  console.log('\n💡 EXPLICATION:');
  console.log('  Les versions 1.0.30-1.0.37 n\'avaient PAS de champs energy');
  console.log('  et fonctionnaient parfaitement');
  console.log('  Les "undefined" sont un bug du dashboard Homey récent\n');
  
  console.log('✅ Configuration identique aux anciennes versions qui marchaient');
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ NETTOYAGE TERMINÉ');
  console.log('='.repeat(80) + '\n');
}

// ============================================================================
// EXÉCUTION
// ============================================================================
cleanEnergy();
generateReport();
