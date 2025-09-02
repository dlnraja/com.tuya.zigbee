// Script de test pour vérifier le bon fonctionnement de Node.js et des dépendances
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.green.bold('=== Test de scan du projet ==='));
console.log(chalk.blue('Répertoire courant:'), process.cwd());
console.log(chalk.blue('Chemin du script:'), __filename);

// Tester l'accès au système de fichiers
try {
  const files = await fs.readdir('.');
  console.log(chalk.green('✅ Accès au système de fichiers réussi'));
  console.log(chalk.blue('Fichiers dans le répertoire racine:'));
  console.log(files.slice(0, 10).join('\n'));
  if (files.length > 10) console.log(`...et ${files.length - 10} autres fichiers`);
} catch (error) {
  console.error(chalk.red('❌ Erreur d\'accès au système de fichiers:'), error.message);
}

// Tester l'accès au répertoire des drivers
try {
  const drivers = await fs.readdir('./drivers');
  console.log(chalk.green(`✅ ${drivers.length} dossiers de drivers trouvés`));
} catch (error) {
  console.error(chalk.red('❌ Erreur d\'accès au répertoire des drivers:'), error.message);
}

// Tester l'accès au fichier package.json
try {
  const pkg = await fs.readJson('./package.json');
  console.log(chalk.green(`✅ Fichier package.json chargé (version ${pkg.version})`));
} catch (error) {
  console.error(chalk.red('❌ Erreur de lecture du package.json:'), error.message);
}

console.log(chalk.green.bold('=== Fin du test ==='));
