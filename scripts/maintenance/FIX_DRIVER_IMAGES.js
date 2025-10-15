#!/usr/bin/env node

/**
 * FIX_DRIVER_IMAGES.js
 * Corrige les chemins d'images incorrects dans les learnmode des drivers
 * 
 * Problème: Certains drivers ont des chemins d'images qui pointent vers
 * de mauvais dossiers, causant l'affichage de la même image pour tous
 */

const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '..', 'drivers');

console.log('🔍 SCAN DES DRIVERS POUR CHEMINS D\'IMAGES INCORRECTS...\n');

let totalDrivers = 0;
let driversFixed = 0;
let errors = [];

// Lire tous les drivers
const driverFolders = fs.readdirSync(DRIVERS_DIR).filter(folder => {
  const stats = fs.statSync(path.join(DRIVERS_DIR, folder));
  return stats.isDirectory();
});

totalDrivers = driverFolders.length;

driverFolders.forEach(driverFolder => {
  const driverPath = path.join(DRIVERS_DIR, driverFolder);
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    return; // Pas de driver.compose.json
  }
  
  try {
    const content = fs.readFileSync(composeFile, 'utf8');
    const driver = JSON.parse(content);
    
    let needsFix = false;
    let changes = [];
    
    // Vérifier le learnmode image
    if (driver.zigbee && driver.zigbee.learnmode && driver.zigbee.learnmode.image) {
      const currentPath = driver.zigbee.learnmode.image;
      const correctPath = `/drivers/${driverFolder}/assets/large.png`;
      
      if (currentPath !== correctPath) {
        console.log(`⚠️  ${driverFolder}`);
        console.log(`   AVANT: ${currentPath}`);
        console.log(`   APRÈS: ${correctPath}`);
        
        driver.zigbee.learnmode.image = correctPath;
        needsFix = true;
        changes.push('learnmode.image');
      }
    }
    
    // Vérifier les images du driver
    if (driver.images) {
      const expectedImages = {
        small: './assets/small.png',
        large: './assets/large.png'
      };
      
      Object.keys(expectedImages).forEach(size => {
        if (driver.images[size] !== expectedImages[size]) {
          if (!changes.includes('driver.images')) {
            console.log(`⚠️  ${driverFolder} - images incorrectes`);
          }
          driver.images[size] = expectedImages[size];
          needsFix = true;
          if (!changes.includes('driver.images')) changes.push('driver.images');
        }
      });
    } else {
      // Ajouter images si manquant
      driver.images = {
        small: './assets/small.png',
        large: './assets/large.png'
      };
      needsFix = true;
      changes.push('driver.images (added)');
      console.log(`➕ ${driverFolder} - images ajoutées`);
    }
    
    // Sauvegarder si changements
    if (needsFix) {
      fs.writeFileSync(
        composeFile,
        JSON.stringify(driver, null, 2) + '\n',
        'utf8'
      );
      driversFixed++;
      console.log(`   ✅ Corrigé: ${changes.join(', ')}\n`);
    }
    
  } catch (error) {
    errors.push({
      driver: driverFolder,
      error: error.message
    });
    console.error(`❌ Erreur ${driverFolder}: ${error.message}`);
  }
});

// Rapport final
console.log('\n' + '='.repeat(60));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(60));
console.log(`Total drivers scannés: ${totalDrivers}`);
console.log(`Drivers corrigés: ${driversFixed}`);
console.log(`Drivers OK: ${totalDrivers - driversFixed - errors.length}`);
console.log(`Erreurs: ${errors.length}`);

if (errors.length > 0) {
  console.log('\n❌ ERREURS:');
  errors.forEach(({ driver, error }) => {
    console.log(`   - ${driver}: ${error}`);
  });
}

if (driversFixed > 0) {
  console.log('\n✅ SUCCESS: Chemins d\'images corrigés!');
  console.log('\n📋 PROCHAINES ÉTAPES:');
  console.log('1. Nettoyer cache: rm -rf .homeybuild .homeycompose');
  console.log('2. Valider: homey app validate --level publish');
  console.log('3. Tester sur page web de test');
} else {
  console.log('\n✅ Tous les chemins d\'images sont déjà corrects!');
}

process.exit(errors.length > 0 ? 1 : 0);
