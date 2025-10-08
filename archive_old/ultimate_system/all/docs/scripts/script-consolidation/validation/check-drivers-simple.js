#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('📂 Vérification de la structure des dossiers...');

// Chemin vers le dossier des drivers
const driversDir = path.join(__dirname, 'drivers');

// Vérifier si le dossier des drivers existe
if (!fs.existsSync(driversDir)) {
  console.error('❌ Le dossier des drivers est introuvable:', driversDir);
  process.exit(1);
}

// Lire le contenu du dossier des drivers
const driverFolders = fs.readdirSync(driversDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

console.log(`🔍 ${driverFolders.length} dossiers de drivers trouvés`);

// Analyser chaque dossier de driver
const results = [];

for (const folder of driverFolders) {
  const folderPath = path.join(driversDir, folder);
  const result = {
    name: folder,
    path: folderPath,
    hasConfig: false,
    hasIcons: false,
    issues: []
  };

  // Vérifier le fichier de configuration
  const configPath = path.join(folderPath, 'driver.compose.json');
  if (fs.existsSync(configPath)) {
    result.hasConfig = true;
    
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // Vérifier les champs obligatoires
      if (!config.id) result.issues.push('ID manquant');
      if (!config.class) result.issues.push('Classe manquante');
      if (!config.name) result.issues.push('Nom manquant');
    } catch (e) {
      result.issues.push(`Erreur de configuration: ${e.message}`);
    }
  } else {
    result.issues.push('Fichier de configuration manquant');
  }

  // Vérifier les icônes
  const iconSvg = path.join(folderPath, 'assets', 'icon.svg');
  const iconPng = path.join(folderPath, 'assets', 'images', 'large.png');
  
  if (fs.existsSync(iconSvg) && fs.existsSync(iconPng)) {
    result.hasIcons = true;
  } else {
    result.issues.push('Icônes manquantes');
  }

  results.push(result);
}

// Afficher un résumé
console.log('\n📊 RÉSUMÉ');
console.log('='.repeat(60));
console.log(`Total des dossiers analysés: ${results.length}`);

const validDrivers = results.filter(r => r.issues.length === 0);
const invalidDrivers = results.filter(r => r.issues.length > 0);

console.log(`✅ Drivers valides: ${validDrivers.length} (${Math.round((validDrivers.length / results.length) * 100)}%)`);
console.log(`❌ Drivers avec problèmes: ${invalidDrivers.length}`);

// Afficher les problèmes
if (invalidDrivers.length > 0) {
  console.log('\n🚨 PROBLÈMES DÉTECTÉS');
  console.log('='.repeat(60));
  
  for (const driver of invalidDrivers) {
    console.log(`\n📁 ${driver.name}:`);
    for (const issue of driver.issues) {
      console.log(`  - ${issue}`);
    }
  }
}

// Afficher les recommandations
console.log('\n💡 RECOMMANDATIONS');
console.log('='.repeat(60));
console.log('1. Corriger les fichiers de configuration manquants ou invalides');
console.log('2. Ajouter les icônes manquantes (SVG + PNG)');
console.log('3. Vérifier que tous les champs obligatoires sont présents');
console.log('4. Standardiser la structure des dossiers');

// Sauvegarder le rapport dans un fichier
const report = {
  generatedAt: new Date().toISOString(),
  totalDrivers: results.length,
  validDrivers: validDrivers.length,
  invalidDrivers: invalidDrivers.length,
  drivers: results.map(d => ({
    name: d.name,
    hasConfig: d.hasConfig,
    hasIcons: d.hasIcons,
    issues: d.issues
  }))
};

const reportFile = path.join(__dirname, 'driver-validation-report.json');
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

console.log(`\n📝 Rapport détaillé enregistré dans: ${reportFile}`);
console.log('✅ Analyse terminée !');
