const { execSync } = require('child_process');
const fs = require('fs');

console.log('=== Installation des dépendances ===');

// Liste des dépendances principales à installer
const mainDeps = [
  'axios@1.6.2',
  'uuid@9.0.0',
  'chalk@5.3.0',
  'eslint@8.55.0',
  'eslint-config-airbnb-base@15.0.0',
  'eslint-plugin-import@2.29.0',
  'fs-extra@11.1.1',
  'glob@10.3.3',
  'npm-check@6.0.1',
  'terser@5.23.0'
];

function runCommand(command) {
  try {
    console.log(`Exécution: ${command}`);
    const output = execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Erreur lors de l'exécution: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Créer un package.json temporaire s'il n'existe pas
if (!fs.existsSync('package.json')) {
  console.log('Création d\'un package.json de base...');
  fs.writeFileSync('package.json', JSON.stringify({
    "name": "tuya-zigbee-temp",
    "version": "1.0.0",
    "private": true,
    "dependencies": {}
  }, null, 2));
}

// Installer les dépendances principales
console.log('\nInstallation des dépendances principales...');
const installCmd = `npm install --save ${mainDeps.join(' ')}`;
if (!runCommand(installCmd)) {
  console.error('Échec de l\'installation des dépendances principales');
  process.exit(1);
}

console.log('\n=== Installation terminée avec succès ===');
console.log('Vous pouvez maintenant exécuter: npm start');
