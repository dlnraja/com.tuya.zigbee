#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { glob } from 'glob';

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

/**
 * Exécute une commande shell avec affichage en temps réel
 * @param {string} cmd - Commande à exécuter
 * @param {string} [cwd=ROOT] - Répertoire d'exécution
 */
function run(cmd, cwd = ROOT) {
  console.log(chalk.gray('▶'), cmd);
  try {
    execSync(cmd, { stdio: 'inherit', cwd, shell: true });
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de l'exécution: ${cmd}`));
    console.error(chalk.red(error.message));
    return false;
  }
}

/**
 * Vérifie la syntaxe de tous les fichiers JavaScript
 */
async function checkAllJS() {
  console.log(chalk.blue('🔍 Vérification des fichiers JavaScript...'));
  
  // Fichiers à ignorer
  const ignorePatterns = [
    '**/node_modules/**',
    '**/.homey*/**',
    '**/coverage/**',
    '**/dist/**',
    '**/build/**',
    '**/archive/**',
    '**/backup/**'
  ];

  try {
    const files = await glob('**/*.js', { 
      cwd: ROOT, 
      ignore: ignorePatterns,
      nodir: true
    });

    let hasErrors = false;
    
    for (const file of files) {
      const fullPath = path.join(ROOT, file);
      try {
        run(`node --check "${fullPath}"`);
        console.log(chalk.green('✅'), file);
      } catch (e) {
        console.log(chalk.red('❌'), file);
        console.log(chalk.red('   →'), e.message.split('\n')[0]);
        hasErrors = true;
        
        // Proposition de correction
        console.log(chalk.yellow('   ℹ️  Pour corriger, utilisez:'));
        console.log(chalk.cyan(`   node scripts/fix-js.js "${file}"`));
        console.log('');
      }
    }

    if (hasErrors) {
      console.log(chalk.yellow('\n⚠️  Des erreurs ont été détectées. Corrigez-les avant de continuer.'));
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la vérification des fichiers:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

/**
 * Met à jour la version dans app.json et crée un tag Git
 */
async function updateVersion() {
  try {
    const appJsonPath = path.join(ROOT, 'app.json');
    const app = await fs.readJson(appJsonPath);
    
    // Incrémente le numéro de version (patch)
    const [maj, min, patch] = app.version.split('.').map(Number);
    const newVer = `${maj}.${min}.${patch + 1}`;
    
    // Met à jour la version dans app.json
    app.version = newVer;
    await fs.writeJson(appJsonPath, app, { spaces: 2 });
    
    console.log(chalk.green(`🆕 Version mise à jour: ${newVer}`));
    return newVer;
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la mise à jour de la version:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

/**
 * Fonction principale
 */
async function liveUpdate() {
  console.log(chalk.blue.bold('🚀 Live Update – Homey Tuya SDK3'));
  console.log(chalk.blue('==================================='));
  
  // 1. Vérification JS
  console.log('\n' + chalk.blue.bold('1️⃣  Vérification des fichiers JavaScript'));
  console.log(chalk.blue('-----------------------------------'));
  await checkAllJS();
  
  // 2. Validation Homey
  console.log('\n' + chalk.blue.bold('2️⃣  Validation de l\'application Homey'));
  console.log(chalk.blue('-----------------------------------'));
  if (!run('homey app validate --level debug')) {
    console.log(chalk.red('❌ La validation a échoué. Corrigez les erreurs avant de continuer.'));
    process.exit(1);
  }
  
  // 3. Traduction
  console.log('\n' + chalk.blue.bold('3️⃣  Mise à jour des traductions'));
  console.log(chalk.blue('-----------------------------------'));
  run('npx homey translate --force');
  
  // 4. Mise à jour de version et commit
  console.log('\n' + chalk.blue.bold('4️⃣  Mise à jour de version et commit'));
  console.log(chalk.blue('-----------------------------------'));
  const newVersion = await updateVersion();
  
  // Commit des changements
  run('git add .');
  run(`git commit -m "chore: mise à jour vers v${newVersion} [skip ci]"`);
  run(`git tag -a v${newVersion} -m "Version ${newVersion}"`);
  
  console.log('\n' + chalk.green.bold('✅ Mise à jour terminée avec succès !'));
  console.log(chalk.green(`🔖 Version ${newVersion} créée et taguée.`));
  console.log(chalk.yellow('💡 Pour pousser les changements, exécutez: git push --follow-tags'));
}

// Démarrer le processus
liveUpdate().catch(error => {
  console.error(chalk.red('❌ Erreur inattendue:'));
  console.error(chalk.red(error.stack || error.message));
  process.exit(1);
});
