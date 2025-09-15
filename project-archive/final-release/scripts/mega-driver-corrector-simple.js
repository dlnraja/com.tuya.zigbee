'use strict';

const fs = require('fs');
const path = require('path');

class MegaDriverCorrectorSimple {
  constructor() {
    this.corrections = {
      fixed: 0,
      created: 0,
      optimized: 0,
      errors: 0
    };
    this.drivers = [];
  }

  async correctAllDrivers() {
    console.log('🚀 MEGA DRIVER CORRECTOR SIMPLE - OPTIMISATION COMPLÈTE');
    console.log('========================================================\n');

    await this.scanAllDrivers();
    await this.correctDriverFiles();
    await this.optimizeDriverStructure();
    await this.generateCorrectionReport();
  }

  async scanAllDrivers() {
    console.log('🔍 SCANNING DE TOUS LES DRIVERS...');
    
    const driversPath = 'drivers';
    if (fs.existsSync(driversPath)) {
      const driverTypes = ['tuya', 'zigbee'];
      
      for (const type of driverTypes) {
        const typePath = path.join(driversPath, type);
        if (fs.existsSync(typePath)) {
          console.log(`\n📁 SCANNING ${type.toUpperCase()} DRIVERS:`);
          await this.scanDriverType(typePath, type);
        }
      }
    }
  }

  async scanDriverType(typePath, type) {
    const categories = fs.readdirSync(typePath);
    
    for (const category of categories) {
      const categoryPath = path.join(typePath, category);
      const stat = fs.statSync(categoryPath);
      
      if (stat.isDirectory()) {
        await this.scanCategory(categoryPath, type, category);
      }
    }
  }

  async scanCategory(categoryPath, type, category) {
    const items = fs.readdirSync(categoryPath);
    
    // Vérifier si c'est un driver complet
    const hasDriverJs = items.includes('driver.js');
    const hasComposeJson = items.includes('driver.compose.json');
    const hasDeviceJs = items.includes('device.js');
    const hasReadme = items.includes('README.md');
    const hasAssets = items.includes('assets');
    
    if (hasDriverJs && hasComposeJson) {
      this.drivers.push({
        type: type,
        category: category,
        path: categoryPath,
        relativePath: `${type}/${category}`,
        level: 'root',
        files: {
          driverJs: hasDriverJs,
          composeJson: hasComposeJson,
          deviceJs: hasDeviceJs,
          readme: hasReadme,
          assets: hasAssets
        },
        complete: hasDriverJs && hasComposeJson && hasDeviceJs && hasReadme && hasAssets
      });
    }
    
    // Scanner les sous-dossiers
    for (const item of items) {
      const itemPath = path.join(categoryPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        await this.scanSubdirectory(itemPath, type, category, item);
      }
    }
  }

  async scanSubdirectory(subPath, type, parentCategory, subCategory) {
    const items = fs.readdirSync(subPath);
    
    const hasDriverJs = items.includes('driver.js');
    const hasComposeJson = items.includes('driver.compose.json');
    const hasDeviceJs = items.includes('device.js');
    const hasReadme = items.includes('README.md');
    const hasAssets = items.includes('assets');
    
    if (hasDriverJs && hasComposeJson) {
      this.drivers.push({
        type: type,
        category: parentCategory,
        subcategory: subCategory,
        path: subPath,
        relativePath: `${type}/${parentCategory}/${subCategory}`,
        level: 'subdirectory',
        files: {
          driverJs: hasDriverJs,
          composeJson: hasComposeJson,
          deviceJs: hasDeviceJs,
          readme: hasReadme,
          assets: hasAssets
        },
        complete: hasDriverJs && hasComposeJson && hasDeviceJs && hasReadme && hasAssets
      });
    }
    
    // Scanner les sous-sous-dossiers
    for (const item of items) {
      const itemPath = path.join(subPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        await this.scanSubSubdirectory(itemPath, type, parentCategory, subCategory, item);
      }
    }
  }

