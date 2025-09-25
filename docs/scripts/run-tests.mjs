#!/usr/bin/env node

/**
 * Script pour exécuter les tests automatisés et la validation des drivers
 * Ce script est conçu pour être exécuté dans le cadre du pipeline CI/CD
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const execAsync = promisify(exec);

// Configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '../');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const TEST_DIR = path.join(ROOT_DIR, 'test');
const JEST_CONFIG = path.join(ROOT_DIR, 'jest.config.js');

// Types de tests supportés
const TEST_TYPES = {
  UNIT: 'unit',
  INTEGRATION: 'integration',
  E2E: 'e2e',
  ALL: 'all'
};

// Options par défaut
const DEFAULT_OPTIONS = {
  type: TEST_TYPES.ALL,
  watch: false,
  coverage: true,
  verbose: false,
  updateSnapshots: false,
  testMatch: '**/*.test.js'
};

/**
 * Analyse les arguments de la ligne de commande
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = { ...DEFAULT_OPTIONS };
  
  for (const arg of args) {
    if (arg.startsWith('--type=')) {
      const type = arg.split('=')[1];
      if (Object.values(TEST_TYPES).includes(type)) {
        options.type = type;
      } else {
        console.warn(chalk.yellow(`Warning: Unknown test type '${type}'. Using '${options.type}' instead.`));
      }
    } else if (arg === '--watch') {
      options.watch = true;
    } else if (arg === '--no-coverage') {
      options.coverage = false;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--update-snapshots' || arg === '-u') {
      options.updateSnapshots = true;
    } else if (arg.startsWith('--testMatch=')) {
      options.testMatch = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else {
      console.warn(chalk.yellow(`Warning: Unknown argument '${arg}'`));
    }
  }
  
  return options;
}

/**
 * Affiche l'aide
 */
function showHelp() {
  console.log(`
${chalk.blue.bold('Test Runner for Tuya Zigbee Drivers')}

Usage: npm test -- [options]

Options:
  --type=<type>        Type de test à exécuter (${Object.values(TEST_TYPES).join('|')})
  --watch              Exécuter en mode watch
  --no-coverage        Désactiver la couverture de code
  --verbose            Afficher plus de détails
  --update-snapshots   Mettre à jour les snapshots
  --testMatch=<pattern> Modèle pour les fichiers de test (par défaut: **/*.test.js)
  --help, -h           Afficher cette aide
`);
}

/**
 * Vérifie si un fichier ou un répertoire existe
 */
async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Exécute une commande et gère la sortie
 */
