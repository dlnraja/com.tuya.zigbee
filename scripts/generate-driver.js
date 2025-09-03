#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

// Configuration
const ROOT = process.cwd();
const TEMPLATES_DIR = path.join(ROOT, 'templates');

// Vérifier les arguments
const [,, driverId, ...capabilities] = process.argv;

if (!driverId) {
  console.error(chalk.red('❌ Erreur: Vous devez spécifier un ID de driver'));
  console.error(chalk.yellow('Usage: node generate-driver.js <driverId> [capability1] [capability2] ...'));
  process.exit(1);
}

// Normaliser l'ID du driver
const normalizedId = driverId
  .toLowerCase()
  .replace(/[^a-z0-9-]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-+|-+$/g, '');

// Dossier du driver
const DRIVER_DIR = path.join(ROOT, 'drivers', normalizedId);
const ASSETS_DIR = path.join(DRIVER_DIR, 'assets', 'images');

// Configuration par défaut
const defaultConfig = {
  id: `tuya-${normalizedId}`,
  name: {
    en: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    fr: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    nl: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    de: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    es: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    it: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    sv: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    pl: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    pt: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
    cs: `Tuya ${normalizedId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
  },
  class: 'other', // Par défaut, à personnaliser selon le type d'appareil
  capabilities: capabilities.length > 0 ? capabilities : ['onoff'],
  capabilitiesOptions: {},
  energy: {
    batteries: [],
    max: 0
  },
  images: {
    small: './assets/images/small.png',
    large: './assets/images/large.png'
  },
  zigbee: {
    manufacturer: ['_TZE200_xxxxxx'],
    model: [normalizedId.toUpperCase()],
    minVersion: 3.1
  },
  settings: [
    {
      id: 'info',
      type: 'label',
      label: {
        en: 'Information',
        fr: 'Informations',
        nl: 'Informatie',
        de: 'Informationen',
        es: 'Información',
        it: 'Informazioni',
        sv: 'Information',
        pl: 'Informacje',
        pt: 'Informação',
        cs: 'Informace'
      },
      value: {
        en: 'This driver has been automatically generated.',
        fr: 'Ce pilote a été généré automatiquement.',
        nl: 'Deze driver is automatisch gegenereerd.',
        de: 'Dieser Treiber wurde automatisch generiert.',
        es: 'Este controlador ha sido generado automáticamente.',
        it: 'Questo driver è stato generato automaticamente.',
        sv: 'Den här drivrutinen har genererats automatiskt.',
        pl: 'Ta sterownika została wygenerowana automatycznie.',
        pt: 'Este controlador foi gerado automaticamente.',
        cs: 'Tento ovladač byl vygenerován automaticky.'
      }
    }
  ]
};

// Modèle de fichier device.js
const deviceTemplate = `const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${normalizedId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Device extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Device has been initialized');
    
    // Enable debugging
    this.enableDebug();
    
    // Print the node's info to the console
    this.printNode();
    
    // Register capabilities
    this.registerCapabilities();
    
    // Register event handlers
    this.registerEventHandlers();
  }
  
  registerCapabilities() {
    // Register capabilities based on the driver configuration
    this.registerCapability('onoff', 'genOnOff');
    
    // Add more capabilities here based on the device type
    ${capabilities.map(cap => {
      if (cap !== 'onoff') {
        return `// this.registerCapability('${cap}', 'genBasic');`;
      }
      return '';
    }).filter(Boolean).join('\n    ')}
  }
  
  registerEventHandlers() {
    // Handle commands from the device
    this.registerReportListener('genOnOff', 'on', () => {
      this.setCapabilityValue('onoff', true).catch(this.error);
    });
    
    this.registerReportListener('genOnOff', 'off', () => {
      this.setCapabilityValue('onoff', false).catch(this.error);
    });
    
    // Add more event handlers as needed
  }
  
  onDeleted() {
    this.log('Device removed');
  }
}

module.exports = ${normalizedId.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('')}Device;
`;

// Modèle de README.md
const readmeTemplate = `# ${normalizedId}

## Description

Ce driver a été généré automatiquement pour le périphérique Tuya avec l'ID: ${normalizedId}

## Fonctionnalités

- ${capabilities.length > 0 ? capabilities.join('\n- ') : 'Aucune capacité définie'}

## Configuration

1. Installez le driver via l'application Homey
2. Mettez l'appareil en mode appairage
3. L'appareil devrait être détecté automatiquement

## Support

Pour toute question ou problème, veuillez ouvrir une issue sur [GitHub](https://github.com/dlnraja/com.tuya.zigbee/issues)
`;

// Fonction pour créer un fichier
async function createFile(filePath, content) {
  try {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
    console.log(chalk.green(`✅ Fichier créé: ${path.relative(ROOT, filePath)}`));
  } catch (error) {
    console.error(chalk.red(`❌ Erreur lors de la création du fichier ${filePath}:`));
    console.error(error);
    throw error;
  }
}

// Fonction pour copier les fichiers statiques
async function copyStaticFiles() {
  try {
    // Créer les dossiers nécessaires
    await fs.ensureDir(ASSETS_DIR);
    
    // Copier les icônes par défaut (si elles existent dans le dossier templates)
    const defaultIcon = path.join(TEMPLATES_DIR, 'default-icon.svg');
    const defaultImage = path.join(TEMPLATES_DIR, 'default-image.png');
    
    if (await fs.pathExists(defaultIcon)) {
      await fs.copy(defaultIcon, path.join(DRIVER_DIR, 'assets', 'icon.svg'));
      console.log(chalk.green('✅ Icône SVG par défaut copiée'));
    }
    
    if (await fs.pathExists(defaultImage)) {
      await fs.copy(defaultImage, path.join(ASSETS_DIR, 'large.png'));
      await fs.copy(defaultImage, path.join(ASSETS_DIR, 'small.png'));
      console.log(chalk.green('✅ Images PNG par défaut copiées'));
    } else {
      console.log(chalk.yellow('⚠️  Aucune image par défaut trouvée. Veuillez ajouter manuellement les icônes.'));
    }
  } catch (error) {
    console.error(chalk.red('❌ Erreur lors de la copie des fichiers statiques:'));
    console.error(error);
    throw error;
  }
}

// Fonction principale
async function main() {
  try {
    console.log(chalk.blue(`\n🚀 Génération du driver: ${normalizedId}`));
    
    // Vérifier si le dossier existe déjà
    if (await fs.pathExists(DRIVER_DIR)) {
      console.error(chalk.red(`❌ Le dossier du driver existe déjà: ${DRIVER_DIR}`));
      process.exit(1);
    }
    
    // Créer la structure de dossiers
    console.log(chalk.blue('\n📁 Création de la structure de dossiers...'));
    await fs.ensureDir(DRIVER_DIR);
    await fs.ensureDir(ASSETS_DIR);
    
    // Créer les fichiers de configuration
    console.log(chalk.blue('\n📝 Génération des fichiers de configuration...'));
    await createFile(
      path.join(DRIVER_DIR, 'driver.compose.json'),
      JSON.stringify(defaultConfig, null, 2)
    );
    
    // Créer le fichier device.js
    await createFile(
      path.join(DRIVER_DIR, 'device.js'),
      deviceTemplate
    );
    
    // Créer le README.md
    await createFile(
      path.join(DRIVER_DIR, 'README.md'),
      readmeTemplate
    );
    
    // Copier les fichiers statiques (icônes, etc.)
    console.log(chalk.blue('\n🖼️  Copie des ressources graphiques...'));
    await copyStaticFiles();
    
    console.log(chalk.green.bold('\n✅ Driver généré avec succès !'));
    console.log(chalk.blue(`\nProchaines étapes :`));
    console.log(`1. Personnaliser le fichier ${path.relative(ROOT, path.join(DRIVER_DIR, 'driver.compose.json'))}`);
    console.log(`2. Implémenter la logique dans ${path.relative(ROOT, path.join(DRIVER_DIR, 'device.js'))}`);
    console.log(`3. Remplacer les icônes par défaut dans ${path.relative(ROOT, ASSETS_DIR)}`);
    console.log(`4. Tester le driver avec 'homey app validate'\n`);
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Erreur lors de la génération du driver :'));
    console.error(chalk.red(error.stack || error.message));
    process.exit(1);
  }
}

// Démarrer le processus
main();
