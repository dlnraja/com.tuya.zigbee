// Test minimal d'environnement Node.js
console.log('=== Test minimal Node.js ===');
console.log('1. Test de console réussi');

// Test d'écriture de fichier
const fs = require('fs');
const path = require('path');
const testFile = path.join(__dirname, 'test-node-env-output.txt');

try {
  // Écrire dans un fichier
  fs.writeFileSync(testFile, 'Test réussi à ' + new Date().toISOString());
  console.log('2. Écriture de fichier réussie');
  
  // Lire le fichier
  const content = fs.readFileSync(testFile, 'utf8');
  console.log('3. Lecture de fichier réussie');
  console.log('   Contenu:', content);
  
  // Supprimer le fichier
  fs.unlinkSync(testFile);
  console.log('4. Suppression de fichier réussie');
  
} catch (error) {
  console.error('ERREUR:', error.message);
  process.exit(1);
}

console.log('=== Test terminé avec succès ===');
