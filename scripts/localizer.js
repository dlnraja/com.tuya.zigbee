#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCALES_DIR = path.resolve(__dirname, '../locales');
const DRIVERS_DIR = path.resolve(__dirname, '../drivers');

// Langues supportées (codes ISO 639-1)
const SUPPORTED_LANGUAGES = [
  'en', 'nl', 'de', 'fr', 'it', 'es', 'pl', 'cs', 'ru', 'zh', 'ja', 'ko'
];

// Fichiers de traduction principaux
const MAIN_LOCALE_FILES = [
  'capabilities.json',
  'devices.json',
  'drivers.json',
  'errors.json',
  'flow.json',
  'notifications.json',
  'settings.json'
];

async function ensureLocalesStructure() {
  console.log(chalk.blue('🔍 Vérification de la structure des locales...'));
  
  // Créer le répertoire des locales s'il n'existe pas
  await fs.ensureDir(LOCALES_DIR);
  
  // Créer les sous-répertoires pour chaque langue
  for (const lang of SUPPORTED_LANGUAGES) {
    const langDir = path.join(LOCALES_DIR, lang);
    await fs.ensureDir(lang);
    
    // Créer les fichiers de traduction principaux s'ils n'existent pas
    for (const file of MAIN_LOCALE_FILES) {
      const filePath = path.join(langDir, file);
      if (!await fs.pathExists(filePath)) {
        await fs.writeJson(filePath, {}, { spaces: 2 });
      }
    }
  }
  
  console.log(chalk.green('✅ Structure des locales vérifiée'));
}

async function extractDriverStrings(driverName) {
  const driverDir = path.join(DRIVERS_DIR, driverName);
  const deviceFile = path.join(driverDir, 'device.js');
  const driverFile = path.join(driverDir, 'driver.js');
  const composeFile = path.join(driverDir, 'driver.compose.json');
  
  const strings = new Set();
  
  // Extraire les chaînes des fichiers principaux
  for (const file of [deviceFile, driverFile]) {
    if (await fs.pathExists(file)) {
      const content = await fs.readFile(file, 'utf8');
      
      // Extraire les appels à this.homey.__()
      const regex = /this\.homey\.__\(['"]([^'"]+)['"]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        strings.add(match[1]);
      }
    }
  }
  
  // Extraire les chaînes du fichier de composition
  if (await fs.pathExists(composeFile)) {
    const compose = await fs.readJson(composeFile);
    
    // Extraire les noms et descriptions
    if (compose.name) strings.add(compose.name);
    if (compose.description) strings.add(compose.description);
    
    // Extraire les noms des capacités
    if (compose.capabilities) {
      const caps = Array.isArray(compose.capabilities) 
        ? compose.capabilities 
        : Object.keys(compose.capabilities || {});
      
      for (const cap of caps) {
        strings.add(`capabilities.${cap}.title`);
        strings.add(`capabilities.${cap}.desc`);
      }
    }
    
    // Extraire les options des capacités
    if (compose.capabilitiesOptions) {
      for (const [cap, options] of Object.entries(compose.capabilitiesOptions)) {
        for (const [key, value] of Object.entries(options)) {
          if (typeof value === 'string') {
            strings.add(`capabilities.${cap}.options.${key}`);
          }
        }
      }
    }
  }
  
  return Array.from(strings);
}

async function updateDriverLocales(driverName, strings) {
  console.log(chalk.blue(`🔄 Mise à jour des locales pour ${driverName}...`));
  
  for (const lang of SUPPORTED_LANGUAGES) {
    const localeFile = path.join(LOCALES_DIR, lang, 'drivers', `${driverName}.json`);
    let localeData = {};
    
    // Charger les traductions existantes
    if (await fs.pathExists(localeFile)) {
      localeData = await fs.readJson(localeFile);
    } else {
      await fs.ensureDir(path.dirname(localeFile));
    }
    
    // Ajouter les nouvelles chaînes
    let updated = false;
    for (const str of strings) {
      if (!(str in localeData)) {
        localeData[str] = '';
        updated = true;
      }
    }
    
    // Enregistrer les mises à jour
    if (updated) {
      await fs.writeJson(localeFile, localeData, { spaces: 2 });
      console.log(chalk.green(`  ✅ ${lang}: ${Object.keys(localeData).length} chaînes`));
    }
  }
}

async function generateReadme() {
  console.log(chalk.blue('📝 Génération du README...'));
  
  // Lire le modèle de README
  const templatePath = path.join(__dirname, 'templates', 'README.md');
  let template = await fs.readFile(templatePath, 'utf8');
  
  // Récupérer la liste des drivers
  const drivers = (await fs.readdir(DRIVERS_DIR, { withFileTypes: true }))
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  // Générer la table des drivers
  const driverTable = ['| Driver | Description | Statut |', '|--------|-------------|--------|'];
  
  for (const driver of drivers) {
    const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (await fs.pathExists(composeFile)) {
      const compose = await fs.readJson(composeFile);
      driverTable.push(`| ${driver} | ${compose.description || ''} | ✅ |`);
    } else {
      driverTable.push(`| ${driver} | - | ❌ |`);
    }
  }
  
  // Mettre à jour le template
  template = template.replace('{{DRIVERS_TABLE}}', driverTable.join('\n'));
  
  // Enregistrer le README
  await fs.writeFile(path.join(process.cwd(), 'README.md'), template);
  console.log(chalk.green('✅ README généré avec succès'));
}

async function main() {
  try {
    // Vérifier la structure des locales
    await ensureLocalesStructure();
    
    // Récupérer la liste des drivers
    const drivers = (await fs.readdir(DRIVERS_DIR, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    console.log(chalk.blue(`🔍 Analyse de ${drivers.length} drivers...`));
    
    // Traiter chaque driver
    for (const driver of drivers) {
      console.log(`\n${chalk.bold(`🔧 Traitement de ${driver}...`)}`);
      
      try {
        // Extraire les chaînes à traduire
        const strings = await extractDriverStrings(driver);
        
        if (strings.length > 0) {
          // Mettre à jour les fichiers de traduction
          await updateDriverLocales(driver, strings);
          console.log(chalk.green(`✅ ${strings.length} chaînes traitées`));
        } else {
          console.log(chalk.yellow('ℹ️  Aucune chaîne à traduire trouvée'));
        }
      } catch (error) {
        console.error(chalk.red(`❌ Erreur lors du traitement de ${driver}:`), error.message);
      }
    }
    
    // Générer le README
    await generateReadme();
    
    // Mettre à jour les fichiers de traduction avec homey-cli
    console.log(chalk.blue('🔄 Mise à jour des fichiers de traduction avec homey-cli...'));
    try {
      execSync('npx homey translate --force', { stdio: 'inherit' });
      console.log(chalk.green('✅ Traductions mises à jour avec succès'));
    } catch (error) {
      console.error(chalk.red('❌ Erreur lors de la mise à jour des traductions:'), error.message);
    }
    
    console.log('\n' + chalk.green.bold('✅ Localisation terminée avec succès !'));
    
  } catch (error) {
    console.error(chalk.red('❌ Erreur dans localizer.js:'), error);
    process.exit(1);
  }
}

main();
