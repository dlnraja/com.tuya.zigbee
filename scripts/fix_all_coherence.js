#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECTION AUTOMATIQUE - COHÉRENCE DRIVERS\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const reportPath = path.join(__dirname, '..', 'COHERENCE_REPORT.json');

if (!fs.existsSync(reportPath)) {
  console.log('❌ COHERENCE_REPORT.json introuvable!');
  console.log('💡 Exécuter d\'abord: node scripts/analyze_full_coherence.js');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
let fixed = 0;
let errors = 0;

console.log('📊 Problèmes à corriger:');
console.log(`   IDs incorrects: ${report.issues.wrongDriverId.length}`);
console.log(`   Fichiers manquants: ${report.issues.missingFiles.length}`);
console.log('');

// 1. CORRIGER LES IDs INCORRECTS
console.log('🔧 Correction des IDs drivers...\n');

report.issues.wrongDriverId.forEach(issue => {
  const composePath = path.join(driversDir, issue.driver, 'driver.compose.json');
  
  try {
    const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    
    // Backup
    const backupPath = composePath + '.backup.' + Date.now();
    fs.copyFileSync(composePath, backupPath);
    
    // Corriger ID
    compose.id = issue.expectedId;
    
    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
    console.log(`✅ ${issue.driver}: ID corrigé (${issue.currentId} → ${issue.expectedId})`);
    fixed++;
    
  } catch (err) {
    console.log(`❌ ${issue.driver}: Erreur - ${err.message}`);
    errors++;
  }
});

// 2. CRÉER LES FICHIERS DRIVER.JS MANQUANTS
console.log('\n🔧 Création des fichiers driver.js manquants...\n');

const driverJsTemplate = `'use strict';

const { Driver } = require('homey');

class GenericDriver extends Driver {
  async onInit() {
    this.log('Driver has been initialized');
  }

  async onPairListDevices() {
    return [];
  }
}

module.exports = GenericDriver;
`;

// Grouper les fichiers manquants par type
const missingDriverJs = report.issues.missingFiles.filter(f => f.file === 'driver.js');

missingDriverJs.forEach(issue => {
  const driverPath = path.join(driversDir, issue.driver, 'driver.js');
  
  try {
    // Vérifier si le dossier existe
    const driverDir = path.join(driversDir, issue.driver);
    if (!fs.existsSync(driverDir)) {
      console.log(`⚠️  ${issue.driver}: Dossier inexistant, skip`);
      return;
    }
    
    // Créer driver.js avec template
    fs.writeFileSync(driverPath, driverJsTemplate, 'utf8');
    console.log(`✅ ${issue.driver}: driver.js créé`);
    fixed++;
    
  } catch (err) {
    console.log(`❌ ${issue.driver}: Erreur - ${err.message}`);
    errors++;
  }
});

// RAPPORT FINAL
console.log('\n' + '='.repeat(60));
console.log('📊 RAPPORT DE CORRECTION');
console.log('='.repeat(60));
console.log(`✅ Corrigés: ${fixed}`);
console.log(`❌ Erreurs: ${errors}`);

if (fixed > 0) {
  console.log(`\n💡 PROCHAINES ÉTAPES:`);
  console.log(`   1. homey app build`);
  console.log(`   2. homey app validate --level publish`);
  console.log(`   3. git add -A`);
  console.log(`   4. git commit -m "fix: coherence - correct ${fixed} driver issues"`);
}
