#!/usr/bin/env node

/**
 * Script de génération de documentation multilingue pour le projet Tuya Zigbee
 * Génère des fichiers de documentation dans différentes langues à partir des données des pilotes
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

// Configuration
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '../');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');
const DOCS_DIR = path.join(ROOT_DIR, 'docs');
const LANG_DIRS = {
  en: 'en',
  fr: 'fr',
  nl: 'nl',
  ta: 'ta'
};

// Traductions
const TRANSLATIONS = {
  // Titres
  'supported_devices': {
    en: '## Supported Devices\n\n',
    fr: '## Appareils Supportés\n\n',
    nl: '## Ondersteunde Apparaten\n\n',
    ta: '## ஆதரவு அளிக்கப்படும் சாதனங்கள்\n\n'
  },
  'device_table': {
    en: '| Device | Manufacturer | Model ID | Status | Last Updated |\n|--------|--------------|----------|--------|--------------|\n',
    fr: '| Appareil | Fabricant | ID Modèle | Statut | Dernière Mise à Jour |\n|--------|--------------|----------|--------|----------------------|\n',
    nl: '| Apparaat | Fabrikant | Model ID | Status | Laatst Bijgewerkt |\n|--------|--------------|----------|--------|-------------------|\n',
    ta: '| சாதனம் | உற்பத்தியாளர் | மாதிரி ஐடி | நிலை | கடைசியாக புதுப்பிக்கப்பட்டது |\n|--------|--------------|----------|--------|-------------------|\n'
  },
  'status_supported': {
    en: '✅ Supported',
    fr: '✅ Pris en charge',
    nl: '✅ Ondersteund',
    ta: '✅ ஆதரிக்கப்படுகிறது'
  },
  'status_experimental': {
    en: '⚠️ Experimental',
    fr: '⚠️ Expérimental',
    nl: '⚠️ Experimenteel',
    ta: '⚠️ சோதனைமுறை'
  },
  'status_unsupported': {
    en: '❌ Not Supported',
    fr: '❌ Non supporté',
    nl: '❌ Niet ondersteund',
    ta: '❌ ஆதரிக்கப்படவில்லை'
  },
  'last_updated': {
    en: 'Last updated on',
    fr: 'Dernière mise à jour le',
    nl: 'Laatst bijgewerkt op',
    ta: 'கடைசியாக புதுப்பிக்கப்பட்டது'
  },
  'generated_note': {
    en: '> This document is automatically generated. Do not edit it directly.',
    fr: '> Ce document est généré automatiquement. Ne le modifiez pas directement.',
    nl: '> Dit document wordt automatisch gegenereerd. Bewerk het niet rechtstreeks.',
    ta: '> இந்த ஆவணம் தானாக உருவாக்கப்பட்டது. நேரடியாக திருத்த வேண்டாம்.'
  }
};

/**
 * Récupère la liste des pilotes disponibles
 */
async function getDrivers() {
  try {
    const drivers = [];
    const items = await fs.readdir(DRIVERS_DIR, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const driverPath = path.join(DRIVERS_DIR, item.name);
        const driverJsonPath = path.join(driverPath, 'driver.compose.json');
        
        try {
          const driverConfig = JSON.parse(await fs.readFile(driverJsonPath, 'utf8'));
          const readmePath = path.join(driverPath, 'README.md');
          
          let readmeContent = '';
          try {
            readmeContent = await fs.readFile(readmePath, 'utf8');
          } catch (error) {
            console.warn(chalk.yellow(`⚠️  No README found for ${item.name}`));
          }
          
          drivers.push({
            id: item.name,
            path: driverPath,
            config: driverConfig,
            readme: readmeContent,
            lastUpdated: await getLastUpdated(driverPath)
          });
          
        } catch (error) {
          console.warn(chalk.yellow(`⚠️  Error reading driver ${item.name}:`), error.message);
        }
      }
    }
    
    return drivers;
  } catch (error) {
    console.error(chalk.red('Error getting drivers:'), error);
    return [];
  }
}

/**
 * Récupère la date de dernière modification d'un répertoire
 */