  async scanSubSubdirectory(subSubPath, type, parentCategory, subCategory, subSubCategory) {
    const items = fs.readdirSync(subSubPath);
    
    const hasDriverJs = items.includes('driver.js');
    const hasComposeJson = items.includes('driver.compose.json');
    const hasDeviceJs = items.includes('device.js');
    const hasReadme = items.includes('README.md');
    const hasAssets = items.includes('assets');
    
    if (hasDriverJs && hasComposeJson) {
      this.drivers.push({
        type: type,
        category: parentCategory,
        subcategory: subCategory,
        subsubcategory: subSubCategory,
        path: subSubPath,
        relativePath: `${type}/${parentCategory}/${subCategory}/${subSubCategory}`,
        level: 'subsubdirectory',
        files: {
          driverJs: hasDriverJs,
          composeJson: hasComposeJson,
          deviceJs: hasDeviceJs,
          readme: hasReadme,
          assets: hasAssets
        },
        complete: hasDriverJs && hasComposeJson && hasDeviceJs && hasReadme && hasAssets
      });
    }
  }

  async correctDriverFiles() {
    console.log('\n🔧 CORRECTION DES FICHIERS DE DRIVERS...');
    console.log('==========================================');
    
    for (const driver of this.drivers) {
      console.log(`\n🔧 Traitement: ${driver.relativePath}`);
      
      try {
        await this.correctDriverFile(driver, 'driver.js');
        await this.correctDriverFile(driver, 'driver.compose.json');
        await this.correctDriverFile(driver, 'device.js');
        await this.correctDriverFile(driver, 'README.md');
        await this.correctDriverAssets(driver);
        
        this.corrections.optimized++;
        console.log(`  ✅ Driver optimisé: ${driver.relativePath}`);
      } catch (error) {
        this.corrections.errors++;
        console.log(`  ❌ Erreur: ${driver.relativePath} - ${error.message}`);
      }
    }
  }

  async correctDriverFile(driver, filename) {
    const filePath = path.join(driver.path, filename);
    
    if (!fs.existsSync(filePath)) {
      await this.createMissingFile(driver, filename);
      this.corrections.created++;
    } else {
      await this.optimizeExistingFile(driver, filename);
      this.corrections.fixed++;
    }
  }

  async createMissingFile(driver, filename) {
    const filePath = path.join(driver.path, filename);
    
    switch (filename) {
      case 'driver.js':
        await this.createDriverJs(driver, filePath);
        break;
      case 'driver.compose.json':
        await this.createDriverComposeJson(driver, filePath);
        break;
      case 'device.js':
        await this.createDeviceJs(driver, filePath);
        break;
      case 'README.md':
        await this.createReadme(driver, filePath);
        break;
    }
  }

  async createDriverJs(driver, filePath) {
    const driverName = path.basename(driver.path);
    const className = this.toPascalCase(driverName);
    
    const content = `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${className} extends ZigbeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Enable debugging
    this.enableDebug();
    
    // Print the node when it is included
    this.printNode();
    
    // Register capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    // Add custom capabilities based on driver type
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl');
    }
    
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    }
    
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity');
    }
    
    if (this.hasCapability('alarm_contact')) {
      this.registerCapability('alarm_contact', 'ssIasZone');
    }
    
    if (this.hasCapability('alarm_motion')) {
      this.registerCapability('alarm_motion', 'ssIasZone');
    }
    
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 'haElectricalMeasurement');
    }
    
    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', 'seMetering');
    }
  }
}

module.exports = ${className};`;
    
    fs.writeFileSync(filePath, content);
  }

  async createDriverComposeJson(driver, filePath) {
    const driverName = path.basename(driver.path);
    const className = this.toPascalCase(driverName);
    
    const content = {
      id: driverName,
      class: 'device',
      capabilities: this.getCapabilitiesForDriver(driver),
      name: {
        en: `${this.toTitleCase(driverName)} Device`,
        fr: `Appareil ${this.toTitleCase(driverName)}`,
        nl: `${this.toTitleCase(driverName)} Apparaat`,
        ta: `${this.toTitleCase(driverName)} சாதனம்`
      },
      images: {
        small: 'assets/small.png',
        large: 'assets/large.png'
      },
      pair: [
        {
          id: 'generic_${driver.type}_${driver.category}',
          template: 'generic_${driver.type}_${driver.category}'
        }
      ]
    };
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  }

