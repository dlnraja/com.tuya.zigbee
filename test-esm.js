// Test pour vérifier l'exécution en mode ES Module
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le chemin du répertoire actuel en ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== Test ES Module ===');
console.log('1. Import ES Module fonctionnel');

// Tester l'écriture de fichier
try {
  const testFile = path.join(__dirname, 'test-esm-output.txt');
  
  // Écrire dans un fichier
  await fs.promises.writeFile(testFile, `Test ES Module réussi à ${new Date().toISOString()}`);
  console.log('2. Écriture de fichier réussie');
  
  // Lire le fichier
  const content = await fs.promises.readFile(testFile, 'utf8');
  console.log('3. Lecture de fichier réussie');
  console.log('   Contenu:', content.trim());
  
  // Supprimer le fichier
  await fs.promises.unlink(testFile);
  console.log('4. Fichier de test supprimé');
  
  console.log('=== Test réussi ===');
} catch (error) {
  console.error('ERREUR:', error.message);
  process.exit(1);
}
