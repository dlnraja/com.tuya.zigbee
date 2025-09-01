// Script de diagnostic de l'environnement Node.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Diagnostic de l\'environnement Node.js ===\n');

// 1. Informations système
try {
  console.log('1. Informations système:');
  console.log(`- Plateforme: ${process.platform} (${process.arch})`);
  console.log(`- Version de Node.js: ${process.version}`);
  console.log(`- Version de NPM: ${execSync('npm -v').toString().trim()}`);
  console.log(`- Répertoire courant: ${process.cwd()}`);
  console.log(`- Répertoire d'exécution: ${__dirname}\n`);
} catch (error) {
  console.error('❌ Erreur lors de la récupération des informations système:', error.message);
}

// 2. Vérification des fichiers de configuration
try {
  console.log('2. Fichiers de configuration:');
  
  const checkFile = (filePath, required = false) => {
    const exists = fs.existsSync(filePath);
    console.log(`- ${filePath}: ${exists ? '✅ Trouvé' : required ? '❌ Manquant' : '⚠️  Non trouvé'}`);
    return exists;
  };
  
  checkFile('package.json', true);
  checkFile('package-lock.json');
  checkFile('app.json', true);
  checkFile('homey.app.json');
  
  console.log('');
} catch (error) {
  console.error('❌ Erreur lors de la vérification des fichiers:', error.message);
}

// 3. Vérification des dépendances
try {
  console.log('3. Dépendances installées:');
  
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = pkg.dependencies || {};
  const devDeps = pkg.devDependencies || {};
  
  console.log(`- Dependencies: ${Object.keys(deps).length}`);
  console.log(`- Dev Dependencies: ${Object.keys(devDeps).length}\n`);
  
  // Vérification du répertoire node_modules
  const nodeModulesExists = fs.existsSync('node_modules');
  console.log(`- node_modules: ${nodeModulesExists ? '✅ Présent' : '❌ Absent'}`);
  
  if (nodeModulesExists) {
    const moduleCount = fs.readdirSync('node_modules').length;
    console.log(`  Nombre de modules: ${moduleCount}`);
  }
  
  console.log('');
} catch (error) {
  console.error('❌ Erreur lors de la vérification des dépendances:', error.message);
}

// 4. Vérification des variables d'environnement
try {
  console.log('4. Variables d\'environnement:');
  
  const envVars = [
    'NODE_ENV',
    'HOMEY_PATH',
    'HOMEY_APP_ID',
    'HOMEY_APP_PATH'
  ];
  
  envVars.forEach(varName => {
    console.log(`- ${varName}: ${process.env[varName] || 'Non défini'}`);
  });
  
  console.log('');
} catch (error) {
  console.error('❌ Erreur lors de la vérification des variables d\'environnement:', error.message);
}

// 5. Vérification de l'accès au système de fichiers
try {
  console.log('5. Test d\'accès au système de fichiers:');
  
  const testDirs = [
    'drivers',
    'locales',
    'assets'
  ];
  
  testDirs.forEach(dir => {
    try {
      const stats = fs.statSync(dir);
      console.log(`- ${dir}: ${stats.isDirectory() ? '📁 Répertoire' : '📄 Fichier'}`);
      
      if (stats.isDirectory()) {
        const files = fs.readdirSync(dir);
        console.log(`  ${files.length} éléments trouvés`);
      }
    } catch (error) {
      console.log(`- ${dir}: ❌ ${error.code === 'ENOENT' ? 'Non trouvé' : error.message}`);
    }
  });
  
  console.log('');
} catch (error) {
  console.error('❌ Erreur lors du test d\'accès au système de fichiers:', error.message);
}

console.log('=== Diagnostic terminé ===');
