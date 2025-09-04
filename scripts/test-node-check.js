// Vérification de l'environnement Node.js
console.log('=== Vérification de l\'environnement Node.js ===');

// Informations sur Node.js
console.log(`Version de Node.js: ${process.version}`);
console.log(`Plateforme: ${process.platform} ${process.arch}`);
console.log(`Répertoire courant: ${process.cwd()}`);

// Vérification des variables d'environnement
console.log('\n=== Variables d\'environnement ===');
['NODE_ENV', 'NODE_OPTIONS', 'NODE_PATH', 'PATH'].forEach(envVar => {
  console.log(`${envVar}: ${process.env[envVar] || 'Non défini'}`);
});

// Test d'écriture de fichier
console.log('\n=== Test d\'écriture de fichier ===');
const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'test-node-check.txt');

try {
  // Écrire dans un fichier
  fs.writeFileSync(testFile, 'Test réussi à ' + new Date().toISOString());
  console.log('1. Écriture de fichier réussie');
  
  // Lire le fichier
  const content = fs.readFileSync(testFile, 'utf8');
  console.log('2. Lecture de fichier réussie');
  console.log(`   Contenu: ${content.trim()}`);
  
  // Supprimer le fichier
  fs.unlinkSync(testFile);
  console.log('3. Fichier de test supprimé');
  
} catch (error) {
  console.error('ERREUR:', error.message);
}

console.log('\n=== Test terminé ===');
