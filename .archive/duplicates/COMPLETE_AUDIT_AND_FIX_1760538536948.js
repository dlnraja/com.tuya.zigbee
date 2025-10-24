#!/usr/bin/env node

/**
 * COMPLETE_AUDIT_AND_FIX.js
 * Audit complet et correction automatique de tous les problèmes
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🔍 AUDIT COMPLET DU PROJET...\n');

let issues = {
  namingInconsistency: [],
  missingImages: [],
  incorrectImagePaths: [],
  missingCapabilities: [],
  energyInconsistency: [],
  duplicateManufacturers: []
};

let fixes = {
  applied: 0,
  failed: 0
};

// Lire tous les drivers
const driverFolders = fs.readdirSync(DRIVERS_DIR).filter(folder => {
  const stats = fs.statSync(path.join(DRIVERS_DIR, folder));
  return stats.isDirectory();
});

console.log(`📦 ${driverFolders.length} drivers à auditer\n`);

driverFolders.forEach((driverFolder, index) => {
  const driverPath = path.join(DRIVERS_DIR, driverFolder);
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    return;
  }
  
  try {
    const content = fs.readFileSync(composeFile, 'utf8');
    const driver = JSON.parse(content);
    let needsFix = false;
    let changes = [];
    
    // ============================================
    // 1. VÉRIFIER NAMING INCONSISTENCY
    // ============================================
    const hasAC = driverFolder.includes('_ac') && !driverFolder.includes('_ac_');
    const hasBattery = driverFolder.includes('_battery') || driverFolder.includes('_cr2032');
    const hasHybrid = driverFolder.includes('_hybrid');
    
    // Contradiction: AC + Battery sans être Hybrid
    if (hasAC && hasBattery && !hasHybrid) {
      issues.namingInconsistency.push({
        driver: driverFolder,
        issue: 'AC + Battery contradiction',
        current: driver.name?.en
      });
    }
    
    // ============================================
    // 2. VÉRIFIER IMAGES
    // ============================================
    const assetsDir = path.join(driverPath, 'assets');
    const requiredImages = ['icon.svg', 'small.png', 'large.png', 'xlarge.png'];
    
    if (fs.existsSync(assetsDir)) {
      requiredImages.forEach(img => {
        if (!fs.existsSync(path.join(assetsDir, img))) {
          issues.missingImages.push({
            driver: driverFolder,
            missing: img
          });
        }
      });
    }
    
    // Vérifier driver.images
    if (!driver.images) {
      driver.images = {
        small: './assets/small.png',
        large: './assets/large.png'
      };
      needsFix = true;
      changes.push('images added');
    } else {
      if (driver.images.small !== './assets/small.png') {
        driver.images.small = './assets/small.png';
        needsFix = true;
        changes.push('small image path');
      }
      if (driver.images.large !== './assets/large.png') {
        driver.images.large = './assets/large.png';
        needsFix = true;
        changes.push('large image path');
      }
    }
    
    // Vérifier learnmode.image
    if (driver.zigbee && driver.zigbee.learnmode && driver.zigbee.learnmode.image) {
      const correctPath = `/drivers/${driverFolder}/assets/large.png`;
      if (driver.zigbee.learnmode.image !== correctPath) {
        driver.zigbee.learnmode.image = correctPath;
        needsFix = true;
        changes.push('learnmode image');
      }
    }
    
    // ============================================
    // 3. VÉRIFIER ENERGY vs CAPABILITIES
    // ============================================
    const hasBatteryCap = driver.capabilities && driver.capabilities.includes('measure_battery');
    const hasEnergyBatteries = driver.energy && driver.energy.batteries;
    
    if (hasBatteryCap && !hasEnergyBatteries) {
      issues.energyInconsistency.push({
        driver: driverFolder,
        issue: 'Has measure_battery but no energy.batteries'
      });
    }
    
    if (!hasBatteryCap && hasEnergyBatteries) {
      issues.energyInconsistency.push({
        driver: driverFolder,
        issue: 'Has energy.batteries but no measure_battery capability'
      });
    }
    
    // ============================================
    // 4. CORRIGER NOMS INCOHÉRENTS
    // ============================================
    if (driver.name && driver.name.en) {
      const displayName = driver.name.en;
      
      // Si le driver a energy.batteries, le nom doit finir par (Battery) ou (AC)
      if (hasEnergyBatteries && !displayName.includes('(Battery)') && !displayName.includes('(AC)') && !hasHybrid) {
        // Ajouter (Battery) à la fin
        const newName = `${displayName} (Battery)`;
        driver.name.en = newName;
        needsFix = true;
        changes.push(`name: ${displayName} → ${newName}`);
      }
    }
    
    // ============================================
    // SAUVEGARDER SI CHANGEMENTS
    // ============================================
    if (needsFix) {
      fs.writeFileSync(
        composeFile,
        JSON.stringify(driver, null, 2) + '\n',
        'utf8'
      );
      fixes.applied++;
      
      if (index % 10 === 0) {
        console.log(`✅ [${index + 1}/${driverFolders.length}] ${driverFolder}`);
        if (changes.length > 0) {
          console.log(`   Corrections: ${changes.join(', ')}`);
        }
      }
    }
    
  } catch (error) {
    fixes.failed++;
    console.error(`❌ ${driverFolder}: ${error.message}`);
  }
});

// ============================================
// RAPPORT FINAL
// ============================================
console.log('\n' + '='.repeat(70));
console.log('📊 RAPPORT D\'AUDIT COMPLET');
console.log('='.repeat(70));

console.log(`\n✅ CORRECTIONS APPLIQUÉES: ${fixes.applied}`);
console.log(`❌ ERREURS: ${fixes.failed}`);

if (issues.namingInconsistency.length > 0) {
  console.log(`\n⚠️  NAMING INCONSISTENCIES: ${issues.namingInconsistency.length}`);
  issues.namingInconsistency.forEach(issue => {
    console.log(`   - ${issue.driver}: ${issue.issue}`);
  });
}

if (issues.missingImages.length > 0) {
  console.log(`\n⚠️  MISSING IMAGES: ${issues.missingImages.length}`);
  const grouped = {};
  issues.missingImages.forEach(issue => {
    if (!grouped[issue.driver]) grouped[issue.driver] = [];
    grouped[issue.driver].push(issue.missing);
  });
  Object.keys(grouped).slice(0, 10).forEach(driver => {
    console.log(`   - ${driver}: ${grouped[driver].join(', ')}`);
  });
  if (Object.keys(grouped).length > 10) {
    console.log(`   ... et ${Object.keys(grouped).length - 10} autres drivers`);
  }
}

if (issues.energyInconsistency.length > 0) {
  console.log(`\n⚠️  ENERGY INCONSISTENCIES: ${issues.energyInconsistency.length}`);
  issues.energyInconsistency.slice(0, 5).forEach(issue => {
    console.log(`   - ${issue.driver}: ${issue.issue}`);
  });
  if (issues.energyInconsistency.length > 5) {
    console.log(`   ... et ${issues.energyInconsistency.length - 5} autres`);
  }
}

console.log('\n' + '='.repeat(70));

if (fixes.applied > 0) {
  console.log('\n✅ CORRECTIONS TERMINÉES!');
  console.log('\n📋 PROCHAINES ÉTAPES:');
  console.log('1. rm -rf .homeybuild .homeycompose');
  console.log('2. homey app validate --level publish');
  console.log('3. git add -A && git commit');
  console.log('4. git push origin master');
}

process.exit(fixes.failed > 0 ? 1 : 0);
