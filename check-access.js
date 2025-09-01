// Script de vérification des accès et des dépendances
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Vérification des accès ===');
console.log(`Date: ${new Date().toLocaleString()}`);
console.log(`Node.js: ${process.version}`);
console.log(`Plateforme: ${process.platform} ${process.arch}`);
console.log(`Répertoire: ${process.cwd()}`);

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
console.log('\n=== Fichiers importants ===');
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
  console.log(`\n${file}:`);
  if (result.exists) {
    console.log(`  ✓ Existe (${result.size} octets)`);
    console.log(`  Type: ${result.isFile ? 'Fichier' : 'Dossier'}`);
    console.log(`  Accès: ${result.readable ? 'Lecture ✓' : 'Lecture ✗'} | ${result.writable ? 'Écriture ✓' : 'Écriture ✗'}`);
    
    // Afficher un aperçu du contenu pour les petits fichiers
    if (result.isFile && result.size > 0 && result.size < 10000) {
      try {
        const content = fs.readFileSync(result.path, 'utf8');
        console.log('  Aperçu des premières lignes:');
        console.log('  ' + content.split('\n').slice(0, 5).join('\n  '));
        if (content.split('\n').length > 5) console.log('  ...');
      } catch (e) {
        console.log(`  Impossible de lire le fichier: ${e.message}`);
      }
    }
  } else {
    console.log(`  ✗ Introuvable`);
    if (result.error) console.log(`  Erreur: ${result.error}`);
  }
});

// Vérifier les commandes système
console.log('\n=== Commandes système ===');
const commands = [
  'node -v',
  'npm -v',
  'npm list --depth=0',
  'npm config get prefix'
];

commands.forEach(cmd => {
  console.log(`\n> ${cmd}`);
  const result = runCommand(cmd);
  
  if (result.success) {
    console.log(result.output);
  } else {
    console.log(`❌ Erreur: ${result.error}`);
    if (result.output) console.log(result.output);
  }
});

// Vérifier l'accès au système de fichiers
console.log('\n=== Test d\'accès au système de fichiers ===');
const testDir = path.join(process.cwd(), 'test-dir-' + Date.now());
const testFile = path.join(testDir, 'test-file.txt');

console.log(`Création du dossier: ${testDir}`);
try {
  fs.mkdirSync(testDir);
  console.log('✓ Dossier créé avec succès');
  
  console.log(`\nCréation du fichier: ${testFile}`);
  fs.writeFileSync(testFile, 'Ceci est un test\n' + new Date().toISOString());
  console.log('✓ Fichier créé avec succès');
  
  console.log('\nContenu du fichier:');
  console.log(fs.readFileSync(testFile, 'utf8'));
  
  console.log('\nSuppression du fichier de test...');
  fs.unlinkSync(testFile);
  fs.rmdirSync(testDir);
  console.log('✓ Fichier et dossier de test supprimés');
  
} catch (error) {
  console.error('❌ Erreur lors du test du système de fichiers:', error.message);
  
  // Nettoyage en cas d'erreur
  try { if (fs.existsSync(testFile)) fs.unlinkSync(testFile); } catch (e) {}
  try { if (fs.existsSync(testDir)) fs.rmdirSync(testDir); } catch (e) {}
}

console.log('\n=== Vérification terminée ===');

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
  console.log('\nOuvrez manuellement le dossier:', process.cwd());
}
