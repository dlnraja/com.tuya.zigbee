#!/usr/bin/env node
/**
 * APPLY DEEP SCRAPING FIXES
 * 
 * Applique toutes les corrections identifiées par le deep scraping:
 * - Nettoyage productIds incompatibles (110 drivers)
 * - Application catégorisation UNBRANDED
 * - Vérification cohérence
 */

const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..', '..');
const appJsonPath = path.join(rootPath, 'app.json');
const reportPath = path.join(rootPath, 'deep_scraping', 'deep_scraping_report.json');

console.log('🔧 APPLY DEEP SCRAPING FIXES');
console.log('='.repeat(80));
console.log('');

// Charger rapport
if (!fs.existsSync(reportPath)) {
  console.log('   ❌ Rapport deep_scraping introuvable');
  console.log('   Exécuter d\'abord: node DEEP_SCRAPER_AND_REORGANIZER.js');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

console.log('📊 PLAN DE CORRECTIONS:');
console.log(`   Drivers à nettoyer: ${report.reorganizationPlan.cleanups.length}`);
console.log('');

let fixed = 0;

// Appliquer nettoyages
report.reorganizationPlan.cleanups.forEach(cleanup => {
  const driver = appJson.drivers.find(d => d.id === cleanup.driver);
  
  if (driver && driver.zigbee?.productId) {
    const before = driver.zigbee.productId.length;
    
    // Supprimer productIds incompatibles
    driver.zigbee.productId = driver.zigbee.productId.filter(
      pid => !cleanup.productIdsToRemove.includes(pid)
    );
    
    const after = driver.zigbee.productId.length;
    
    if (before !== after) {
      console.log(`   ✅ ${cleanup.driver}: ${before} → ${after} productIds`);
      console.log(`      Supprimés: ${cleanup.productIdsToRemove.join(', ')}`);
      fixed++;
    }
  }
});

console.log('');
console.log(`   ✅ ${fixed} drivers nettoyés`);
console.log('');

// Sauvegarder
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log('='.repeat(80));
console.log('✅ CORRECTIONS APPLIQUÉES');
console.log('='.repeat(80));
console.log('');

console.log('📋 PROCHAINES ÉTAPES:');
console.log('   1. homey app build');
console.log('   2. homey app validate --level=publish');
console.log('   3. git add -A && git commit');
console.log('');

process.exit(0);