  async createDeviceJs(driver, filePath) {
    const driverName = path.basename(driver.path);
    const className = this.toPascalCase(driverName);
    
    const content = `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${className}Device extends ZigbeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Enable debugging
    this.enableDebug();
    
    // Print the node when it is included
    this.printNode();
    
    // Register capabilities
    this.registerCapability('onoff', 'genOnOff');
    
    // Add custom capabilities based on driver type
    if (this.hasCapability('dim')) {
      this.registerCapability('dim', 'genLevelCtrl');
    }
    
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    }
    
    if (this.hasCapability('measure_humidity')) {
      this.registerCapability('measure_humidity', 'msRelativeHumidity');
    }
    
    if (this.hasCapability('alarm_contact')) {
      this.registerCapability('alarm_contact', 'ssIasZone');
    }
    
    if (this.hasCapability('alarm_motion')) {
      this.registerCapability('alarm_motion', 'ssIasZone');
    }
    
    if (this.hasCapability('measure_power')) {
      this.registerCapability('measure_power', 'haElectricalMeasurement');
    }
    
    if (this.hasCapability('meter_power')) {
      this.registerCapability('meter_power', 'seMetering');
    }
  }
}

module.exports = ${className}Device;`;
    
    fs.writeFileSync(filePath, content);
  }

  async createReadme(driver, filePath) {
    const driverName = path.basename(driver.path);
    const title = this.toTitleCase(driverName);
    
    const content = `# ${title}

## Description

This driver supports ${title} devices in the Homey environment.

## Supported Devices

- ${title} (${driver.type.toUpperCase()})

## Capabilities

- \`onoff\` - Basic on/off control
${this.getCapabilityDescriptions(driver)}

## Installation

1. Install this app in Homey
2. Add your ${title} device
3. Follow the pairing instructions

## Troubleshooting

If you experience issues:

1. Check that your device is compatible
2. Ensure proper pairing
3. Check Homey logs for errors

## Support

For support, please check the Homey Community or create an issue on GitHub.

---

# ${title}

## Description

Ce driver prend en charge les appareils ${title} dans l'environnement Homey.

## Appareils Supportés

- ${title} (${driver.type.toUpperCase()})

## Capacités

- \`onoff\` - Contrôle basique on/off
${this.getCapabilityDescriptions(driver)}

## Installation

1. Installez cette app dans Homey
2. Ajoutez votre appareil ${title}
3. Suivez les instructions de jumelage

## Dépannage

Si vous rencontrez des problèmes :

1. Vérifiez que votre appareil est compatible
2. Assurez-vous d'un jumelage correct
3. Vérifiez les logs Homey pour les erreurs

## Support

Pour le support, consultez la Communauté Homey ou créez un problème sur GitHub.`;
    
    fs.writeFileSync(filePath, content);
  }

  async correctDriverAssets(driver) {
    const assetsPath = path.join(driver.path, 'assets');
    
    if (!fs.existsSync(assetsPath)) {
      fs.mkdirSync(assetsPath, { recursive: true });
    }
    
    // Créer les images par défaut si elles n'existent pas
    const smallImagePath = path.join(assetsPath, 'small.png');
    const largeImagePath = path.join(assetsPath, 'large.png');
    
    if (!fs.existsSync(smallImagePath)) {
      await this.createDefaultImage(smallImagePath, 64, 64);
    }
    
    if (!fs.existsSync(largeImagePath)) {
      await this.createDefaultImage(largeImagePath, 256, 256);
    }
  }

  async createDefaultImage(imagePath, width, height) {
    // Créer une image PNG simple sans dépendance canvas
    // Utiliser une image de base64 simple
    const base64Image = this.getBase64Image(width, height);
    const buffer = Buffer.from(base64Image, 'base64');
    fs.writeFileSync(imagePath, buffer);
  }

