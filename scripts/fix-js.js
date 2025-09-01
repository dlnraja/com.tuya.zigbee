#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Vérification des arguments
const filePath = process.argv[2];
if (!filePath) {
  console.error(chalk.red('❌ Usage: node scripts/fix-js.js <chemin/vers/fichier.js>'));
  console.error(chalk.yellow('\nExemples:'));
  console.error(chalk.cyan('   node scripts/fix-js.js drivers/tuya/device.js'));
  console.error(chalk.cyan('   node scripts/fix-js.js "chemin/avec/espaces/fichier.js"'));
  process.exit(1);
}

// Vérification de l'existence du fichier
const fullPath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
if (!fs.existsSync(fullPath)) {
  console.error(chalk.red(`❌ Le fichier n'existe pas: ${fullPath}`));
  process.exit(1);
}

// Vérification de l'extension
if (!fullPath.endsWith('.js')) {
  console.error(chalk.red('❌ Le fichier doit avoir une extension .js'));
  process.exit(1);
}

// Création d'une sauvegarde
const backupPath = `${fullPath}.bak`;
fs.copyFileSync(fullPath, backupPath);
console.log(chalk.yellow(`📦 Sauvegarde créée: ${backupPath}`));

try {
  // Lire le contenu du fichier
  const code = fs.readFileSync(fullPath, 'utf8');
  
  // Afficher les informations pour l'utilisateur
  console.log('\n' + chalk.blue.bold('🔧 Correction du fichier: ') + chalk.cyan(filePath));
  console.log(chalk.blue('-----------------------------------'));
  
  // Afficher les 10 premières lignes du fichier
  const lines = code.split('\n').slice(0, 10);
  console.log(chalk.gray(lines.join('\n') + '\n...'));
  
  console.log('\n' + chalk.yellow.bold('🛠️  Instructions pour la correction:'));
  console.log(chalk.yellow('1. Copiez le contenu ci-dessus dans votre éditeur'));
  console.log(chalk.yellow('2. Demandez à l\'IA de corriger le code pour Homey SDK3'));
  console.log(chalk.yellow('3. Collez le code corrigé ci-dessous et enregistrez'));
  console.log(chalk.yellow('4. Pour annuler, supprimez le fichier et renommez le .bak en .js'));
  
  // Demander à l'utilisateur de coller le code corrigé
  console.log('\n' + chalk.blue.bold('📝 Collez le code corrigé ci-dessous (tapez Ctrl+D quand terminé):'));
  console.log(chalk.blue('-----------------------------------'));
  
  // Lire l'entrée utilisateur (code corrigé)
  let fixedCode = '';
  process.stdin.setEncoding('utf8');
  
  process.stdin.on('data', (chunk) => {
    fixedCode += chunk;
  });
  
  process.stdin.on('end', () => {
    if (!fixedCode.trim()) {
      console.log(chalk.yellow('❌ Aucun code fourni. Annulation.'));
      process.exit(0);
    }
    
    try {
      // Écrire le code corrigé
      fs.writeFileSync(fullPath, fixedCode, 'utf8');
      console.log(chalk.green('\n✅ Fichier mis à jour avec succès !'));
      
      // Vérifier la syntaxe du fichier corrigé
      console.log(chalk.blue('\n🔍 Vérification de la syntaxe...'));
      const { execSync } = require('child_process');
      
      try {
        execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
        console.log(chalk.green('✅ La syntaxe du fichier est valide !'));
        
        // Supprimer la sauvegarde si tout est OK
        fs.unlinkSync(backupPath);
        console.log(chalk.green('🗑️  Fichier de sauvegarde supprimé.'));
        
      } catch (syntaxError) {
        console.error(chalk.red('❌ Erreur de syntaxe détectée dans le code corrigé :'));
        console.error(chalk.red(syntaxError.message.split('\n').slice(0, 5).join('\n')));
        
        // Restaurer la version précédente
        fs.copyFileSync(backupPath, fullPath);
        console.log(chalk.yellow('🔄 Fichier restauré à sa version précédente.'));
        console.log(chalk.yellow('💡 Essayez de corriger à nouveau le fichier manuellement.'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Erreur lors de l\'écriture du fichier :'));
      console.error(chalk.red(error.message));
    }
    
    process.exit(0);
  });
  
} catch (error) {
  console.error(chalk.red('❌ Erreur lors de la lecture du fichier :'));
  console.error(chalk.red(error.message));
  process.exit(1);
}
