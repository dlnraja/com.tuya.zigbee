// Script de vérification d'environnement simplifié
console.log('=== Vérification de l\'environnement ===');
console.log('Date:', new Date().toISOString());
console.log('Node.js version:', process.version);
console.log('Plateforme:', process.platform, process.arch);
console.log('Répertoire courant:', process.cwd());

// Tester l'accès au système de fichiers
const fs = require('fs');
const path = require('path');

try {
  const testFile = 'test-file.txt';
  
  // Tester l'écriture
  fs.writeFileSync(testFile, 'Test de contenu');
  console.log('✅ Test d\'écriture réussi');
  
  // Tester la lecture
  const content = fs.readFileSync(testFile, 'utf8');
  console.log('✅ Test de lecture réussi');
  
  // Nettoyer
  fs.unlinkSync(testFile);
  
  // Vérifier les fichiers importants
  console.log('\n=== Fichiers du projet ===');
  const filesToCheck = [
    'package.json',
    'app.json',
    'scripts/scout.js',
    'scripts/architect.js',
    'scripts/optimizer.js',
    'scripts/validator.js'
  ];
  
  filesToCheck.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
  });
  
  console.log('\n=== Vérification des dépendances ===');
  try {
    const pkg = require('./package.json');
    console.log('Nom:', pkg.name);
    console.log('Version:', pkg.version);
    
    // Vérifier node_modules
    const hasNodeModules = fs.existsSync('node_modules');
    console.log(`node_modules: ${hasNodeModules ? '✅ Présent' : '❌ Manquant'}`);
    
    if (!hasNodeModules) {
      console.log('\n⚠️  Exécutez "npm install" pour installer les dépendances');
    }
  } catch (err) {
    console.error('Erreur lors de la lecture du package.json:', err.message);
  }
  
  console.log('\n=== Vérification terminée avec succès ===');
  
} catch (error) {
  console.error('\n❌ Erreur lors de la vérification:', error.message);
  if (error.code) console.error('Code d\'erreur:', error.code);
  if (error.path) console.error('Chemin concerné:', error.path);
}