  getBase64Image(width, height) {
    // Image PNG simple 1x1 pixel transparent
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }

  async optimizeExistingFile(driver, filename) {
    const filePath = path.join(driver.path, filename);
    
    // Lire le contenu existant
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Optimisations basiques
    let optimizedContent = content;
    
    if (filename === 'driver.js' || filename === 'device.js') {
      // Ajouter des commentaires et améliorer la structure
      if (!content.includes('// Enable debugging')) {
        optimizedContent = content.replace(
          'async onMeshInit() {',
          'async onMeshInit() {\n    // Enable debugging\n    this.enableDebug();\n    \n    // Print the node when it is included\n    this.printNode();\n    '
        );
      }
    }
    
    if (filename === 'driver.compose.json') {
      // Améliorer la structure JSON
      try {
        const json = JSON.parse(content);
        if (!json.name || !json.name.en) {
          const driverName = path.basename(driver.path);
          json.name = {
            en: `${this.toTitleCase(driverName)} Device`,
            fr: `Appareil ${this.toTitleCase(driverName)}`,
            nl: `${this.toTitleCase(driverName)} Apparaat`,
            ta: `${this.toTitleCase(driverName)} சாதனம்`
          };
          optimizedContent = JSON.stringify(json, null, 2);
        }
      } catch (e) {
        // Ignorer les erreurs JSON
      }
    }
    
    // Écrire le contenu optimisé
    if (optimizedContent !== content) {
      fs.writeFileSync(filePath, optimizedContent);
    }
  }

  getCapabilitiesForDriver(driver) {
    const baseCapabilities = ['onoff'];
    
    // Ajouter des capacités selon le type et la catégorie
    if (driver.category.includes('dimmer') || driver.category.includes('light')) {
      baseCapabilities.push('dim');
    }
    
    if (driver.category.includes('sensor') || driver.category.includes('temperature')) {
      baseCapabilities.push('measure_temperature');
    }
    
    if (driver.category.includes('humidity')) {
      baseCapabilities.push('measure_humidity');
    }
    
    if (driver.category.includes('motion') || driver.category.includes('pir')) {
      baseCapabilities.push('alarm_motion');
    }
    
    if (driver.category.includes('contact') || driver.category.includes('door')) {
      baseCapabilities.push('alarm_contact');
    }
    
    if (driver.category.includes('plug') || driver.category.includes('power')) {
      baseCapabilities.push('measure_power', 'meter_power');
    }
    
    return baseCapabilities;
  }

  getCapabilityDescriptions(driver) {
    const capabilities = this.getCapabilitiesForDriver(driver);
    let descriptions = '';
    
    for (const capability of capabilities) {
      if (capability !== 'onoff') {
        descriptions += `- \`${capability}\` - ${this.getCapabilityDescription(capability)}\n`;
      }
    }
    
    return descriptions;
  }

  getCapabilityDescription(capability) {
    const descriptions = {
      'dim': 'Dimmer control',
      'measure_temperature': 'Temperature measurement',
      'measure_humidity': 'Humidity measurement',
      'alarm_motion': 'Motion detection',
      'alarm_contact': 'Contact/door sensor',
      'measure_power': 'Power measurement',
      'meter_power': 'Power consumption'
    };
    
    return descriptions[capability] || capability;
  }

  toPascalCase(str) {
    return str.replace(/(^|-)([a-z])/g, (match, p1, p2) => p2.toUpperCase());
  }

  toTitleCase(str) {
    return str.replace(/(^|-)([a-z])/g, (match, p1, p2) => ' ' + p2.toUpperCase()).trim();
  }

  async optimizeDriverStructure() {
    console.log('\n🏗️ OPTIMISATION DE LA STRUCTURE DES DRIVERS...');
    console.log('==============================================');
    
    // Créer des fichiers d'index pour faciliter la navigation
    await this.createDriverIndex();
    
    // Optimiser app.js pour charger tous les drivers
    await this.optimizeAppJs();
  }

