// Script de test pour vérifier l'environnement Node.js
console.log('=== Test de l\'environnement Node.js ===');

// Afficher des informations de base
console.log('1. Version de Node.js:', process.version);
console.log('2. Plateforme:', process.platform, process.arch);
console.log('3. Répertoire courant:', process.cwd());

// Tester l'accès au système de fichiers
console.log('\n=== Test d\'accès au système de fichiers ===');
try {
  const fs = require('fs');
  const path = require('path');
  
  // Créer un fichier de test
  const testFile = path.join(__dirname, 'test-file.txt');
  fs.writeFileSync(testFile, 'Test réussi à ' + new Date().toISOString());
  console.log('1. Fichier créé avec succès');
  
  // Lire le fichier
  const content = fs.readFileSync(testFile, 'utf8');
  console.log('2. Fichier lu avec succès');
  console.log('   Contenu:', content.trim());
  
  // Supprimer le fichier
  fs.unlinkSync(testFile);
  console.log('3. Fichier supprimé avec succès');
  
  console.log('\n✅ Tous les tests ont réussi !');
} catch (error) {
  console.error('\n❌ Erreur lors du test du système de fichiers:');
  console.error(error);
}

// Tester l'accès réseau
console.log('\n=== Test de connexion réseau ===');
const https = require('https');
const req = https.get('https://www.google.com', (res) => {
  console.log(`1. Test de connexion à Google: Statut ${res.statusCode}`);
  
  // Tester l'installation d'axios
  try {
    const axios = require('axios');
    console.log('2. Axios est installé et fonctionne');
  } catch (error) {
    console.error('2. Erreur avec Axios:', error.message);
  }
  
  // Tester l'installation d'uuid
  try {
    const { v4: uuidv4 } = require('uuid');
    console.log('3. UUID est installé et fonctionne');
    console.log('   Exemple d\'UUID:', uuidv4());
  } catch (error) {
    console.error('3. Erreur avec UUID:', error.message);
  }
});

req.on('error', (error) => {
  console.error('Erreur de connexion réseau:', error.message);
});
