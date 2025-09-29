// Script de test pour vérifier le bon fonctionnement de Node.js et des dépendances
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.green.bold('=== Test de scan du projet ==='));
console.log(chalk.blue('Répertoire courant:'), process.cwd());
console.log(chalk.blue('Chemin du script:'), __filename);

// Tester l'accès au système de fichiers
fs.readdir('.')
  .then(files => {
    console.log(chalk.green('✅ Accès au système de fichiers réussi'));
    console.log(chalk.blue('Fichiers dans le répertoire racine:'));
    console.log(files.slice(0, 10).join('\n'));
    if (files.length > 10) console.log(`...et ${files.length - 10} autres fichiers`);
    
    // Tester l'accès au répertoire des drivers
    return fs.readdir('./drivers')
      .then(drivers => {
        console.log(chalk.green(`✅ ${drivers.length} dossiers de drivers trouvés`));
        return fs.readJson('./package.json');
      })
      .then(pkg => {
        console.log(chalk.green(`✅ Fichier package.json chargé (version ${pkg.version})`));
      })
      .catch(error => {
        console.error(chalk.red('❌ Erreur lors des tests:'), error.message);
      });
  })
  .catch(error => {
    console.error(chalk.red('❌ Erreur d\'accès au système de fichiers:'), error.message);
  })
  .finally(() => {
    console.log(chalk.green.bold('=== Fin du test ==='));
  });
