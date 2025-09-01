// Script de test d'environnement Node.js simplifié
console.log('=== Test d\'environnement Node.js ===');
console.log('Date:', new Date().toISOString());
console.log('Répertoire:', process.cwd());

// Tester l'accès au système de fichiers
const fs = require('fs');
const path = require('path');

const testFile = 'test-file.txt';

try {
  // Tester l'écriture
  fs.writeFileSync(testFile, 'Test de contenu');
  console.log('✅ Test d\'écriture réussi');
  
  // Tester la lecture
  const content = fs.readFileSync(testFile, 'utf8');
  console.log('✅ Test de lecture réussi');
  
  // Supprimer le fichier de test
  fs.unlinkSync(testFile);
  
  // Vérifier les fichiers importants
  console.log('\n=== Vérification des fichiers ===');
  const requiredFiles = [
    'package.json',
    'app.json',
    'scripts/scout.js',
    'scripts/architect.js',
    'scripts/optimizer.js',
    'scripts/validator.js'
  ];
  
  requiredFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    const exists = fs.existsSync(fullPath);
    console.log(`${exists ? '✅' : '❌'} ${file}`);
  });
  
  // Vérifier les dépendances
  console.log('\n=== Vérification des dépendances ===');
  try {
    const pkg = require('./package.json');
    console.log(`Nom: ${pkg.name}`);
    console.log(`Version: ${pkg.version}`);
    
    // Vérifier node_modules
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    const hasNodeModules = fs.existsSync(nodeModulesPath);
    console.log(`node_modules: ${hasNodeModules ? '✅ Présent' : '❌ Manquant'}`);
    
    if (!hasNodeModules) {
      console.log('\n⚠️  Exécutez "npm install" pour installer les dépendances');
    }
  } catch (err) {
    console.error('❌ Erreur lors de la lecture du package.json:', err.message);
  }
  
  console.log('\n=== Test terminé avec succès ===');
  
} catch (error) {
  console.error('\n❌ Erreur lors du test:', error.message);
  console.error('Stack:', error.stack);
}
