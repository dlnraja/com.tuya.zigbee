#!/usr/bin/env node

/**
 * Script de synchronisation de la version lite du projet Tuya Zigbee
 * Ce script crée une version allégée du projet dans le dossier 'tuya-light'
 * en ne conservant que les drivers, la documentation essentielle et les fichiers nécessaires
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '../');
const LITE_DIR = path.join(ROOT_DIR, 'tuya-light');
const EXCLUDED_DIRS = [
  'node_modules',
  '.github',
  '.git',
  'scripts',
  'tools',
  'tests',
  'coverage',
  '.vscode',
  '.idea',
  'temp',
  'tmp'
];

const EXCLUDED_FILES = [
  '.gitignore',
  '.eslintrc.js',
  '.eslintrc.json',
  '.prettierrc',
  '.mocharc.json',
  '.nycrc.json',
  'tsconfig.json',
  'package-lock.json',
  'yarn.lock',
  '*.log',
  '*.md',
  '*.mdx',
  '*.txt',
  '*.yml',
  '*.yaml',
  '*.json',
  '*.js',
  '*.ts',
  '*.sh',
  '*.bat',
  '*.ps1',
  '*.psm1',
  '*.psd1',
  '*.ps1xml',
  '*.pssc',
  '*.psc1',
  '*.pssc',
  '*.cdxml',
  '*.xaml'
];

/**
 * Vérifie si un chemin correspond à un motif d'exclusion
 */
function isExcluded(filePath, baseDir) {
  const relativePath = path.relative(baseDir, filePath);
  const pathParts = relativePath.split(path.sep);
  
  // Vérifier les dossiers exclus
  for (const part of pathParts) {
    if (EXCLUDED_DIRS.includes(part)) {
      return true;
    }
  }
  
  // Vérifier les fichiers exclus
  const fileName = path.basename(filePath);
  for (const pattern of EXCLUDED_FILES) {
    if (pattern.startsWith('*.')) {
      const ext = pattern.substring(1);
      if (fileName.endsWith(ext)) {
        return true;
      }
    } else if (fileName === pattern) {
      return true;
    }
  }
  
  return false;
}

/**
 * Copie récursivement un dossier en excluant certains fichiers et dossiers
 */
async function copyDir(src, dest, baseDir) {
  try {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (isExcluded(srcPath, baseDir)) {
        console.log(chalk.gray(`  Excluding: ${srcPath}`));
        continue;
      }
      
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath, baseDir);
      } else {
        await fs.copyFile(srcPath, destPath);
        console.log(chalk.green(`  Copied: ${srcPath} → ${destPath}`));
      }
    }
  } catch (error) {
    console.error(chalk.red(`Error copying directory ${src}:`), error);
    throw error;
  }
}

/**
 * Crée un fichier package.json minimal pour la version lite
 */