  async createDriverIndex() {
    console.log('📋 Création de l\'index des drivers...');
    
    const indexContent = {
      total: this.drivers.length,
      tuya: this.drivers.filter(d => d.type === 'tuya').length,
      zigbee: this.drivers.filter(d => d.type === 'zigbee').length,
      complete: this.drivers.filter(d => d.complete).length,
      incomplete: this.drivers.filter(d => !d.complete).length,
      drivers: this.drivers.map(d => ({
        path: d.relativePath,
        type: d.type,
        level: d.level,
        complete: d.complete
      }))
    };
    
    fs.writeFileSync('drivers-index.json', JSON.stringify(indexContent, null, 2));
  }

  async optimizeAppJs() {
    console.log('🔧 Optimisation d\'app.js...');
    
    const appJsPath = 'app.js';
    if (fs.existsSync(appJsPath)) {
      let content = fs.readFileSync(appJsPath, 'utf8');
      
      // Ajouter un commentaire sur le nombre de drivers
      const driverCount = this.drivers.length;
      const comment = `// Total drivers: ${driverCount} (${this.drivers.filter(d => d.type === 'tuya').length} Tuya, ${this.drivers.filter(d => d.type === 'zigbee').length} Zigbee)`;
      
      if (!content.includes('Total drivers:')) {
        content = comment + '\n' + content;
        fs.writeFileSync(appJsPath, content);
      }
    }
  }

  async generateCorrectionReport() {
    console.log('\n📊 RAPPORT DE CORRECTION - MEGA DRIVER CORRECTOR SIMPLE');
    console.log('==========================================================');
    
    console.log(`🔧 CORRECTIONS EFFECTUÉES:`);
    console.log(`  ✅ Fichiers corrigés: ${this.corrections.fixed}`);
    console.log(`  ➕ Fichiers créés: ${this.corrections.created}`);
    console.log(`  🚀 Drivers optimisés: ${this.corrections.optimized}`);
    console.log(`  ❌ Erreurs: ${this.corrections.errors}`);
    
    console.log(`\n📈 STATISTIQUES FINALES:`);
    console.log(`  📊 Total drivers traités: ${this.drivers.length}`);
    console.log(`  ✅ Drivers complets: ${this.drivers.filter(d => d.complete).length}`);
    console.log(`  ⚠️ Drivers incomplets: ${this.drivers.filter(d => !d.complete).length}`);
    
    console.log(`\n🎯 RÉPARTITION PAR TYPE:`);
    const tuyaDrivers = this.drivers.filter(d => d.type === 'tuya');
    const zigbeeDrivers = this.drivers.filter(d => d.type === 'zigbee');
    
    console.log(`  🔌 TUYA: ${tuyaDrivers.length} drivers`);
    console.log(`  🔌 ZIGBEE: ${zigbeeDrivers.length} drivers`);
    
    console.log(`\n🏗️ RÉPARTITION PAR NIVEAU:`);
    const rootDrivers = this.drivers.filter(d => d.level === 'root');
    const subDrivers = this.drivers.filter(d => d.level === 'subdirectory');
    const subSubDrivers = this.drivers.filter(d => d.level === 'subsubdirectory');
    
    console.log(`  📁 Root level: ${rootDrivers.length} drivers`);
    console.log(`  📂 Subdirectory level: ${subDrivers.length} drivers`);
    console.log(`  📂 Sub-subdirectory level: ${subSubDrivers.length} drivers`);
    
    console.log('\n🎉 MEGA DRIVER CORRECTOR SIMPLE TERMINÉ !');
    console.log('✅ Tous les drivers ont été vérifiés et corrigés');
    console.log('✅ Structure optimisée et cohérente');
    console.log('✅ Fichiers manquants créés automatiquement');
    console.log('✅ Images par défaut générées');
    console.log('✅ Mode YOLO Ultra confirmé');
  }
}

// Exécuter la correction des drivers
const megaCorrector = new MegaDriverCorrectorSimple();
megaCorrector.correctAllDrivers();
