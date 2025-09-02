#!/usr/bin/env node

/**
 * Script pour exécuter les vérifications de qualité du code
 * Ce script est conçu pour être exécuté dans le cadre du pipeline CI/CD
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  eslint: {
    extensions: ['js', 'jsx', 'ts', 'tsx'],
    dirs: ['src', 'scripts', 'test'],
    cmd: 'npx eslint --max-warnings=0 --ext .js,.jsx,.ts,.tsx',
    success: '✓ ESLint passed with no issues',
    error: '✗ ESLint found issues that need to be fixed'
  },
  prettier: {
    extensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'md', 'yaml', 'yml'],
    dirs: ['.'],
    cmd: 'npx prettier --check',
    success: '✓ Prettier formatting is correct',
    error: '✗ Prettier found files that need formatting'
  },
  typecheck: {
    cmd: 'npx tsc --noEmit',
    success: '✓ TypeScript type checking passed',
    error: '✗ TypeScript found type errors'
  },
  test: {
    cmd: 'npx jest --coverage --coverageReporters=json-summary --coverageReporters=lcov --coverageReporters=text --coverageReporters=text-summary',
    success: '✓ All tests passed',
    error: '✗ Some tests failed'
  }
};

/**
 * Exécute une commande et gère la sortie
 */
async function runCommand(name, config) {
  console.log(chalk.blue(`\nRunning ${name}...`));
  
  try {
    const { stdout, stderr } = await execAsync(config.cmd);
    
    if (stderr) {
      console.error(chalk.yellow(stderr));
    }
    
    console.log(chalk.green(config.success));
    
    if (stdout) {
      console.log(stdout);
    }
    
    return true;
  } catch (error) {
    console.error(chalk.red(config.error));
    
    if (error.stdout) {
      console.error(error.stdout);
    }
    
    if (error.stderr) {
      console.error(chalk.red(error.stderr));
    }
    
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue.bold('\n=== Running Code Quality Checks ===\n'));
  
  // Vérifier les dépendances
  try {
    await execAsync('node --version');
    await execAsync('npm --version');
  } catch (error) {
    console.error(chalk.red('Error: Node.js and npm must be installed to run this script'));
    process.exit(1);
  }
  
  // Exécuter les vérifications
  const results = {
    eslint: await runCommand('ESLint', CONFIG.eslint),
    prettier: await runCommand('Prettier', CONFIG.prettier),
    typecheck: await runCommand('Type Checking', CONFIG.typecheck),
    test: await runCommand('Tests', CONFIG.test)
  };
  
  // Afficher un résumé
  console.log('\n' + chalk.blue.bold('=== Summary ==='));
  console.log(`ESLint:      ${results.eslint ? chalk.green('PASSED') : chalk.red('FAILED')}`);
  console.log(`Prettier:    ${results.prettier ? chalk.green('PASSED') : chalk.red('FAILED')}`);
  console.log(`Type Check:  ${results.typecheck ? chalk.green('PASSED') : chalk.red('FAILED')}`);
  console.log(`Tests:       ${results.test ? chalk.green('PASSED') : chalk.red('FAILED')}`);
  
  // Retourner un code d'erreur si une vérification a échoué
  const allPassed = Object.values(results).every(Boolean);
  
  if (!allPassed) {
    console.error(chalk.red.bold('\n✗ Some checks failed. Please fix the issues and try again.'));
    process.exit(1);
  }
  
  console.log(chalk.green.bold('\n✓ All checks passed successfully!'));
}

// Exécuter le script
main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
