#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔍 ANALYSE COMPLÈTE DE COHÉRENCE - TOUS LES DRIVERS\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

const issues = {
  missingFiles: [],
  missingImages: [],
  wrongImagePaths: [],
  wrongDriverId: [],
  noFlowCards: [],
  emptyDriver: [],
  missingCapabilities: [],
  namingIssues: []
};

const stats = {
  total: 0,
  complete: 0,
  hasImages: 0,
  hasFlows: 0,
  hasDevice: 0
};

console.log(`📊 Analyse de ${drivers.length} drivers...\n`);

drivers.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  
  if (!fs.statSync(driverPath).isDirectory()) return;
  
  stats.total++;
  const driverIssues = [];
  
  // Vérifier fichiers essentiels
  const composeFile = path.join(driverPath, 'driver.compose.json');
  const driverFile = path.join(driverPath, 'driver.js');
  const deviceFile = path.join(driverPath, 'device.js');
  const assetsDir = path.join(driverPath, 'assets');
  const imagesDir = path.join(assetsDir, 'images');
  
  // 1. FICHIERS MANQUANTS
  if (!fs.existsSync(composeFile)) {
    issues.missingFiles.push({ driver: driverName, file: 'driver.compose.json' });
    driverIssues.push('❌ driver.compose.json manquant');
  }
  
  if (!fs.existsSync(driverFile)) {
    issues.missingFiles.push({ driver: driverName, file: 'driver.js' });
    driverIssues.push('❌ driver.js manquant');
  }
  
  if (!fs.existsSync(deviceFile)) {
    issues.missingFiles.push({ driver: driverName, file: 'device.js' });
    driverIssues.push('⚠️  device.js manquant');
  } else {
    stats.hasDevice++;
  }
  
  // 2. VÉRIFIER DRIVER.COMPOSE.JSON
  if (fs.existsSync(composeFile)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
      
      // Vérifier ID driver
      if (compose.id !== driverName) {
        issues.wrongDriverId.push({
          driver: driverName,
          currentId: compose.id,
          expectedId: driverName
        });
        driverIssues.push(`❌ ID incorrect: ${compose.id} ≠ ${driverName}`);
      }
      
      // Vérifier images paths
      if (compose.images) {
        ['small', 'large', 'xlarge'].forEach(size => {
          if (compose.images[size] && !compose.images[size].includes(driverName)) {
            issues.wrongImagePaths.push({
              driver: driverName,
              size,
              path: compose.images[size]
            });
            driverIssues.push(`❌ Image ${size} path incorrect`);
          }
        });
      }
      
      // Vérifier capabilities
      if (!compose.capabilities || compose.capabilities.length === 0) {
        issues.missingCapabilities.push(driverName);
        driverIssues.push('⚠️  Aucune capability définie');
      }
      
    } catch (err) {
      driverIssues.push(`❌ Erreur parsing JSON: ${err.message}`);
    }
  }
  
  // 3. VÉRIFIER IMAGES
  let hasAllImages = true;
  if (fs.existsSync(imagesDir)) {
    ['small.png', 'large.png', 'xlarge.png'].forEach(img => {
      const imgPath = path.join(imagesDir, img);
      if (!fs.existsSync(imgPath)) {
        issues.missingImages.push({ driver: driverName, image: img });
        driverIssues.push(`❌ Image manquante: ${img}`);
        hasAllImages = false;
      }
    });
    
    if (hasAllImages) {
      stats.hasImages++;
    }
  } else {
    issues.missingImages.push({ driver: driverName, image: 'all (no images dir)' });
    driverIssues.push('❌ Dossier assets/images manquant');
  }
  
  // 4. VÉRIFIER NAMING
  // Détecter noms qui ne suivent pas la convention
  const hasOldPrefix = driverName.match(/^(avatto_|zemismart_|lsc_|philips_|innr_|moes_|nous_|samsung_|sonoff_|tuya_)/);
  if (hasOldPrefix && !driverName.includes('_internal') && !driverName.includes('_hybrid')) {
    issues.namingIssues.push({
      driver: driverName,
      issue: 'Old brand prefix detected',
      prefix: hasOldPrefix[1]
    });
    driverIssues.push(`⚠️  Ancien préfixe de marque: ${hasOldPrefix[1]}`);
  }
  
  // Driver complet?
  if (driverIssues.length === 0) {
    stats.complete++;
  }
  
  // Afficher si problèmes
  if (driverIssues.length > 0) {
    console.log(`\n📁 ${driverName}:`);
    driverIssues.forEach(issue => console.log(`   ${issue}`));
  }
});

// RAPPORT FINAL
console.log('\n\n' + '='.repeat(80));
console.log('📊 RAPPORT FINAL');
console.log('='.repeat(80));

console.log(`\n✅ STATISTIQUES:`);
console.log(`   Total drivers: ${stats.total}`);
console.log(`   Drivers complets: ${stats.complete} (${Math.round(stats.complete/stats.total*100)}%)`);
console.log(`   Avec images complètes: ${stats.hasImages} (${Math.round(stats.hasImages/stats.total*100)}%)`);
console.log(`   Avec device.js: ${stats.hasDevice} (${Math.round(stats.hasDevice/stats.total*100)}%)`);

console.log(`\n❌ PROBLÈMES DÉTECTÉS:`);
console.log(`   Fichiers manquants: ${issues.missingFiles.length}`);
console.log(`   Images manquantes: ${issues.missingImages.length}`);
console.log(`   Chemins images incorrects: ${issues.wrongImagePaths.length}`);
console.log(`   IDs drivers incorrects: ${issues.wrongDriverId.length}`);
console.log(`   Capabilities manquantes: ${issues.missingCapabilities.length}`);
console.log(`   Problèmes de naming: ${issues.namingIssues.length}`);

// TOP 10 des problèmes
if (issues.wrongDriverId.length > 0) {
  console.log(`\n🔴 TOP PRIORITÉ - IDs Drivers Incorrects (${issues.wrongDriverId.length}):`);
  issues.wrongDriverId.slice(0, 10).forEach(issue => {
    console.log(`   ${issue.driver}: ${issue.currentId} → ${issue.expectedId}`);
  });
}

if (issues.missingImages.length > 0) {
  console.log(`\n⚠️  Images Manquantes (${issues.missingImages.length} problèmes):`);
  const groupedByDriver = {};
  issues.missingImages.forEach(issue => {
    if (!groupedByDriver[issue.driver]) {
      groupedByDriver[issue.driver] = [];
    }
    groupedByDriver[issue.driver].push(issue.image);
  });
  
  Object.entries(groupedByDriver).slice(0, 10).forEach(([driver, images]) => {
    console.log(`   ${driver}: ${images.join(', ')}`);
  });
}

if (issues.namingIssues.length > 0) {
  console.log(`\n⚠️  Problèmes de Naming (${issues.namingIssues.length}):`);
  issues.namingIssues.slice(0, 10).forEach(issue => {
    console.log(`   ${issue.driver} (préfixe: ${issue.prefix})`);
  });
}

// Sauvegarder rapport détaillé
const reportPath = path.join(__dirname, '..', 'COHERENCE_REPORT.json');
fs.writeFileSync(reportPath, JSON.stringify({
  timestamp: new Date().toISOString(),
  stats,
  issues
}, null, 2), 'utf8');

console.log(`\n💾 Rapport détaillé sauvegardé: COHERENCE_REPORT.json`);
console.log(`\n💡 Pour corriger automatiquement, exécuter:`);
console.log(`   node scripts/fix_all_coherence.js`);