async function runCommand(command, options = {}) {
  const { label = 'Running command', verbose = false } = options;
  
  if (verbose) {
    console.log(chalk.blue(`\n${label}: ${command}`));
  }
  
  try {
    const { stdout, stderr } = await execAsync(command, { 
      cwd: ROOT_DIR,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    
    if (stderr && verbose) {
      console.error(chalk.yellow(stderr));
    }
    
    if (stdout && (verbose || options.forceOutput)) {
      console.log(stdout);
    }
    
    return { success: true, stdout, stderr };
  } catch (error) {
    if (verbose) {
      console.error(chalk.red(`Error: ${error.message}`));
      
      if (error.stdout) {
        console.error(error.stdout);
      }
      
      if (error.stderr) {
        console.error(chalk.red(error.stderr));
      }
    }
    
    return { 
      success: false, 
      error,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

/**
 * Exécute les tests avec Jest
 */
async function runJestTests(options) {
  const { type, watch, coverage, updateSnapshots, testMatch, verbose } = options;
  
  // Construire la commande Jest
  let cmd = 'npx jest';
  
  if (watch) {
    cmd += ' --watch';
  }
  
  if (coverage) {
    cmd += ' --coverage';
    cmd += ' --coverageReporters=json-summary';
    cmd += ' --coverageReporters=lcov';
    cmd += ' --coverageReporters=text';
    cmd += ' --coverageReporters=text-summary';
  }
  
  if (updateSnapshots) {
    cmd += ' -u';
  }
  
  if (verbose) {
    cmd += ' --verbose';
  }
  
  // Filtrer par type de test
  if (type !== TEST_TYPES.ALL) {
    cmd += ` --testPathPattern="${type}"`;
  }
  
  // Spécifier le modèle de correspondance des tests
  if (testMatch) {
    cmd += ` --testMatch="**/${testMatch}"`;
  }
  
  // Exécuter les tests
  const { success } = await runCommand(cmd, { 
    label: 'Running tests',
    verbose: true,
    forceOutput: true
  });
  
  return success;
}

/**
 * Valide la structure des drivers
 */
async function validateDrivers() {
  console.log(chalk.blue('\nValidating drivers...'));
  
  try {
    const drivers = await fs.readdir(DRIVERS_DIR, { withFileTypes: true });
    const driverDirs = drivers
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(chalk.blue(`Found ${driverDirs.length} driver directories`));
    
    let validCount = 0;
    const invalidDrivers = [];
    
    // Vérifier chaque driver
    for (const driverDir of driverDirs) {
      const driverPath = path.join(DRIVERS_DIR, driverDir);
      const driverJsonPath = path.join(driverPath, 'driver.compose.json');
      
      try {
        // Vérifier si le fichier de configuration existe
        if (!await exists(driverJsonPath)) {
          throw new Error(`Missing driver.compose.json in ${driverDir}`);
        }
        
        // Lire et valider le fichier de configuration
        const config = JSON.parse(await fs.readFile(driverJsonPath, 'utf8'));
        
        // Vérifier les champs obligatoires
        const requiredFields = ['id', 'name', 'description', 'version'];
        const missingFields = requiredFields.filter(field => !config[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Vérifier si le fichier device.js existe
        const deviceJsPath = path.join(driverPath, 'device.js');
        if (!await exists(deviceJsPath)) {
          throw new Error('Missing device.js file');
        }
        
        // Vérifier si le fichier driver.js existe
        const driverJsPath = path.join(driverPath, 'driver.js');
        if (!await exists(driverJsPath)) {
          throw new Error('Missing driver.js file');
        }
        
        // Vérifier si le README.md existe
        const readmePath = path.join(driverPath, 'README.md');
        if (!await exists(readmePath)) {
          console.warn(chalk.yellow(`  Warning: Missing README.md in ${driverDir}`));
        }
        
        validCount++;
        console.log(chalk.green(`  ✓ ${driverDir} is valid`));
        
      } catch (error) {
        console.error(chalk.red(`  ✗ ${driverDir}: ${error.message}`));
        invalidDrivers.push({ driver: driverDir, error: error.message });
      }
    }
    
    // Afficher un résumé
    console.log('\n' + chalk.blue.bold('=== Validation Summary ==='));
    console.log(`Total drivers: ${driverDirs.length}`);
    console.log(`Valid: ${chalk.green(validCount)}`);
    
    if (invalidDrivers.length > 0) {
      console.log(`Invalid: ${chalk.red(invalidDrivers.length)}`);
      console.log('\nInvalid drivers:');
      
      for (const { driver, error } of invalidDrivers) {
        console.log(`  ${chalk.red('✗')} ${chalk.bold(driver)}: ${error}`);
      }
      
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error(chalk.red('Error validating drivers:'), error);
    return false;
  }
}

/**
 * Fonction principale
 */
async function main() {
  console.log(chalk.blue.bold('\n=== Tuya Zigbee Test Runner ===\n'));
  
  // Analyser les arguments
  const options = parseArgs();
  
  // Vérifier les dépendances
  try {
    await runCommand('node --version', { verbose: true });
    await runCommand('npm --version', { verbose: true });
  } catch (error) {
    console.error(chalk.red('Error: Node.js and npm must be installed to run this script'));
    process.exit(1);
  }
  
  // Valider la structure des drivers
  const validationPassed = await validateDrivers();
  
  if (!validationPassed) {
    console.error(chalk.red.bold('\n✗ Driver validation failed. Please fix the issues and try again.'));
    process.exit(1);
  }
  
  // Exécuter les tests
  console.log(chalk.blue.bold('\n=== Running Tests ===\n'));
  
  const testPassed = await runJestTests(options);
  
  if (!testPassed) {
    console.error(chalk.red.bold('\n✗ Some tests failed. Please fix the issues and try again.'));
    process.exit(1);
  }
  
  console.log(chalk.green.bold('\n✓ All tests passed successfully!'));
}

// Exécuter le script
main().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
