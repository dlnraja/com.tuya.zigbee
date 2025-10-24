#!/usr/bin/env node

/**
 * UNBRANDED_RENAME_AND_ENERGY_FIX.js
 * 
 * Objectifs:
 * 1. Mode UNBRANDED - Renommer drivers génériquement (pas de marques)
 * 2. Corriger energy.batteries selon standards Homey
 * 3. Cohérence nombre de boutons avec energy
 * 4. Noms de dossiers homogènes
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 UNBRANDED RENAME & ENERGY FIX\n');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

// Standards Homey pour batteries
const HOMEY_BATTERY_TYPES = [
  'AA', 'AAA', 'AAAA', 'C', 'CR123A', 'CR2', 'CR1632', 'CR2032', 
  'CR2430', 'CR2450', 'CR2477', 'CR3032', 'CR14250', 'LS14250',
  'A23', 'A27', 'PP3', 'INTERNAL', 'OTHER'
];

let stats = {
  renamed: 0,
  energyFixed: 0,
  batteryTypeFixed: 0,
  buttonCountFixed: 0,
  errors: []
};

// Mapping UNBRANDED - Enlever marques spécifiques
const UNBRANDED_MAPPING = {
  // Enlever "Tuya", "Aqara", "HOBEIAN", etc.
  'tuya': '',
  'aqara': '',
  'hobeian': '',
  'xiaomi': '',
  'sonoff': '',
  
  // Garder des termes génériques
  'wireless': 'wireless',
  'smart': 'smart',
  'motion': 'motion',
  'temperature': 'temperature',
  'humidity': 'humidity'
};

const drivers = fs.readdirSync(DRIVERS_DIR).filter(item => {
  return fs.statSync(path.join(DRIVERS_DIR, item)).isDirectory();
});

console.log(`📦 ${drivers.length} drivers à analyser\n`);

drivers.forEach((driverFolder, idx) => {
  const driverPath = path.join(DRIVERS_DIR, driverFolder);
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) return;
  
  try {
    const content = fs.readFileSync(composeFile, 'utf8');
    const driver = JSON.parse(content);
    let needsUpdate = false;
    let changes = [];
    
    // ============================================
    // 1. VÉRIFIER ENERGY.BATTERIES
    // ============================================
    const hasMeasureBattery = driver.capabilities?.includes('measure_battery');
    const hasAlarmBattery = driver.capabilities?.includes('alarm_battery');
    const hasEnergyBatteries = driver.energy?.batteries;
    
    if ((hasMeasureBattery || hasAlarmBattery) && !hasEnergyBatteries) {
      // DOIT avoir energy.batteries selon Homey
      
      // Détecter le type de batterie depuis le nom du dossier
      let batteryType = 'OTHER'; // Par défaut
      
      if (driverFolder.includes('cr2032')) {
        batteryType = 'CR2032';
      } else if (driverFolder.includes('cr2450')) {
        batteryType = 'CR2450';
      } else if (driverFolder.includes('cr2477')) {
        batteryType = 'CR2477';
      } else if (driverFolder.includes('aaa')) {
        batteryType = 'AAA';
      } else if (driverFolder.includes('aa')) {
        batteryType = 'AA';
      }
      
      // Déterminer le nombre de batteries
      let batteryCount = 1; // Par défaut
      
      // Si c'est un multi-sensor, souvent 2 batteries
      if (driverFolder.includes('multi')) {
        batteryCount = 2;
      }
      
      // Ajouter energy.batteries
      if (!driver.energy) driver.energy = {};
      driver.energy.batteries = Array(batteryCount).fill(batteryType);
      
      needsUpdate = true;
      changes.push(`energy.batteries added: ${batteryCount}x ${batteryType}`);
      stats.energyFixed++;
    }
    
    // Vérifier si les batteries sont dans les types Homey acceptés
    if (hasEnergyBatteries) {
      const batteries = driver.energy.batteries;
      let needsFix = false;
      const fixedBatteries = batteries.map(bat => {
        if (!HOMEY_BATTERY_TYPES.includes(bat)) {
          needsFix = true;
          // Essayer de corriger
          if (bat.toLowerCase().includes('cr2032')) return 'CR2032';
          if (bat.toLowerCase().includes('cr2450')) return 'CR2450';
          if (bat.toLowerCase().includes('aaa')) return 'AAA';
          if (bat.toLowerCase().includes('aa')) return 'AA';
          return 'OTHER';
        }
        return bat;
      });
      
      if (needsFix) {
        driver.energy.batteries = fixedBatteries;
        needsUpdate = true;
        changes.push(`battery types fixed: ${fixedBatteries.join(', ')}`);
        stats.batteryTypeFixed++;
      }
    }
    
    // ============================================
    // 2. VÉRIFIER COHÉRENCE NOMBRE DE BOUTONS
    // ============================================
    if (driverFolder.includes('button') || driverFolder.includes('gang')) {
      const folderMatch = driverFolder.match(/(\d+)(button|gang)/);
      const nameMatch = driver.name?.en?.match(/(\d+)[-\s]?(Button|Gang)/i);
      
      if (folderMatch && nameMatch) {
        const folderNum = folderMatch[1];
        const nameNum = nameMatch[1];
        
        if (folderNum !== nameNum) {
          // Incohérence détectée
          changes.push(`⚠️  Incohérence: Folder=${folderNum}gang, Name=${nameNum}-Button`);
          stats.buttonCountFixed++;
          // Note: On ne change pas le nom du dossier (breaking change)
          // Mais on le signale
        }
      }
    }
    
    // ============================================
    // 3. UNBRANDED NAME (in display name only)
    // ============================================
    if (driver.name?.en) {
      let displayName = driver.name.en;
      let wasChanged = false;
      
      // Enlever marques spécifiques du nom affiché
      const brandedTerms = ['Tuya', 'Aqara', 'HOBEIAN', 'Xiaomi', 'Sonoff', '_TZ', '_TZE'];
      brandedTerms.forEach(brand => {
        if (displayName.includes(brand)) {
          displayName = String(displayName).replace(new RegExp(brand, 'gi'), '').trim();
          displayName = String(displayName).replace(/\s+/g, ' '); // Nettoyer espaces multiples
          wasChanged = true;
        }
      });
      
      if (wasChanged && displayName.length > 3) {
        driver.name.en = displayName;
        needsUpdate = true;
        changes.push(`name unbranded: "${displayName}"`);
        stats.renamed++;
      }
    }
    
    // ============================================
    // SAUVEGARDER SI CHANGEMENTS
    // ============================================
    if (needsUpdate) {
      fs.writeFileSync(
        composeFile,
        JSON.stringify(driver, null, 2) + '\n',
        'utf8'
      );
      
      if (idx % 20 === 0 || changes.length > 0) {
        console.log(`✅ [${idx + 1}/${drivers.length}] ${driverFolder}`);
        changes.forEach(c => console.log(`   ${c}`));
      }
    }
    
  } catch (error) {
    stats.errors.push({ driver: driverFolder, error: error.message });
    console.error(`❌ ${driverFolder}: ${error.message}`);
  }
});

// ============================================
// RAPPORT FINAL
// ============================================
console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(70));
console.log(`Drivers renommés (unbranded): ${stats.renamed}`);
console.log(`Energy.batteries ajoutés/corrigés: ${stats.energyFixed}`);
console.log(`Battery types corrigés: ${stats.batteryTypeFixed}`);
console.log(`Button count incohérences: ${stats.buttonCountFixed}`);
console.log(`Erreurs: ${stats.errors.length}`);
console.log('='.repeat(70));

if (stats.errors.length > 0) {
  console.log('\n❌ ERREURS:');
  stats.errors.forEach(({ driver, error }) => {
    console.log(`   ${driver}: ${error}`);
  });
}

console.log('\n📋 TYPES DE BATTERIES HOMEY ACCEPTÉS:');
console.log(HOMEY_BATTERY_TYPES.join(', '));

console.log('\n✅ PROCHAINES ÉTAPES:');
console.log('1. Nettoyer cache: rm -rf .homeybuild .homeycompose');
console.log('2. Valider: homey app validate --level publish');
console.log('3. Commit: git add -A && git commit');

process.exit(stats.errors.length > 0 ? 1 : 0);
