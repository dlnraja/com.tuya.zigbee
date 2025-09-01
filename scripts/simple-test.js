// Simple test script to verify basic Node.js functionality
const fs = require('fs');
const path = require('path');

console.log('=== Début du test ===');
console.log('Répertoire courant:', process.cwd());

// Test d'écriture de fichier
const testFilePath = path.join(process.cwd(), 'test-simple-output.txt');
const testContent = 'Ceci est un test de fonctionnement de Node.js\n' + 
                   `Date et heure: ${new Date().toISOString()}\n` +
                   'Si vous voyez ce message, le test est réussi!';

try {
  fs.writeFileSync(testFilePath, testContent, 'utf8');
  console.log(`Fichier de test créé avec succès: ${testFilePath}`);
  
  // Vérifier la lecture du fichier
  const fileContent = fs.readFileSync(testFilePath, 'utf8');
  console.log('Contenu du fichier de test:');
  console.log('--- DÉBUT ---');
  console.log(fileContent);
  console.log('--- FIN ---');
  
  // Nettoyer
  fs.unlinkSync(testFilePath);
  console.log('Fichier de test supprimé');
  
} catch (error) {
  console.error('ERREUR lors du test:');
  console.error(error);
}

console.log('=== Fin du test ===');