async function getLastUpdated(dir) {
  try {
    const { stdout } = await exec(`git -C "${dir}" log -1 --format="%ai" -- .`);
    return stdout.trim() || new Date().toISOString();
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Could not get last updated date for ${dir}:`), error.message);
    return new Date().toISOString();
  }
}

/**
 * Exécute une commande shell et retourne la sortie
 */
function exec(command) {
  return new Promise((resolve, reject) => {
    require('child_process').exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Génère le contenu du fichier README pour une langue donnée
 */
function generateReadmeContent(drivers, lang) {
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  let content = `# Tuya Zigbee Drivers\n\n`;
  content += `${TRANSLATIONS.generated_note[lang] || TRANSLATIONS.generated_note['en']}\n\n`;
  content += TRANSLATIONS.supported_devices[lang] || TRANSLATIONS.supported_devices['en'];
  
  // Tableau des appareils
  content += TRANSLATIONS.device_table[lang] || TRANSLATIONS.device_table['en'];
  
  // Trier les pilotes par fabricant et modèle
  drivers.sort((a, b) => {
    const manufacturerA = a.config.manufacturer || 'ZZZ';
    const manufacturerB = b.config.manufacturer || 'ZZZ';
    
    if (manufacturerA !== manufacturerB) {
      return manufacturerA.localeCompare(manufacturerB);
    }
    
    const modelA = a.config.model || '';
    const modelB = b.config.model || '';
    return modelA.localeCompare(modelB);
  });
  
  // Ajouter chaque appareil au tableau
  for (const driver of drivers) {
    const modelId = driver.id;
    const manufacturer = driver.config.manufacturer || 'Unknown';
    const model = driver.config.model || modelId;
    
    // Déterminer le statut
    let status = TRANSLATIONS.status_supported[lang] || TRANSLATIONS.status_supported['en'];
    if (driver.config.experimental) {
      status = TRANSLATIONS.status_experimental[lang] || TRANSLATIONS.status_experimental['en'];
    }
    
    // Formater la date
    const lastUpdated = driver.lastUpdated ? new Date(driver.lastUpdated).toISOString().split('T')[0] : 'N/A';
    
    // Ajouter la ligne au tableau
    content += `| [${model}](#${modelId.toLowerCase()}) | ${manufacturer} | \`${modelId}\` | ${status} | ${lastUpdated} |\n`;
  }
  
  // Ajouter la documentation détaillée de chaque pilote
  content += '\n---\n\n';
  content += '## Device Details\n\n';
  
  for (const driver of drivers) {
    const modelId = driver.id;
    const manufacturer = driver.config.manufacturer || 'Unknown';
    const model = driver.config.model || modelId;
    
    content += `### ${model}\n\n`;
    content += `**Manufacturer**: ${manufacturer}  
`;
    content += `**Model ID**: \`${modelId}\`  
`;
    
    if (driver.config.description) {
      content += `\n${driver.config.description}\n\n`;
    }
    
    if (driver.readme) {
      content += '#### Documentation\n\n';
      content += driver.readme;
      content += '\n\n';
    }
    
    if (driver.config.capabilities && driver.config.capabilities.length > 0) {
      content += '#### Capabilities\n\n';
      content += driver.config.capabilities.map(cap => `- ${cap}`).join('\n');
      content += '\n\n';
    }
    
    content += '---\n\n';
  }
  
  // Pied de page
  content += `\n${TRANSLATIONS.last_updated[lang] || TRANSLATIONS.last_updated['en']} ${now}\n`;
  
  return content;
}

/**
 * Génère les fichiers de documentation pour toutes les langues
 */
async function generateDocumentation() {
  try {
    console.log(chalk.blue('\nGenerating documentation...'));
    
    // Récupérer la liste des pilotes
    const drivers = await getDrivers();
    console.log(chalk.green(`✓ Found ${drivers.length} drivers`));
    
    // Créer les répertoires de documentation pour chaque langue
    for (const [lang, dir] of Object.entries(LANG_DIRS)) {
      const langDir = path.join(DOCS_DIR, dir);
      await fs.mkdir(langDir, { recursive: true });
      
      // Générer le contenu du README pour cette langue
      const readmeContent = generateReadmeContent(drivers, lang);
      const readmePath = path.join(langDir, 'README.md');
      
      // Écrire le fichier README
      await fs.writeFile(readmePath, readmeContent, 'utf8');
      console.log(chalk.green(`✓ Generated ${lang} documentation`));
    }
    
    console.log(chalk.green.bold('\n✓ Documentation generation complete!\n'));
    return true;
    
  } catch (error) {
    console.error(chalk.red('Error generating documentation:'), error);
    process.exit(1);
  }
}

// Exécuter le script
generateDocumentation().catch(error => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
