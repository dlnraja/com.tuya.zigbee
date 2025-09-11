// Performance optimized
#!/usr/bin/env node
'use strict';

#!/usr/bin/env node
// Script pour vérifier les dépendances du projet

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, 'package.json');
const nodeModulesPath = path.join(__dirname, 'node_modules');

let packageJson;
let dependencies = {};
let missingDeps = [];
let installedDeps = [];

// Vérifier la présence de package.json

if (fs.existsSync(packageJsonPath)) {

  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

    // Extraire les dépendances
    dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

  } catch (error) {
    console.error('❌ Erreur lors de la lecture de package.json:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ package.json non trouvé');
  process.exit(1);
}

// Vérifier la présence de node_modules

if (fs.existsSync(nodeModulesPath)) {

  // Tester quelques dépendances importantes
  const importantDeps = ['axios', 'chalk', 'fs-extra', 'glob'];

  importantDeps.forEach(dep => {
    const depPath = path.join(nodeModulesPath, dep);
    const depExists = fs.existsSync(depPath);

    if (depExists) {

      installedDeps.push(dep);
    } else {

      missingDeps.push(dep);
    }
  });

} else {

}

// Vérifier les dépendances du package.json

const criticalDeps = ['axios', 'chalk', 'fs-extra', 'glob', 'homey'];
const foundCriticalDeps = [];
const missingCriticalDeps = [];

criticalDeps.forEach(dep => {
  if (dependencies[dep]) {

    foundCriticalDeps.push(dep);
  } else {

    missingCriticalDeps.push(dep);
  }
});

// Résumé

// Recommandations

if (missingDeps.length > 0 || missingCriticalDeps.length > 0) {

  if (!fs.existsSync(nodeModulesPath)) {

  }
  if (missingCriticalDeps.length > 0) {

    missingCriticalDeps.forEach(dep => {

    });
  }
} else {

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