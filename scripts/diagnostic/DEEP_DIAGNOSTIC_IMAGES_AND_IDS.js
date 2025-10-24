#!/usr/bin/env node
/**
 * 🔍 DIAGNOSTIC PROFOND - Images & IDs
 * 
 * Diagnostique pourquoi les images et IDs ne sont pas corrects sur Homey
 * Vérifie:
 * - app.json vs driver.compose.json
 * - Images présentes vs référencées
 * - IDs dans historique Git
 * - Cohérence build
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const APP_JSON = path.join(ROOT, 'app.json');

console.log('🔍 DIAGNOSTIC PROFOND - Images & Manufacturer IDs\n');
console.log('═══════════════════════════════════════════════════════\n');

// Lire app.json
const appJson = JSON.parse(fs.readFileSync(APP_JSON, 'utf8'));
console.log(`📄 app.json version: ${appJson.version}\n`);

// Problèmes détectés
const issues = {
  imagesMissing: [],
  imagesWrong: [],
  idsNotInAppJson: [],
  composeVsAppJson: [],
  buildNeeded: false
};

// Vérifier chaque driver
const drivers = appJson.drivers || [];

console.log(`📊 Analyse de ${drivers.length} drivers dans app.json...\n`);

let analyzed = 0;

for (const driver of drivers.slice(0, 20)) { // Limiter pour rapidité
  const driverId = driver.id;
  const driverPath = path.join(DRIVERS_DIR, driverId);
  const composeFile = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeFile)) {
    issues.composeVsAppJson.push({
      driver: driverId,
      issue: 'driver.compose.json missing'
    });
    continue;
  }
  
  const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
  
  // Vérifier images
  const imagesInCompose = compose.images || {};
  const imagesInAppJson = driver.images || {};
  
  for (const size of ['small', 'large', 'xlarge']) {
    const composeImagePath = imagesInCompose[size];
    const appJsonImagePath = imagesInAppJson[size];
    
    // Vérifier si paths correspondent
    if (composeImagePath !== appJsonImagePath) {
      issues.imagesWrong.push({
        driver: driverId,
        size,
        compose: composeImagePath,
        appJson: appJsonImagePath
      });
      issues.buildNeeded = true;
    }
    
    // Vérifier si fichier existe
    if (composeImagePath) {
      const fullPath = path.join(ROOT, composeImagePath);
      if (!fs.existsSync(fullPath)) {
        issues.imagesMissing.push({
          driver: driverId,
          size,
          path: composeImagePath
        });
      }
    }
  }
  
  // Vérifier manufacturer IDs
  const composeIds = compose.zigbee?.manufacturerName || [];
  const appJsonIds = driver.zigbee?.manufacturerName || [];
  
  // Comparer
  const idsInCompose = new Set(composeIds);
  const idsInApp = new Set(appJsonIds);
  
  const missingInApp = [...idsInCompose].filter(id => !idsInApp.has(id));
  
  if (missingInApp.length > 0) {
    issues.idsNotInAppJson.push({
      driver: driverId,
      missingIds: missingInApp,
      composeCount: composeIds.length,
      appJsonCount: appJsonIds.length
    });
    issues.buildNeeded = true;
  }
  
  analyzed++;
}

console.log(`✅ Analysé ${analyzed} drivers\n`);

// Afficher résultats
console.log('📊 RÉSULTATS DIAGNOSTIC:\n');

console.log(`🖼️  IMAGES:`);
console.log(`  Paths incorrects:   ${issues.imagesWrong.length}`);
console.log(`  Fichiers manquants: ${issues.imagesMissing.length}\n`);

if (issues.imagesWrong.length > 0) {
  console.log(`  Détails paths incorrects (premiers 5):`);
  for (const issue of issues.imagesWrong.slice(0, 5)) {
    console.log(`    ${issue.driver} [${issue.size}]:`);
    console.log(`      compose: ${issue.compose}`);
    console.log(`      app.json: ${issue.appJson}`);
  }
  console.log('');
}

if (issues.imagesMissing.length > 0) {
  console.log(`  Détails fichiers manquants (premiers 5):`);
  for (const issue of issues.imagesMissing.slice(0, 5)) {
    console.log(`    ${issue.driver} [${issue.size}]: ${issue.path}`);
  }
  console.log('');
}

console.log(`🏷️  MANUFACTURER IDs:`);
console.log(`  Drivers avec IDs manquants dans app.json: ${issues.idsNotInAppJson.length}\n`);

if (issues.idsNotInAppJson.length > 0) {
  console.log(`  Détails IDs manquants (premiers 5):`);
  for (const issue of issues.idsNotInAppJson.slice(0, 5)) {
    console.log(`    ${issue.driver}:`);
    console.log(`      IDs dans compose: ${issue.composeCount}`);
    console.log(`      IDs dans app.json: ${issue.appJsonCount}`);
    console.log(`      Manquants: ${issue.missingIds.slice(0, 3).join(', ')}${issue.missingIds.length > 3 ? '...' : ''}`);
  }
  console.log('');
}

// Diagnostic final
console.log('═══════════════════════════════════════════════════════');
console.log('🔍 DIAGNOSTIC FINAL:\n');

if (issues.buildNeeded) {
  console.log('⚠️  BUILD NÉCESSAIRE!');
  console.log('  Raison: app.json et driver.compose.json ne sont pas synchronisés\n');
  console.log('  Solution: Exécuter `homey app build`\n');
}

// Vérifier historique Git pour enrichissements perdus
console.log('📜 Vérification historique Git...\n');

try {
  // Comparer avec commit précédent
  const gitDiff = execSync('git diff HEAD~1 HEAD -- .homeycompose/drivers/').toString();
  
  if (gitDiff.length > 0) {
    console.log('  ✅ Modifications détectées dans .homeycompose/drivers/');
    console.log('  Derniers changements appliqués dans le dernier commit\n');
  } else {
    console.log('  ⚠️  Aucune modification dans .homeycompose/drivers/');
    console.log('  Les enrichissements peuvent ne pas avoir été committés!\n');
  }
  
} catch (err) {
  console.log('  ⚠️  Impossible de vérifier Git:', err.message, '\n');
}

// Vérifier si .homeycompose existe
const homeyComposeDir = path.join(ROOT, '.homeycompose', 'drivers');
if (fs.existsSync(homeyComposeDir)) {
  const composeDrivers = fs.readdirSync(homeyComposeDir)
    .filter(name => {
      const fullPath = path.join(homeyComposeDir, name);
      return fs.statSync(fullPath).isDirectory();
    });
  
  console.log(`📁 .homeycompose/drivers/: ${composeDrivers.length} drivers\n`);
  
  // Comparer avec drivers/
  const driversInRoot = fs.readdirSync(DRIVERS_DIR)
    .filter(name => {
      const fullPath = path.join(DRIVERS_DIR, name);
      return fs.statSync(fullPath).isDirectory() && !name.startsWith('.');
    });
  
  if (composeDrivers.length !== driversInRoot.length) {
    console.log(`  ⚠️  Discordance: ${composeDrivers.length} dans .homeycompose vs ${driversInRoot.length} dans drivers/\n`);
  }
}

// Recommandations
console.log('═══════════════════════════════════════════════════════');
console.log('💡 RECOMMANDATIONS:\n');

const recommendations = [];

if (issues.buildNeeded) {
  recommendations.push({
    priority: 'CRITIQUE',
    action: 'Rebuild app.json',
    command: 'homey app build',
    reason: 'app.json désynchronisé avec driver.compose.json'
  });
}

if (issues.imagesMissing.length > 0) {
  recommendations.push({
    priority: 'HAUTE',
    action: 'Générer images manquantes',
    command: 'node scripts/images/FIX_MISSING_IMAGES.js',
    reason: `${issues.imagesMissing.length} fichiers images manquants`
  });
}

if (issues.idsNotInAppJson.length > 0) {
  recommendations.push({
    priority: 'HAUTE',
    action: 'Re-build après enrichissement',
    command: 'homey app build',
    reason: `${issues.idsNotInAppJson.length} drivers avec IDs non synchronisés`
  });
}

if (recommendations.length === 0) {
  console.log('✅ Aucune action requise - tout semble OK!\n');
} else {
  for (const rec of recommendations) {
    console.log(`[${rec.priority}] ${rec.action}`);
    console.log(`  Commande: ${rec.command}`);
    console.log(`  Raison: ${rec.reason}\n`);
  }
}

// Sauvegarder rapport
const reportPath = path.join(ROOT, 'reports', 'DEEP_DIAGNOSTIC_REPORT.json');
const report = {
  date: new Date().toISOString(),
  appVersion: appJson.version,
  driversAnalyzed: analyzed,
  issues: {
    imagesWrong: issues.imagesWrong.length,
    imagesMissing: issues.imagesMissing.length,
    idsNotInAppJson: issues.idsNotInAppJson.length,
    composeVsAppJson: issues.composeVsAppJson.length,
    buildNeeded: issues.buildNeeded
  },
  details: issues,
  recommendations
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

console.log(`📄 Rapport complet: ${reportPath}\n`);
console.log('✅ DIAGNOSTIC TERMINÉ!\n');
