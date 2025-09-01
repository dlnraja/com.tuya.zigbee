// Test simple d'exécution Node.js
const fs = require('fs');
const path = require('path');

console.log('=== Test d\'exécution simple ===');
console.log('Répertoire courant:', process.cwd());
console.log('Node.js version:', process.version);

// Créer un fichier de sortie
const outputFile = path.join(process.cwd(), 'test-output.txt');
fs.writeFileSync(outputFile, 'Test réussi à ' + new Date().toISOString());
console.log('Fichier de test créé:', outputFile);

// Lire le fichier pour vérifier
const content = fs.readFileSync(outputFile, 'utf8');
console.log('Contenu du fichier:', content);

// Vérifier l'accès au répertoire des drivers
const driversDir = path.join(process.cwd(), 'drivers');
try {
  const files = fs.readdirSync(driversDir);
  console.log(`\nContenu du répertoire des drivers (${files.length} fichiers):`);
  files.slice(0, 5).forEach(file => console.log(`- ${file}`));
  if (files.length > 5) console.log(`- ...et ${files.length - 5} fichiers supplémentaires`);
} catch (err) {
  console.error('\nERREUR lors de la lecture du répertoire des drivers:', err.message);
}

console.log('\n=== Fin du test ===');
