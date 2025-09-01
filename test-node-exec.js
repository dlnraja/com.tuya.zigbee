// Test simple d'exécution Node.js
console.log('=== Test d\'exécution Node.js ===');
console.log('1. Test de console réussi');

// Tester l'accès au système de fichiers
const fs = require('fs');
const path = require('path');

const testFile = path.join(__dirname, 'test-node-exec.txt');

try {
  // Écrire dans un fichier
  fs.writeFileSync(testFile, 'Test réussi à ' + new Date().toISOString());
  console.log('2. Écriture de fichier réussie');
  
  // Lire le fichier
  const content = fs.readFileSync(testFile, 'utf8');
  console.log('3. Lecture de fichier réussie');
  console.log('   Contenu:', content.trim());
  
  // Supprimer le fichier
  fs.unlinkSync(testFile);
  console.log('4. Fichier de test supprimé');
  
  console.log('=== Test réussi ===');
} catch (error) {
  console.error('ERREUR:', error.message);
  process.exit(1);
}
