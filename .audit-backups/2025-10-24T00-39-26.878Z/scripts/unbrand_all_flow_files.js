#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 UNBRANDING - TOUS LES FICHIERS FLOW\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d => 
  fs.statSync(path.join(driversDir, d)).isDirectory() && 
  !d.startsWith('.')
);

const BRAND_PREFIXES = [
  'avatto_', 'zemismart_', 'lsc_', 'philips_', 'innr_',
  'moes_', 'nous_', 'samsung_', 'sonoff_', 'tuya_', 
  'osram_', 'lonsonho_', 'lidl_'
];

let stats = {
  filesProcessed: 0,
  filesModified: 0,
  flowCardsUpdated: 0
};

console.log(`📁 Analyse de ${drivers.length} drivers...\n`);

drivers.forEach(driverName => {
  const flowComposePath = path.join(driversDir, driverName, 'driver.flow.compose.json');
  
  if (!fs.existsSync(flowComposePath)) {
    return; // Pas de flow cards pour ce driver
  }
  
  stats.filesProcessed++;
  
  try {
    const flowCompose = JSON.parse(fs.readFileSync(flowComposePath, 'utf8'));
    let modified = false;
    let updatedCount = 0;
    
    // Fonction pour nettoyer les IDs
    function cleanId(id) {
      if (!id) return id;
      let cleaned = id;
      BRAND_PREFIXES.forEach(prefix => {
        cleaned = cleaned.replace(new RegExp(prefix, 'g'), '');
      });
      return cleaned;
    }
    
    // Nettoyer triggers
    if (flowCompose.triggers) {
      flowCompose.triggers.forEach(trigger => {
        const originalId = trigger.id;
        trigger.id = cleanId(trigger.id);
        if (originalId !== trigger.id) {
          modified = true;
          updatedCount++;
        }
      });
    }
    
    // Nettoyer conditions
    if (flowCompose.conditions) {
      flowCompose.conditions.forEach(condition => {
        const originalId = condition.id;
        condition.id = cleanId(condition.id);
        if (originalId !== condition.id) {
          modified = true;
          updatedCount++;
        }
      });
    }
    
    // Nettoyer actions
    if (flowCompose.actions) {
      flowCompose.actions.forEach(action => {
        const originalId = action.id;
        action.id = cleanId(action.id);
        if (originalId !== action.id) {
          modified = true;
          updatedCount++;
        }
      });
    }
    
    if (modified) {
      // Backup
      const backupPath = flowComposePath + '.backup.' + Date.now();
      fs.copyFileSync(flowComposePath, backupPath);
      
      // Sauvegarder
      fs.writeFileSync(flowComposePath, JSON.stringify(flowCompose, null, 2), 'utf8');
      
      stats.filesModified++;
      stats.flowCardsUpdated += updatedCount;
      
      console.log(`✅ ${driverName}: ${updatedCount} flow cards nettoyées`);
    }
    
  } catch (err) {
    console.log(`❌ ${driverName}: Erreur - ${err.message}`);
  }
});

console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(70));
console.log(`\n✅ STATISTIQUES:`);
console.log(`   Fichiers analysés: ${stats.filesProcessed}`);
console.log(`   Fichiers modifiés: ${stats.filesModified}`);
console.log(`   Flow cards nettoyées: ${stats.flowCardsUpdated}`);

if (stats.filesModified > 0) {
  console.log(`\n💡 PROCHAINES ÉTAPES:`);
  console.log(`   1. homey app build`);
  console.log(`   2. homey app validate --level publish`);
  console.log(`   3. git add drivers/`);
  console.log(`   4. git commit -m "fix: remove brand prefixes from all driver flow cards"`);
}