async function createLitePackageJson() {
  try {
    const packageJsonPath = path.join(ROOT_DIR, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
    
    // Créer un package.json minimal
    const litePackageJson = {
      name: packageJson.name + '-lite',
      version: packageJson.version,
      description: 'Lite version of ' + (packageJson.description || packageJson.name),
      main: 'app.js',
      scripts: {
        start: 'homey app run',
        build: 'homey app build',
        validate: 'homey app validate'
      },
      dependencies: {
        'homey': packageJson.dependencies.homey || '^3.0.0',
        'homey-zigbeedriver': packageJson.dependencies['homey-zigbeedriver'] || '^1.0.0',
        'homey-meshdriver': packageJson.dependencies['homey-meshdriver'] || '^1.0.0'
      },
      engines: {
        node: '>=14.0.0'
      },
      private: true
    };
    
    // Écrire le fichier package.json dans le dossier lite
    await fs.writeFile(
      path.join(LITE_DIR, 'package.json'),
      JSON.stringify(litePackageJson, null, 2),
      'utf8'
    );
    
    console.log(chalk.green('✓ Created lite package.json'));
  } catch (error) {
    console.error(chalk.red('Error creating lite package.json:'), error);
    throw error;
  }
}

/**
 * Met à jour le fichier app.json pour la version lite
 */
async function updateLiteAppJson() {
  try {
    const appJsonPath = path.join(ROOT_DIR, 'app.json');
    const appJson = JSON.parse(await fs.readFile(appJsonPath, 'utf8'));
    
    // Mettre à jour les métadonnées pour indiquer qu'il s'agit de la version lite
    if (appJson.name && typeof appJson.name === 'object') {
      for (const lang in appJson.name) {
        if (appJson.name.hasOwnProperty(lang)) {
          appJson.name[lang] = `[LITE] ${appJson.name[lang]}`;
        }
      }
    }
    
    if (appJson.description && typeof appJson.description === 'object') {
      for (const lang in appJson.description) {
        if (appJson.description.hasOwnProperty(lang)) {
          appJson.description[lang] = `[LITE] ${appJson.description[lang]}`;
        }
      }
    }
    
    // Écrire le fichier app.json dans le dossier lite
    await fs.writeFile(
      path.join(LITE_DIR, 'app.json'),
      JSON.stringify(appJson, null, 2),
      'utf8'
    );
    
    console.log(chalk.green('✓ Updated lite app.json'));
  } catch (error) {
    console.error(chalk.red('Error updating lite app.json:'), error);
    throw error;
  }
}

/**
 * Crée un README pour la version lite
 */
async function createLiteReadme() {
  const readmeContent = `# Tuya Zigbee Lite

This is the lightweight version of the Tuya Zigbee project, containing only essential drivers and documentation.

## Features

- Lightweight version with essential drivers only
- Optimized for production use
- Regular updates from the main repository

## Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the app:
   \`\`\`bash
   npm run build
   \`\`\`

## Updating

This version is automatically updated from the main repository. To update:

1. Pull the latest changes:
   \`\`\`bash
   git pull
   \`\`\`

2. Reinstall dependencies if needed:
   \`\`\`bash
   npm install
   \`\`\`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
`;

  try {
    await fs.writeFile(path.join(LITE_DIR, 'README.md'), readmeContent, 'utf8');
    console.log(chalk.green('✓ Created lite README.md'));
  } catch (error) {
    console.error(chalk.red('Error creating lite README.md:'), error);
    throw error;
  }
}

/**
 * Fonction principale
 */
async function syncLiteVersion() {
  console.log(chalk.blue.bold('\n=== Syncing Lite Version ===\n'));
  
  try {
    // Vérifier si le dossier lite existe, sinon le créer
    try {
      await fs.access(LITE_DIR);
      console.log(chalk.blue('Lite directory exists, cleaning...'));
      
      // Supprimer le contenu du dossier sauf .git
      const entries = await fs.readdir(LITE_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name !== '.git') {
          const entryPath = path.join(LITE_DIR, entry.name);
          await fs.rm(entryPath, { recursive: true, force: true });
        }
      }
    } catch (error) {
      // Le dossier n'existe pas, on le crée
      console.log(chalk.blue('Creating lite directory...'));
      await fs.mkdir(LITE_DIR, { recursive: true });
    }
    
    // Copier les fichiers nécessaires
    console.log(chalk.blue('\nCopying files...'));
    await copyDir(ROOT_DIR, LITE_DIR, ROOT_DIR);
    
    // Créer les fichiers spécifiques à la version lite
    console.log(chalk.blue('\nCreating lite-specific files...'));
    await createLitePackageJson();
    await updateLiteAppJson();
    await createLiteReadme();
    
    console.log(chalk.green.bold('\n✓ Lite version synced successfully!\n'));
    
  } catch (error) {
    console.error(chalk.red.bold('\n✗ Error syncing lite version:'), error);
    process.exit(1);
  }
}

// Exécuter le script
syncLiteVersion().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
