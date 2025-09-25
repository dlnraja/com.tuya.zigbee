// Performance optimized
#!/usr/bin/env node
'use strict';

// Script de vérification des accès et des dépendances
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Fonction pour vérifier l'accès à un fichier
function checkFileAccess(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    const exists = fs.existsSync(fullPath);
    const stats = exists ? fs.statSync(fullPath) : null;

    return {
      path: fullPath,
      exists,
      isFile: exists ? stats.isFile() : false,
      isDirectory: exists ? stats.isDirectory() : false,
      size: exists ? stats.size : 0,
      readable: exists ? (fs.accessSync(fullPath, fs.constants.R_OK) === undefined) : false,
      writable: exists ? (fs.accessSync(fullPath, fs.constants.W_OK) === undefined) : false
    };
  } catch (error) {
    return {
      path: filePath,
      error: error.message,
      exists: false
    };
  }
}

// Fonction pour exécuter une commande
function runCommand(cmd) {
  try {
    const output = execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    return {
      success: true,
      output: output.trim()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      output: error.output ? error.output.toString() : ''
    };
  }
}

// Vérifier les fichiers importants

const importantFiles = [
  'package.json',
  'app.json',
  'scripts/scout.js',
  'scripts/architect.js',
  'scripts/optimizer.js',
  'scripts/validator.js'
];

importantFiles.forEach(file => {
  const result = checkFileAccess(file);

  if (result.exists) {

    // Afficher un aperçu du contenu pour les petits fichiers
    if (result.isFile && result.size > 0 && result.size < 10000) {
      try {
        const content = fs.readFileSync(result.path, 'utf8');

        if (content.split('\n').length > 5) console.log('  ...');
      } catch (e) {

      }
    }
  } else {

    if (result.error) console.log(`  Erreur: ${result.error}`);
  }
});

// Vérifier les commandes système

const commands = [
  'node -v',
  'npm -v',
  'npm list --depth=0',
  'npm config get prefix'
];

commands.forEach(cmd => {

  const result = runCommand(cmd);

  if (result.success) {

  } else {

    if (result.output) console.log(result.output);
  }
});

// Vérifier l'accès au système de fichiers

const testDir = path.join(process.cwd(), 'test-dir-' + Date.now());
const testFile = path.join(testDir, 'test-file.txt');

try {
  fs.mkdirSync(testDir);

  fs.writeFileSync(testFile, 'Ceci est un test\n' + new Date().toISOString());

  fs.unlinkSync(testFile);
  fs.rmdirSync(testDir);

} catch (error) {
  console.error('❌ Erreur lors du test du système de fichiers:', error.message);

  // Nettoyage en cas d'erreur
  try { if (fs.existsSync(testFile)) fs.unlinkSync(testFile); } catch (e) {}
  try { if (fs.existsSync(testDir)) fs.rmdirSync(testDir); } catch (e) {}
}

// Essayer d'ouvrir le dossier des résultats
try {
  if (process.platform === 'win32') {
    require('child_process').exec(`start "" "${process.cwd()}"`);
  } else if (process.platform === 'darwin') {
    require('child_process').exec(`open "${process.cwd()}"`);
  } else {
    require('child_process').exec(`xdg-open "${process.cwd()}"`);
  }
} catch (e) {

}