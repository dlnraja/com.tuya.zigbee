// Script de diagnostic pour le projet Tuya Zigbee
console.log('=== DIAGNOSTIC DU PROJET TUYA ZIGBEE ===\n');

// Vérifier la version de Node.js
console.log('1. Vérification de la version de Node.js:');
console.log(`- Version: ${process.version}`);
console.log(`- Plateforme: ${process.platform} ${process.arch}`);
console.log(`- Dossier courant: ${process.cwd()}\n`);

// Vérifier les variables d'environnement
console.log('2. Variables d\'environnement:');
console.log(`- NODE_ENV: ${process.env.NODE_ENV || 'non défini'}`);
console.log(`- PATH: ${process.env.PATH ? 'défini' : 'non défini'}`);
console.log(`- HOME: ${process.env.HOME || process.env.USERPROFILE || 'non défini'}\n`);

// Tester l'accès au système de fichiers
console.log('3. Test d\'accès au système de fichiers:');
try {
  const testFile = __filename;
  const stats = require('fs').statSync(testFile);
  console.log(`- Accès au fichier: OK (${testFile})`);
  console.log(`- Taille: ${stats.size} octets`);
  console.log('- Droits: ' + (stats.mode & 0o200 ? 'lecture/écriture' : 'lecture seule'));
} catch (error) {
  console.error('- Erreur d\'accès au système de fichiers:', error.message);
}
console.log();

// Tester les modules natifs
console.log('4. Test des modules natifs:');
const nativeModules = ['fs', 'path', 'child_process', 'util'];
nativeModules.forEach(module => {
  try {
    require(module);
    console.log(`- ${module}: OK`);
  } catch (error) {
    console.error(`- ${module}: ERREUR - ${error.message}`);
  }
});
console.log();

// Tester l'exécution de commandes
console.log('5. Test d\'exécution de commandes:');
try {
  const { execSync } = require('child_process');
  const nodeVersion = execSync('node --version').toString().trim();
  console.log(`- Version de Node.js (via commande): ${nodeVersion}`);
  
  const npmVersion = execSync('npm --version').toString().trim();
  console.log(`- Version de npm: ${npmVersion}`);
  
  console.log('- Commande echo de test:');
  console.log('  ' + execSync('echo Test d\'exécution de commande').toString().trim());
} catch (error) {
  console.error('- Erreur lors de l\'exécution des commandes:', error.message);
}
console.log();

// Vérifier les permissions
console.log('6. Vérification des permissions:');
try {
  const testWrite = path.join(__dirname, 'test-permission.tmp');
  require('fs').writeFileSync(testWrite, 'test');
  require('fs').unlinkSync(testWrite);
  console.log('- Écriture dans le dossier du projet: OK');
} catch (error) {
  console.error('- Impossible d\'écrire dans le dossier du projet:', error.message);
}

console.log('\n=== FIN DU DIAGNOSTIC ===');
