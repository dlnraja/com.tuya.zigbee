// Script de test de l'environnement Node.js
console.log('=== Test de l\'environnement Node.js ===');
console.log(`Date: ${new Date().toLocaleString()}`);
console.log(`Node.js version: ${process.version}`);
console.log(`Plateforme: ${process.platform} ${process.arch}`);
console.log(`Répertoire: ${process.cwd()}`);

// Tester l'accès au système de fichiers
try {
  const testFile = 'test-file.txt';
  fs.writeFileSync(testFile, 'Test d\'écriture');
  
  if (fs.existsSync(testFile)) {
    console.log('✅ Accès en écriture au système de fichiers fonctionnel');
    fs.unlinkSync(testFile);
  } else {
    console.log('❌ Impossible d\'écrire des fichiers');
  }
} catch (error) {
  console.log('❌ Erreur d\'accès au système de fichiers:', error.message);
}

// Tester l'exécution d'une commande système
try {
  const output = require('child_process').execSync('node -v').toString().trim();
  console.log(`✅ Commande 'node -v' exécutée avec succès: ${output}`);
} catch (error) {
  console.log('❌ Impossible d\'exécuter la commande node -v');
}

// Vérifier les fichiers importants
const requiredFiles = [
  'package.json',
  'app.json',
  'scripts/scout.js',
  'scripts/architect.js',
  'scripts/optimizer.js',
  'scripts/validator.js'
];

console.log('\n=== Vérification des fichiers ===');

let allFilesExist = true;
for (const file of requiredFiles) {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file} ${exists ? 'trouvé' : 'manquant'}`);
  if (!exists) allFilesExist = false;
}

// Tester l'exécution d'un script simple
if (allFilesExist) {
  console.log('\n=== Test d\'exécution d\'un script ===');
  
  try {
    const scriptContent = `
      // Script de test
      console.log('Test d\'exécution réussi!');
      console.log('Node.js version:', process.version);
      console.log('Répertoire:', process.cwd());
      
      // Essayer d'accéder à un fichier du projet
      try {
        const pkg = require('./package.json');
        console.log('Nom du projet:', pkg.name || 'Non spécifié');
      } catch (e) {
        console.log('Impossible de lire package.json:', e.message);
      }
    `;
    
    const testScriptPath = 'test-script.js';
    fs.writeFileSync(testScriptPath, scriptContent);
    
    console.log('\nExécution du script de test...');
    const output = require('child_process').execSync(`node ${testScriptPath}`).toString();
    console.log('Sortie du script:');
    console.log(output);
    
    // Nettoyer
    fs.unlinkSync(testScriptPath);
    
  } catch (error) {
    console.log('❌ Erreur lors de l\'exécution du script de test:');
    console.log(error.message);
    
    // Essayer de nettoyer même en cas d'erreur
    try { if (fs.existsSync(testScriptPath)) fs.unlinkSync(testScriptPath); } catch (e) {}
  }
}

console.log('\n=== Test terminé ===');
console.log('Vérifiez les messages ci-dessus pour les éventuelles erreurs.');
