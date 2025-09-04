// Script pour vérifier le contexte d'exécution
const fs = require('fs');
const path = require('path');

console.log('=== Vérification du contexte d\'exécution ===');
console.log('1. Répertoire courant:', process.cwd());
console.log('2. Plateforme:', process.platform, process.arch);
console.log('3. Version de Node.js:', process.version);
console.log('4. Arguments de la ligne de commande:', process.argv);
console.log('5. Variables d\'environnement:');
console.log('   - NODE_ENV:', process.env.NODE_ENV || 'non défini');
console.log('   - PATH:', process.env.PATH ? 'défini' : 'non défini');

// Tester l'écriture de fichier
const testFile = path.join(process.cwd(), 'test-context.txt');
try {
  fs.writeFileSync(testFile, 'Test de contexte à ' + new Date().toISOString());
  console.log('6. Test d\'écriture de fichier: RÉUSSI');
  
  // Lire le fichier
  const content = fs.readFileSync(testFile, 'utf8');
  console.log('   Contenu du fichier:', content.trim());
  
  // Supprimer le fichier
  fs.unlinkSync(testFile);
  console.log('   Fichier de test supprimé');
} catch (error) {
  console.error('6. Test d\'écriture de fichier: ÉCHEC');
  console.error('   Erreur:', error.message);
}

console.log('=== Fin de la vérification ===');
