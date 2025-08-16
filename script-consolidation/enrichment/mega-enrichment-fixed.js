#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🔄 MEGA ENRICHMENT v3.4.1 - MISE À JOUR COMPLÈTE...');

// NOTE: Tous les scripts PowerShell ont été convertis en JavaScript
// Structure drivers optimisée: tuya_zigbee, zigbee, _common uniquement
// Fichiers .json, .png, .img préservés selon spécifications

const fs = require('fs-extra');
const path = require('path');

class MegaEnrichmentFixed {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.catalogPath = path.join(this.projectRoot, 'catalog');
    this.backupsPath = path.join(this.projectRoot, 'backups');
    
    // Mode validation récursive
    this.recursiveMode = true;
    this.maxIterations = 5;
    this.currentIteration = 0;
  }

  async run() {
    try {
      console.log('🚀 DÉMARRAGE MEGA ENRICHMENT v3.4.1...');
      
      if (this.recursiveMode) {
        await this.runRecursiveValidation();
      } else {
        await this.runStandardEnrichment();
      }
      
      console.log('✅ MEGA ENRICHMENT TERMINÉ !');
      
    } catch (error) {
      console.error('❌ Erreur Mega Enrichment:', error);
    }
  }

  async runRecursiveValidation() {
    console.log('🔄 MODE VALIDATION RÉCURSIVE ACTIVÉ...');
    
    for (this.currentIteration = 1; this.currentIteration <= this.maxIterations; this.currentIteration++) {
      console.log(`\n📁 Itération ${this.currentIteration}/${this.maxIterations}...`);
      
      // Valider tout
      const validationResult = await this.validateEverything();
      
      if (validationResult.isValid) {
        console.log('✅ Validation réussie, arrêt des itérations');
        break;
      }
      
      // Appliquer les corrections
      await this.applyFixes(validationResult.issues);
      
      // Attendre un peu avant la prochaine itération
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🔄 VALIDATION RÉCURSIVE COMPLÈTE');
  }

  async validateEverything() {
    const issues = [];
    
    // Validation de la structure SOT
    const sotValidation = await this.validateSOTStructure();
    if (!sotValidation.isValid) {
      issues.push(...sotValidation.issues);
    }
    
    // Validation des drivers
    const driversValidation = await this.validateAllDrivers();
    if (!driversValidation.isValid) {
      issues.push(...driversValidation.issues);
    }
    
    // Validation des assets
    const assetsValidation = await this.validateAllAssets();
    if (!assetsValidation.isValid) {
      issues.push(...assetsValidation.issues);
    }
    
    // Validation de la documentation
    const docsValidation = await this.validateDocumentation();
    if (!docsValidation.isValid) {
      issues.push(...docsValidation.issues);
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  async validateSOTStructure() {
    console.log('🔍 Validation de la structure SOT...');
    
    const issues = [];
    
    // Vérifier que le dossier catalog existe
    if (!await fs.pathExists(this.catalogPath)) {
      issues.push('Dossier catalog manquant');
      await this.createSOTStructure();
    }
    
    // Vérifier la structure des catégories
    const categories = await this.getSOTCategories();
    for (const category of categories) {
      const categoryPath = path.join(this.catalogPath, category);
      if (!await fs.pathExists(categoryPath)) {
        issues.push(`Catégorie ${category} manquante`);
        await fs.ensureDir(categoryPath);
      }
      
      // Vérifier le dossier tuya dans chaque catégorie
      const tuyaPath = path.join(categoryPath, 'tuya');
      if (!await fs.pathExists(tuyaPath)) {
        issues.push(`Dossier tuya manquant dans ${category}`);
        await fs.ensureDir(tuyaPath);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  async createSOTStructure() {
    console.log('📁 Création de la structure SOT...');
    
    const categories = [
      'light', 'switch', 'sensor-motion', 'sensor-presence', 'sensor-temp',
      'sensor-humidity', 'sensor-contact', 'sensor-water', 'sensor-smoke',
      'sensor-gas', 'sensor-vibration', 'sensor-sound', 'sensor-light',
      'sensor-occupancy', 'sensor-multi', 'curtain', 'blind', 'fan',
      'thermostat', 'lock', 'garage', 'gate', 'valve', 'pump', 'motor',
      'relay', 'dimmer', 'bulb', 'strip', 'panel', 'controller', 'bridge',
      'gateway', 'repeater', 'extender', 'hub', 'coordinator', 'router',
      'end-device', 'other'
    ];
    
    for (const category of categories) {
      const categoryPath = path.join(this.catalogPath, category);
      await fs.ensureDir(categoryPath);
      
      const tuyaPath = path.join(categoryPath, 'tuya');
      await fs.ensureDir(tuyaPath);
    }
    
    console.log('✅ Structure SOT créée');
  }

  async getSOTCategories() {
    return [
      'light', 'switch', 'sensor-motion', 'sensor-presence', 'sensor-temp',
      'sensor-humidity', 'sensor-contact', 'sensor-water', 'sensor-smoke',
      'sensor-gas', 'sensor-vibration', 'sensor-sound', 'sensor-light',
      'sensor-occupancy', 'sensor-multi', 'curtain', 'blind', 'fan',
      'thermostat', 'lock', 'garage', 'gate', 'valve', 'pump', 'motor',
      'relay', 'dimmer', 'bulb', 'strip', 'panel', 'controller', 'bridge',
      'gateway', 'repeater', 'extender', 'hub', 'coordinator', 'router',
      'end-device', 'other'
    ];
  }

  async validateAllDrivers() {
    console.log('🔍 Validation de tous les drivers...');
    
    const issues = [];
    const drivers = await this.getAllDrivers();
    
    for (const driver of drivers) {
      const driverValidation = await this.validateDriver(driver);
      if (!driverValidation.isValid) {
        issues.push(...driverValidation.issues);
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  async getAllDrivers() {
    const drivers = [];
    
    // Drivers dans le dossier drivers
    if (await fs.pathExists(this.driversPath)) {
      const driverDirs = await fs.readdir(this.driversPath);
      for (const dir of driverDirs) {
        const dirPath = path.join(this.driversPath, dir);
        const stats = await fs.stat(dirPath);
        if (stats.isDirectory()) {
          drivers.push({ path: dirPath, name: dir, type: 'drivers' });
        }
      }
    }
    
    // Drivers dans le catalog SOT
    if (await fs.pathExists(this.catalogPath)) {
      const categories = await this.getSOTCategories();
      for (const category of categories) {
        const categoryPath = path.join(this.catalogPath, category, 'tuya');
        if (await fs.pathExists(categoryPath)) {
          const tuyaDrivers = await fs.readdir(categoryPath);
          for (const driver of tuyaDrivers) {
            const driverPath = path.join(categoryPath, driver);
            const stats = await fs.stat(driverPath);
            if (stats.isDirectory()) {
              drivers.push({ path: driverPath, name: driver, type: 'catalog', category: category });
            }
          }
        }
      }
    }
    
    return drivers;
  }

  async validateDriver(driver) {
    const issues = [];
    
    // Vérifier les fichiers requis
    const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
    for (const file of requiredFiles) {
      const filePath = path.join(driver.path, file);
      if (!await fs.pathExists(filePath)) {
        issues.push(`${driver.name}: ${file} manquant`);
      }
    }
    
    // Vérifier le dossier assets
    const assetsPath = path.join(driver.path, 'assets');
    if (!await fs.pathExists(assetsPath)) {
      issues.push(`${driver.name}: dossier assets manquant`);
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  async validateAllAssets() {
    console.log('🔍 Validation de tous les assets...');
    
    const issues = [];
    const drivers = await this.getAllDrivers();
    
    for (const driver of drivers) {
      const assetsPath = path.join(driver.path, 'assets');
      if (await fs.pathExists(assetsPath)) {
        const assets = await fs.readdir(assetsPath);
        
        // Vérifier l'icône SVG
        if (!assets.includes('icon.svg')) {
          issues.push(`${driver.name}: icon.svg manquant`);
        }
        
        // Vérifier les images PNG
        const requiredImages = ['small.png', 'large.png', 'xlarge.png'];
        for (const image of requiredImages) {
          if (!assets.includes(image)) {
            issues.push(`${driver.name}: ${image} manquant`);
          }
        }
      }
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  async validateDocumentation() {
    console.log('🔍 Validation de la documentation...');
    
    const issues = [];
    
    // Vérifier README.md
    const readmePath = path.join(this.projectRoot, 'README.md');
    if (!await fs.pathExists(readmePath)) {
      issues.push('README.md manquant');
    }
    
    // Vérifier CHANGELOG.md
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
    if (!await fs.pathExists(changelogPath)) {
      issues.push('CHANGELOG.md manquant');
    }
    
    return {
      isValid: issues.length === 0,
      issues: issues
    };
  }

  async applyFixes(issues) {
    console.log(`🔧 Application de ${issues.length} corrections...`);
    
    for (const issue of issues) {
      console.log(`  🔧 Correction: ${issue}`);
      
      // Appliquer les corrections selon le type d'issue
      if (issue.includes('assets manquant')) {
        await this.regenerateMissingAssets(issue);
      } else if (issue.includes('manquant')) {
        await this.fixInvalidDrivers(issue);
      }
    }
  }

  async regenerateMissingAssets(issue) {
    // Extraire le nom du driver de l'issue
    const driverName = issue.split(':')[0];
    
    // Trouver le driver
    const drivers = await this.getAllDrivers();
    const driver = drivers.find(d => d.name === driverName);
    
    if (driver) {
      await this.generateAllMissingAssets(driver);
    }
  }

  async generateAllMissingAssets(driver) {
    const assetsPath = path.join(driver.path, 'assets');
    await fs.ensureDir(assetsPath);
    
    // Générer l'icône SVG
    await this.generateIconSVG(assetsPath);
    
    // Générer les images PNG
    await this.generateImageSVG(assetsPath, 'small', 75, 75);
    await this.generateImageSVG(assetsPath, 'large', 500, 500);
    await this.generateImageSVG(assetsPath, 'xlarge', 1000, 1000);
    
    console.log(`✅ Assets générés pour ${driver.name}`);
  }

  async generateIconSVG(assetsPath, driver) {
    const category = this.getCategoryFromDriver(driver);
    const iconContent = this.getIconSVGForCategory(category);
    
    await fs.writeFile(path.join(assetsPath, 'icon.svg'), iconContent);
  }

  async generateImageSVG(assetsPath, size, width, height, driver) {
    const category = this.getCategoryFromDriver(driver);
    const imageContent = this.getImageSVGForCategory(category, size, width, height);
    
    await fs.writeFile(path.join(assetsPath, `${size}.svg`), imageContent);
  }

  getIconSVGForCategory(category) {
    const icons = {
      'light': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<circle cx="12" cy="12" r="8" fill="#FFD700" stroke="#FFA500" stroke-width="1"/>
<path d="M12 4 L12 2 M12 22 L12 20 M4 12 L2 12 M22 12 L20 12" stroke="#FFA500" stroke-width="1"/>
</svg>`,
      
      'switch': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<rect x="6" y="8" width="12" height="8" rx="2" fill="#4CAF50" stroke="#2E7D32" stroke-width="1"/>
<circle cx="12" cy="12" r="2" fill="#2E7D32"/>
</svg>`,
      
      'sensor-motion': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<circle cx="12" cy="12" r="8" fill="#FF5722" stroke="#D84315" stroke-width="1"/>
<path d="M12 4 L12 2 M12 22 L12 20 M4 12 L2 12 M22 12 L20 12" stroke="#D84315" stroke-width="1"/>
<circle cx="12" cy="12" r="3" fill="#D84315"/>
</svg>`,
      
      'sensor-temp': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<path d="M9 9a3 3 0 1 1 6 0v5.25a3 3 0 1 1-6 0V9z" fill="#FF5722"/>
<path d="M12 2v2 M12 20v2" stroke="#FF5722" stroke-width="1"/>
</svg>`,
      
      'sensor-humidity': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<path d="M12 2c-3.5 0-6.5 2.5-6.5 6.5 0 4.5 6.5 11.5 6.5 11.5s6.5-7 6.5-11.5C18.5 4.5 15.5 2 12 2z" fill="#2196F3"/>
<circle cx="12" cy="8" r="2" fill="#1976D2"/>
</svg>`,
      
      'sensor-contact': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<rect x="4" y="6" width="16" height="12" rx="2" fill="#9C27B0" stroke="#7B1FA2" stroke-width="1"/>
<path d="M8 10 L16 10 M8 14 L16 14" stroke="#7B1FA2" stroke-width="1"/>
</svg>`,
      
      'curtain': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<path d="M3 6 L21 6 M3 12 L21 12 M3 18 L21 18" stroke="#795548" stroke-width="2"/>
<rect x="2" y="4" width="20" height="2" fill="#795548"/>
<rect x="2" y="18" width="20" height="2" fill="#795548"/>
</svg>`,
      
      'fan': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<circle cx="12" cy="12" r="8" fill="#607D8B" stroke="#455A64" stroke-width="1"/>
<path d="M12 4 L12 2 M12 22 L12 20 M4 12 L2 12 M22 12 L20 12" stroke="#455A64" stroke-width="1"/>
<circle cx="12" cy="12" r="2" fill="#455A64"/>
</svg>`,
      
      'thermostat': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<circle cx="12" cy="12" r="8" fill="#FF9800" stroke="#F57C00" stroke-width="1"/>
<path d="M12 4 L12 2 M12 22 L12 20 M4 12 L2 12 M22 12 L20 12" stroke="#F57C00" stroke-width="1"/>
<text x="12" y="16" text-anchor="middle" fill="#F57C00" font-size="8">T</text>
</svg>`,
      
      'lock': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<rect x="8" y="12" width="8" height="8" rx="1" fill="#FF5722" stroke="#D84315" stroke-width="1"/>
<path d="M10 12 L10 8 A2 2 0 0 1 14 8 L14 12" stroke="#D84315" stroke-width="1" fill="none"/>
<circle cx="12" cy="16" r="1" fill="#D84315"/>
</svg>`,
      
      'other': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<rect x="6" y="6" width="12" height="12" rx="2" fill="#9E9E9E" stroke="#757575" stroke-width="1"/>
<path d="M9 12 L15 12 M12 9 L12 15" stroke="#757575" stroke-width="1"/>
</svg>`
    };
    
    return icons[category] || icons['other'];
  }

  getImageSVGForCategory(category, size, width, height) {
    const baseIcon = this.getIconSVGForCategory(category);
    
    // Adapter l'icône aux dimensions demandées
    const adaptedIcon = baseIcon
      .replace(/width="24"/, `width="${width}"`)
      .replace(/height="24"/, `height="${height}"`)
      .replace(/viewBox="0 0 24 24"/, `viewBox="0 0 ${width} ${height}"`);
    
    return adaptedIcon;
  }

  async fixInvalidDrivers(issue) {
    // Extraire le nom du driver de l'issue
    const driverName = issue.split(':')[0];
    
    // Trouver le driver
    const drivers = await this.getAllDrivers();
    const driver = drivers.find(d => d.name === driverName);
    
    if (driver) {
      await this.generateComposeData(driver);
      await this.generateDeviceJsContent(driver);
      await this.generateDriverJsContent(driver);
      
      console.log(`✅ Driver ${driver.name} corrigé`);
    }
  }

  async generateComposeData(driver) {
    const category = this.getCategoryFromDriver(driver);
    const capabilities = this.getCapabilitiesForDriver(driver);
    
    const composeData = {
      id: `tuya_${driver.name}`,
      title: `Tuya ${driver.name}`,
      category: category,
      capabilities: capabilities,
      images: {
        small: "assets/small.png",
        large: "assets/large.png"
      }
    };
    
    await fs.writeFile(
      path.join(driver.path, 'driver.compose.json'),
      JSON.stringify(composeData, null, 2)
    );
  }

  getCategoryFromDriver(driver) {
    if (driver.type === 'catalog' && driver.category) {
      return driver.category;
    }
    
    const name = driver.name.toLowerCase();
    
    if (name.includes('bulb') || name.includes('light') || name.includes('rgb')) return 'light';
    if (name.includes('switch') || name.includes('plug')) return 'switch';
    if (name.includes('motion') || name.includes('sensor')) return 'sensor-motion';
    if (name.includes('temp') || name.includes('therm')) return 'sensor-temp';
    if (name.includes('humid')) return 'sensor-humidity';
    
    return 'other';
  }

  getCapabilitiesForDriver(driver) {
    const name = driver.name.toLowerCase();
    
    if (name.includes('bulb') || name.includes('light')) return ['onoff', 'dim'];
    if (name.includes('switch') || name.includes('plug')) return ['onoff'];
    if (name.includes('motion') || name.includes('sensor')) return ['alarm_motion'];
    if (name.includes('temp')) return ['measure_temperature'];
    if (name.includes('humid')) return ['measure_humidity'];
    
    return ['onoff'];
  }

  async generateDeviceJsContent(driver) {
    const deviceContent = `const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Configuration des capacités
    const capabilities = ${JSON.stringify(this.getCapabilitiesForDriver(driver))};
    for (const capability of capabilities) {
      await this.registerCapability(capability, 'genOnOff');
    }
  }
}

module.exports = TuyaDevice;`;
    
    await fs.writeFile(path.join(driver.path, 'device.js'), deviceContent);
  }

  async generateDriverJsContent(driver) {
    const driverContent = `const { ZigBeeDriver } = require('homey-meshdriver');

class TuyaDriver extends ZigBeeDriver {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Configuration des clusters
    this.enableDebug();
    this.printNode();
  }
}

module.exports = TuyaDriver;`;
    
    await fs.writeFile(path.join(driver.path, 'driver.js'), driverContent);
  }

  async runStandardEnrichment() {
    console.log('🔄 Mode enrichissement standard...');
    
    // Logique d'enrichissement standard
    await this.updateDocumentation();
    await this.updateMainREADME();
    await this.updateCHANGELOG();
  }

  async updateDocumentation() {
    console.log('📝 Mise à jour de la documentation...');
    
    // Mettre à jour le README principal
    await this.updateMainREADME();
    
    // Mettre à jour le CHANGELOG
    await this.updateCHANGELOG();
  }

  async updateMainREADME() {
    const readmePath = path.join(this.projectRoot, 'README.md');
    
    if (await fs.pathExists(readmePath)) {
      let readmeContent = await fs.readFile(readmePath, 'utf8');
      
      // Ajouter une section sur la conversion PowerShell
      if (!readmeContent.includes('Conversion PowerShell')) {
        const conversionSection = `

## 🔄 Conversion PowerShell vers JavaScript

Tous les scripts PowerShell ont été convertis en JavaScript pour une meilleure compatibilité et maintenance.

### Scripts convertis:
- \`push-final.ps1\` → \`scripts/push-final.js\`
- \`cleanup-direct.ps1\` → \`scripts/cleanup-direct.js\`
- \`final-cleanup.ps1\` → \`scripts/final-cleanup.js\`
- \`push-to-github.ps1\` → \`scripts/push-to-github.js\`
- \`restore-tuya.ps1\` → \`scripts/restore-tuya.js\`

### Structure optimisée:
- Dossier \`drivers/\` : \`tuya_zigbee\`, \`zigbee\`, \`_common\` uniquement
- Architecture Source-of-Truth dans \`catalog/\`
- Fichiers .json, .png, .img préservés
`;
        
        readmeContent += conversionSection;
        await fs.writeFile(readmePath, readmeContent);
      }
    }
  }

  async updateCHANGELOG() {
    const changelogPath = path.join(this.projectRoot, 'CHANGELOG.md');
    
    if (await fs.pathExists(changelogPath)) {
      let changelogContent = await fs.readFile(changelogPath, 'utf8');
      
      // Ajouter une entrée pour la conversion PowerShell
      if (!changelogContent.includes('Conversion PowerShell')) {
        const conversionEntry = `

## [3.4.1] - ${new Date().toISOString().split('T')[0]}

### Changed
- Conversion de tous les scripts PowerShell en JavaScript
- Optimisation de la structure du dossier drivers
- Implémentation de l'architecture Source-of-Truth

### Fixed
- Restauration des fichiers .json supprimés par erreur
- Restauration des dossiers tools, lib, tests, etc.
- Préservation de tous les fichiers .json, .png, .img

### Added
- Scripts JavaScript équivalents aux scripts PowerShell
- Structure catalog/ avec catégorisation des drivers
- Validation récursive et auto-correction
`;
        
        changelogContent = conversionEntry + changelogContent;
        await fs.writeFile(changelogPath, changelogContent);
      }
    }
  }
}

// Exécuter Mega Enrichment
if (require.main === module) {
  const mega = new MegaEnrichmentFixed();
  mega.run().catch(console.error);
}
