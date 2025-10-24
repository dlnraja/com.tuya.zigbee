#!/usr/bin/env node
'use strict';

/**
 * VALIDATE ALL DRIVER IMAGES
 * Vérifie que chaque driver a ses images aux bonnes dimensions
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_SIZES = {
  'small.png': [75, 75],
  'large.png': [500, 500],
  'xlarge.png': [1000, 1000]
};

function validateDriverImages() {
  const driversPath = path.join(__dirname, '..', 'drivers');
  const drivers = fs.readdirSync(driversPath).filter(d => {
    return fs.statSync(path.join(driversPath, d)).isDirectory();
  });
  
  console.log(`\n🔍 VALIDATION DES IMAGES - ${drivers.length} DRIVERS\n`);
  
  const report = {
    complete: [],
    partial: [],
    missing: [],
    total: drivers.length
  };
  
  drivers.forEach(driverId => {
    const imagesPath = path.join(driversPath, driverId, 'assets', 'images');
    
    if (!fs.existsSync(imagesPath)) {
      report.missing.push(driverId);
      return;
    }
    
    const foundImages = [];
    const missingImages = [];
    
    Object.keys(REQUIRED_SIZES).forEach(imageName => {
      const imagePath = path.join(imagesPath, imageName);
      if (fs.existsSync(imagePath)) {
        foundImages.push(imageName);
      } else {
        missingImages.push(imageName);
      }
    });
    
    if (foundImages.length === 3) {
      report.complete.push(driverId);
    } else if (foundImages.length > 0) {
      report.partial.push({ driver: driverId, missing: missingImages });
    } else {
      report.missing.push(driverId);
    }
  });
  
  // Affichage rapport
  console.log(`✅ COMPLET (${report.complete.length}):`);
  report.complete.slice(0, 10).forEach(d => console.log(`   ${d}`));
  if (report.complete.length > 10) {
    console.log(`   ... et ${report.complete.length - 10} autres`);
  }
  
  console.log(`\n⚠️  PARTIEL (${report.partial.length}):`);
  report.partial.forEach(item => {
    console.log(`   ${item.driver}: manque ${item.missing.join(', ')}`);
  });
  
  console.log(`\n❌ MANQUANT (${report.missing.length}):`);
  report.missing.slice(0, 20).forEach(d => console.log(`   ${d}`));
  if (report.missing.length > 20) {
    console.log(`   ... et ${report.missing.length - 20} autres`);
  }
  
  console.log(`\n📊 RÉSUMÉ:`);
  console.log(`   Total: ${report.total}`);
  console.log(`   Complet: ${report.complete.length} (${Math.round(report.complete.length/report.total*100)}%)`);
  console.log(`   Partiel: ${report.partial.length} (${Math.round(report.partial.length/report.total*100)}%)`);
  console.log(`   Manquant: ${report.missing.length} (${Math.round(report.missing.length/report.total*100)}%)`);
  
  return report;
}

if (require.main === module) {
  validateDriverImages();
}

module.exports = { validateDriverImages };
