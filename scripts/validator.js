#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPORT_FILE = path.join(process.cwd(), 'validation-report.json');

async function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      stdio: 'pipe',
      encoding: 'utf-8',
      ...options
    });
    return { success: true, output: result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

async function validateHomeyApp() {
  console.log(chalk.blue('🔍 Validation de l\'application Homey...'));
  
  // Vérifier si homey-cli est installé
  const { success: isHomeyCliInstalled } = await runCommand('homey --version');
  if (!isHomeyCliInstalled) {
    console.error(chalk.red('❌ Homey CLI n\'est pas installé. Installez-le avec:'));
    console.error(chalk.cyan('   npm install -g homey'));
    process.exit(1);
  }
  
  // Valider l'application
  console.log(chalk.blue('\n🏗️  Validation de la structure de l\'application...'));
  const validation = await runCommand('homey app validate --level=debug');
  
  if (!validation.success) {
    console.error(chalk.red('❌ Échec de la validation:'));
    console.error(validation.stderr || validation.error);
    
    // Essayer d'extraire les erreurs spécifiques
    const errorMatch = validation.stderr?.match(/✖ (.*)/);
    if (errorMatch) {
      console.error('\n' + chalk.red.bold('Erreurs détectées:'));
      console.error(chalk.red(`- ${errorMatch[1]}`));
    }
    
    return {
      success: false,
      error: 'La validation a échoué',
      details: validation.stderr || validation.error
    };
  }
  
  console.log(chalk.green('✅ Validation réussie !'));
  return { success: true };
}

async function checkCodeStyle() {
  console.log(chalk.blue('\n🎨 Vérification du style de code...'));
  
  // Vérifier si ESLint est installé
  const { success: isEslintInstalled } = await runCommand('eslint --version');
  if (!isEslintInstalled) {
    console.log(chalk.yellow('⚠️  ESLint n\'est pas installé. Installation...'));
    await runCommand('npm install --save-dev eslint eslint-config-airbnb-base eslint-plugin-import');
  }
  
  // Exécuter ESLint
  const eslintResult = await runCommand('npx eslint . --ext .js --fix-dry-run --format json');
  
  if (!eslintResult.success) {
    try {
      const issues = JSON.parse(eslintResult.stdout || '[]');
      const errorCount = issues.reduce((sum, file) => sum + file.errorCount, 0);
      const warningCount = issues.reduce((sum, file) => sum + file.warningCount, 0);
      
      console.log(chalk.yellow(`⚠️  ${errorCount} erreur(s) et ${warningCount} avertissement(s) trouvés`));
      
      // Afficher un résumé des erreurs
      issues.forEach(file => {
        if (file.messages.length > 0) {
          console.log(`\n${chalk.bold(file.filePath)}:`);
          file.messages.forEach(msg => {
            const color = msg.severity === 2 ? chalk.red : chalk.yellow;
            console.log(`  ${color(`${msg.line}:${msg.column}`)} - ${msg.message} (${msg.ruleId || 'syntax'})`);
          });
        }
      });
      
      return {
        success: errorCount === 0,
        errorCount,
        warningCount,
        issues
      };
    } catch (error) {
      console.error(chalk.red('❌ Erreur lors de l\'analyse du code:'), error);
      return { success: false, error: error.message };
    }
  }
  
  console.log(chalk.green('✅ Aucune erreur de style détectée'));
  return { success: true };
}

async function checkDependencies() {
  console.log(chalk.blue('\n📦 Vérification des dépendances...'));
  
  // Vérifier les dépendances obsolètes
  const { success: isNpmCheckInstalled } = await runCommand('npx npm-check --version');
  if (!isNpmCheckInstalled) {
    console.log(chalk.yellow('⚠️  npm-check n\'est pas installé. Installation...'));
    await runCommand('npm install --save-dev npm-check');
  }
  
  const checkResult = await runCommand('npx npm-check --skip-unused --no-emoji --json');
  
  if (checkResult.success) {
    try {
      const data = JSON.parse(checkResult.stdout);
      const outdated = data.dependencies.filter(dep => dep.bump);
      
      if (outdated.length > 0) {
        console.log(chalk.yellow(`⚠️  ${outdated.length} dépendance(s) obsolète(s) trouvée(s):`));
        
        outdated.forEach(dep => {
          console.log(`\n${chalk.bold(dep.moduleName)}:`);
          console.log(`  Installé: ${dep.installed}`);
          console.log(`  Dernière version: ${dep.latest}`);
          console.log(`  Lien: ${dep.homepage}`);
        });
        
        return {
          success: true,
          hasOutdated: true,
          outdated
        };
      }
      
      console.log(chalk.green('✅ Toutes les dépendances sont à jour'));
      return { success: true, hasOutdated: false };
      
    } catch (error) {
      console.error(chalk.red('❌ Erreur lors de l\'analyse des dépendances:'), error);
      return { success: false, error: error.message };
    }
  }
  
  console.error(chalk.red('❌ Impossible de vérifier les dépendances'));
  return { success: false, error: 'Échec de la vérification des dépendances' };
}

async function generateReport(validation, codeStyle, dependencies) {
  const report = {
    timestamp: new Date().toISOString(),
    validation,
    codeStyle,
    dependencies,
    summary: {
      isValid: validation.success,
      hasStyleIssues: !codeStyle.success,
      hasOutdatedDeps: dependencies.hasOutdated,
      errorCount: codeStyle.errorCount || 0,
      warningCount: codeStyle.warningCount || 0,
      outdatedDepsCount: dependencies.outdated?.length || 0
    }
  };
  
  await fs.writeJson(REPORT_FILE, report, { spaces: 2 });
  return report;
}

async function main() {
  console.log(chalk.cyan.bold('\n🔍 Démarrage de la validation du projet...\n'));
  
  try {
    // Exécuter les validations
    const validation = await validateHomeyApp();
    const codeStyle = await checkCodeStyle();
    const dependencies = await checkDependencies();
    
    // Générer le rapport
    const report = await generateReport(validation, codeStyle, dependencies);
    
    // Afficher le résumé
    console.log('\n' + '='.repeat(60));
    console.log(chalk.green.bold('\n✅ Validation terminée !'));
    console.log(chalk.cyan(`📊 Résumé:`));
    console.log(`  - ${validation.success ? '✅' : '❌'} Validation Homey: ${validation.success ? 'Réussie' : 'Échouée'}`);
    console.log(`  - ${codeStyle.success ? '✅' : '⚠️ '} Style de code: ${codeStyle.success ? 'OK' : 'Problèmes détectés'}`);
    console.log(`  - ${!dependencies.hasOutdated ? '✅' : '⚠️ '} Dépendances: ${dependencies.hasOutdated ? 'Mises à jour disponibles' : 'À jour'}`);
    
    if (!validation.success || !codeStyle.success || dependencies.hasOutdated) {
      console.log('\n' + chalk.yellow.bold('📋 Actions recommandées:'));
      
      if (!validation.success) {
        console.log('  - Corrigez les erreurs de validation Homey');
      }
      
      if (!codeStyle.success) {
        console.log(`  - Exécutez ${chalk.cyan('npx eslint . --ext .js --fix')} pour corriger automatiquement les problèmes de style`);
      }
      
      if (dependencies.hasOutdated) {
        console.log(`  - Exécutez ${chalk.cyan('npx npm-check -u')} pour mettre à jour les dépendances`);
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Erreur lors de la validation:'), error);
    process.exit(1);
  }
}

main();
