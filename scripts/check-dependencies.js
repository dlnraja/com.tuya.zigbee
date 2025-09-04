#!/usr/bin/env node
// Script pour vérifier les dépendances du projet
console.log('=== Vérification des dépendances ===');
console.log('Date:', new Date().toISOString());

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
const nodeModulesPath = path.join(__dirname, 'node_modules');

let packageJson;
let dependencies = {};
let missingDeps = [];
let installedDeps = [];

// Vérifier la présence de package.json
console.log('\n1. Vérification de package.json...');
if (fs.existsSync(packageJsonPath)) {
  console.log('✅ package.json trouvé');
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    console.log('✅ package.json valide');

    // Extraire les dépendances
    dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    console.log(`📦 ${Object.keys(dependencies).length} dépendances déclarées`);

  } catch (error) {
    console.error('❌ Erreur lors de la lecture de package.json:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ package.json non trouvé');
  process.exit(1);
}

// Vérifier la présence de node_modules
console.log('\n2. Vérification de node_modules...');
if (fs.existsSync(nodeModulesPath)) {
  console.log('✅ node_modules présent');

  // Tester quelques dépendances importantes
  const importantDeps = ['axios', 'chalk', 'fs-extra', 'glob'];

  console.log('\n3. Test des dépendances importantes...');
  importantDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    const depExists = fs.existsSync(depPath);

    if (depExists) {
      console.log(`✅ ${dep} installé`);
      installedDeps.push(dep);
    } else {
      console.log(`❌ ${dep} manquant`);
      missingDeps.push(dep);
    }
  });

} else {
  console.log('❌ node_modules non trouvé');
  console.log('⚠️  Installation des dépendances requise');
}

// Vérifier les dépendances du package.json
console.log('\n4. Analyse des dépendances package.json...');
const criticalDeps = ['axios', 'chalk', 'fs-extra', 'glob', 'homey'];
const foundCriticalDeps = [];
const missingCriticalDeps = [];

criticalDeps.forEach(dep => {
  if (dependencies[dep]) {
    console.log(`✅ ${dep}: ${dependencies[dep]}`);
    foundCriticalDeps.push(dep);
  } else {
    console.log(`❌ ${dep}: non déclaré`);
    missingCriticalDeps.push(dep);
  }
});

// Résumé
console.log('\n=== RÉSUMÉ ===');
console.log(`📦 Dépendances totales: ${Object.keys(dependencies).length}`);
console.log(`✅ Dépendances critiques trouvées: ${foundCriticalDeps.length}/${criticalDeps.length}`);
console.log(`❌ Dépendances critiques manquantes: ${missingCriticalDeps.length}`);
console.log(`✅ Dépendances installées: ${installedDeps.length}`);
console.log(`❌ Dépendances manquantes: ${missingDeps.length}`);

// Recommandations
console.log('\n=== RECOMMANDATIONS ===');
if (missingDeps.length > 0 || missingCriticalDeps.length > 0) {
  console.log('⚠️  Actions recommandées:');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('  - Exécuter: npm install');
  }
  if (missingCriticalDeps.length > 0) {
    console.log('  - Ajouter les dépendances manquantes dans package.json');
    missingCriticalDeps.forEach(dep => {
      console.log(`    - ${dep}`);
    });
  }
} else {
  console.log('🎉 Toutes les dépendances semblent correctes!');
}

// Sauvegarder le rapport
const report = {
  timestamp: new Date().toISOString(),
  packageJson: {
    exists: !!packageJson,
    valid: !!packageJson
  },
  nodeModules: {
    exists: fs.existsSync(nodeModulesPath)
  },
  dependencies: {
    total: Object.keys(dependencies).length,
    critical: {
      total: criticalDeps.length,
      found: foundCriticalDeps.length,
      missing: missingCriticalDeps
    },
    installed: installedDeps,
    missing: missingDeps
  }
};

const reportPath = path.join(__dirname, 'dependency-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);

console.log('\n=== Vérification des dépendances terminée ===');
