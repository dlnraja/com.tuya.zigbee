// Cross-platform Node.js version of scripts/verify-node-env.bat
// Checks Node installation, basic FS access, network connectivity, and npm dependencies

const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');

function logSection(title) {
  console.log('\n' + '='.repeat(3) + ' ' + title + ' ' + '='.repeat(3));
}

function testNetworkConnectivity(url = 'https://www.google.com/generate_204', timeoutMs = 4000) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      // Any response indicates connectivity
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

(async function main() {
  console.log('=== Vérification de l\'environnement Node.js ===');

  // 1. Node.js version
  logSection('1. Vérification de la version de Node.js');
  try {
    console.log(`Node.js: ${process.version}`);
  } catch (e) {
    console.error('❌ Erreur lors de la vérification de la version de Node.js.');
    process.exit(1);
  }

  // 2. File system access
  logSection('2. Vérification de l\'accès au système de fichiers');
  try {
    const testFile = 'test-file.txt';
    fs.writeFileSync(testFile, 'test');
    if (fs.existsSync(testFile)) {
      console.log('✅ Écriture de fichier réussie');
      fs.unlinkSync(testFile);
    } else {
      console.error('❌ Impossible d\'écrire dans le répertoire courant.');
      console.error(`Vérifiez les permissions du dossier: ${process.cwd()}`);
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Erreur lors du test d\'écriture de fichier:', e.message);
    process.exit(1);
  }

  // 3. Network connectivity
  logSection('3. Vérification de l\'accès réseau');
  const online = await testNetworkConnectivity();
  if (online) {
    console.log('✅ Connexion Internet fonctionnelle');
  } else {
    console.warn('⚠ Impossible de se connecter à Internet. Certaines fonctionnalités pourraient ne pas fonctionner.');
  }

  // 4. Dependencies
  logSection('4. Vérification des dépendances');
  try {
    const out = execSync('npm list --depth=0', { stdio: 'pipe', encoding: 'utf8' });
    console.log(out.trim());
    console.log('✅ Les dépendances semblent correctement installées');
  } catch (e) {
    console.warn('⚠ Des problèmes ont été détectés avec les dépendances.');
    console.warn("Essayez d'exécuter: npm install");
  }

  console.log('\n=== Vérification terminée ===');
})();
