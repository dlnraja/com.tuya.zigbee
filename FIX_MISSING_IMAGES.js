#!/usr/bin/env node
'use strict';

/**
 * FIX MISSING IMAGES - Correction des images manquantes
 * 
 * Trouve tous les drivers avec dossier assets vide
 * et copie les images depuis un driver template
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 RECHERCHE DES DRIVERS AVEC IMAGES MANQUANTES\n');

const driversPath = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversPath);

const driversWithMissingImages = [];
const driversWithImages = [];

// Trouver les drivers avec problèmes
for (const driver of drivers) {
  const driverPath = path.join(driversPath, driver);
  const assetsPath = path.join(driverPath, 'assets');
  const imagesPath = path.join(assetsPath, 'images');
  
  if (!fs.existsSync(driverPath) || !fs.statSync(driverPath).isDirectory()) {
    continue;
  }
  
  // Vérifier si assets/images existe et contient des fichiers
  if (fs.existsSync(imagesPath)) {
    const imageFiles = fs.readdirSync(imagesPath);
    if (imageFiles.length === 0) {
      driversWithMissingImages.push(driver);
    } else {
      driversWithImages.push(driver);
    }
  } else if (fs.existsSync(assetsPath)) {
    // assets existe mais pas images
    driversWithMissingImages.push(driver);
  } else {
    // Pas d'assets du tout
    driversWithMissingImages.push(driver);
  }
}

console.log(`❌ Drivers avec images manquantes: ${driversWithMissingImages.length}`);
driversWithMissingImages.forEach(d => console.log(`   - ${d}`));

console.log(`\n✅ Drivers avec images: ${driversWithImages.length}`);

if (driversWithMissingImages.length === 0) {
  console.log('\n✅ AUCUN PROBLÈME DÉTECTÉ!');
  process.exit(0);
}

// Trouver un driver template avec des images
const templateDriver = driversWithImages.find(d => 
  d.includes('temperature_sensor_battery') || d.includes('motion_sensor')
);

if (!templateDriver) {
  console.error('\n❌ Aucun driver template trouvé!');
  process.exit(1);
}

const templateImagesPath = path.join(driversPath, templateDriver, 'assets', 'images');
console.log(`\n📋 Template utilisé: ${templateDriver}`);

// Fonction pour copier les images
function copyImages(source, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(source);
  for (const file of files) {
    const sourcePath = path.join(source, file);
    const destPath = path.join(dest, file);
    fs.copyFileSync(sourcePath, destPath);
  }
}

// Corriger tous les drivers
console.log('\n🔧 CORRECTION DES IMAGES...\n');
let fixed = 0;

for (const driver of driversWithMissingImages) {
  try {
    const driverPath = path.join(driversPath, driver);
    const targetImagesPath = path.join(driverPath, 'assets', 'images');
    
    copyImages(templateImagesPath, targetImagesPath);
    console.log(`✅ Fixé: ${driver}`);
    fixed++;
  } catch (err) {
    console.error(`❌ Erreur pour ${driver}:`, err.message);
  }
}

console.log(`\n📊 RÉSUMÉ:`);
console.log(`   Total drivers: ${drivers.length}`);
console.log(`   Avec problèmes: ${driversWithMissingImages.length}`);
console.log(`   Corrigés: ${fixed}`);
console.log(`   Restants: ${driversWithMissingImages.length - fixed}`);

if (fixed === driversWithMissingImages.length) {
  console.log('\n✅ TOUS LES DRIVERS CORRIGÉS!');
  process.exit(0);
} else {
  console.log('\n⚠️  Certains drivers n\'ont pas pu être corrigés');
  process.exit(1);
}
