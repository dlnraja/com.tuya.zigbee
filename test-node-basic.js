// Script de test basique Node.js
console.log('=== Test Node.js de base ===');
console.log('1. Test de console réussi');

// Test de lecture/écriture de fichier
const fs = require('fs');
const path = require('path');
const testFile = path.join(process.cwd(), 'node-test-file.txt');

// Écrire dans un fichier
try {
  fs.writeFileSync(testFile, 'Test de Node.js - ' + new Date().toISOString());
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
}

console.log('=== Fin du test ===');
