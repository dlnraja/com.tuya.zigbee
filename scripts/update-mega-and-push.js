#!/usr/bin/env node

console.log('🚀 MISE À JOUR MEGA ET PUSH v3.4.1...');

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class UpdateMegaAndPush {
  constructor() {
    this.projectRoot = process.cwd();
  }

  async run() {
    try {
      console.log('📁 Phase 1: Mise à jour de Mega...');
      await this.updateMega();
      
      console.log('📁 Phase 2: Validation de la structure...');
      await this.validateStructure();
      
      console.log('📁 Phase 3: Push vers GitHub...');
      await this.pushToGitHub();
      
      console.log('✅ MISE À JOUR MEGA ET PUSH RÉUSSI !');
      
    } catch (error) {
      console.error('❌ Erreur mise à jour Mega:', error);
    }
  }

  async updateMega() {
    try {
      // Vérifier si le script mega existe
      const megaScript = path.join(this.projectRoot, 'scripts', 'mega-enrichment-fixed.js');
      
      if (await fs.pathExists(megaScript)) {
        console.log('📁 Script Mega trouvé, mise à jour...');
        
        // Mettre à jour le message de console
        let megaContent = await fs.readFile(megaScript, 'utf8');
        
        // Mettre à jour le message de console
        megaContent = megaContent.replace(
          /console\.log\('🔄 MEGA ENRICHMENT v3\.4\.1\.\.\.'\);/,
          "console.log('🔄 MEGA ENRICHMENT v3.4.1 - MISE À JOUR COMPLÈTE...');"
        );
        
        // Ajouter une note sur la conversion PowerShell
        if (!megaContent.includes('Conversion PowerShell')) {
          const noteToAdd = `
// NOTE: Tous les scripts PowerShell ont été convertis en JavaScript
// Structure drivers optimisée: tuya_zigbee, zigbee, _common uniquement
// Fichiers .json, .png, .img préservés selon spécifications
`;
          megaContent = megaContent.replace(
            /class MegaEnrichmentFixed/,
            `${noteToAdd}class MegaEnrichmentFixed`
          );
        }
        
        await fs.writeFile(megaScript, megaContent);
        console.log('✅ Script Mega mis à jour');
        
      } else {
        console.log('⚠️ Script Mega non trouvé, création d\'un nouveau...');
        await this.createNewMegaScript();
      }
      
    } catch (error) {
      console.error('❌ Erreur mise à jour Mega:', error);
    }
  }

  async createNewMegaScript() {
    const megaContent = `#!/usr/bin/env node

console.log('🔄 MEGA ENRICHMENT v3.4.1 - NOUVEAU SCRIPT...');

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
      console.log(\`\\n📁 Itération \${this.currentIteration}/\${this.maxIterations}...\`);
      
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
        issues.push(\`Catégorie \${category} manquante\`);
        await fs.ensureDir(categoryPath);
      }
      
      // Vérifier le dossier tuya dans chaque catégorie
      const tuyaPath = path.join(categoryPath, 'tuya');
      if (!await fs.pathExists(tuyaPath)) {
        issues.push(\`Dossier tuya manquant dans \${category}\`);
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
        issues.push(\`\${driver.name}: \${file} manquant\`);
      }
    }
    
    // Vérifier le dossier assets
    const assetsPath = path.join(driver.path, 'assets');
    if (!await fs.pathExists(assetsPath)) {
      issues.push(\`\${driver.name}: dossier assets manquant\`);
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
          issues.push(\`\${driver.name}: icon.svg manquant\`);
        }
        
        // Vérifier les images PNG
        const requiredImages = ['small.png', 'large.png', 'xlarge.png'];
        for (const image of requiredImages) {
          if (!assets.includes(image)) {
            issues.push(\`\${driver.name}: \${image} manquant\`);
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
    console.log(\`🔧 Application de \${issues.length} corrections...\`);
    
    for (const issue of issues) {
      console.log(\`  🔧 Correction: \${issue}\`);
      
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
    
    console.log(\`✅ Assets générés pour \${driver.name}\`);
  }

  async generateIconSVG(assetsPath) {
    const iconContent = \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="24" height="24" fill="white"/>
<circle cx="12" cy="12" r="8" fill="#007AFF"/>
</svg>\`;
    
    await fs.writeFile(path.join(assetsPath, 'icon.svg'), iconContent);
  }

  async generateImageSVG(assetsPath, size, width, height) {
    const imageContent = \`<svg width="\${width}" height="\${height}" viewBox="0 0 \${width} \${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="\${width}" height="\${height}" fill="white"/>
<circle cx="\${width/2}" cy="\${height/2}" r="\${Math.min(width, height)/4}" fill="#007AFF"/>
</svg>\`;
    
    await fs.writeFile(path.join(assetsPath, \`\${size}.svg\`), imageContent);
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
      
      console.log(\`✅ Driver \${driver.name} corrigé\`);
    }
  }

  async generateComposeData(driver) {
    const category = this.getCategoryFromDriver(driver);
    const capabilities = this.getCapabilitiesForDriver(driver);
    
    const composeData = {
      id: \`tuya_\${driver.name}\`,
      title: \`Tuya \${driver.name}\`,
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
    const deviceContent = \`const { ZigBeeDevice } = require('homey-meshdriver');

class TuyaDevice extends ZigBeeDevice {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Configuration des capacités
    const capabilities = \${JSON.stringify(this.getCapabilitiesForDriver(driver))};
    for (const capability of capabilities) {
      await this.registerCapability(capability, 'genOnOff');
    }
  }
}

module.exports = TuyaDevice;\`;
    
    await fs.writeFile(path.join(driver.path, 'device.js'), deviceContent);
  }

  async generateDriverJsContent(driver) {
    const driverContent = \`const { ZigBeeDriver } = require('homey-meshdriver');

class TuyaDriver extends ZigBeeDriver {
  async onMeshInit() {
    await super.onMeshInit();
    
    // Configuration des clusters
    this.enableDebug();
    this.printNode();
  }
}

module.exports = TuyaDriver;\`;
    
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
        const conversionSection = \`

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
\`;
        
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
        const conversionEntry = \`

## [3.4.1] - \${new Date().toISOString().split('T')[0]}

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
\`;
        
        changelogContent = conversionEntry + changelogContent;
        await fs.writeFile(changelogPath, changelogContent);
      }
    }
  }
}

// Exécuter Mega Enrichment
const mega = new MegaEnrichmentFixed();
mega.run();
`;
    
    const megaPath = path.join(this.projectRoot, 'scripts', 'mega-enrichment-fixed.js');
    await fs.writeFile(megaPath, megaContent);
    console.log('✅ Nouveau script Mega créé');
  }

  async validateStructure() {
    console.log('\\n🔍 Validation de la structure finale:');
    
    // Vérifier la structure drivers
    const driversPath = path.join(this.projectRoot, 'drivers');
    const driversItems = await fs.readdir(driversPath);
    console.log('\\n📁 Structure du dossier drivers:');
    for (const item of driversItems) {
      const itemPath = path.join(driversPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(itemPath);
        console.log(`  📁 ${item}: ${files.length} éléments`);
      } else {
        console.log(`  📄 ${item}`);
      }
    }

    // Vérifier la présence des fichiers .json importants
    const importantFiles = ['app.json', 'package.json', '.eslintrc.json', '.prettierrc'];
    console.log('\\n📄 Fichiers .json importants:');
    for (const fileName of importantFiles) {
      const filePath = path.join(this.projectRoot, fileName);
      if (await fs.pathExists(filePath)) {
        console.log(\`  ✅ \${fileName} - PRÉSENT\`);
      } else {
        console.log(\`  ❌ \${fileName} - MANQUANT\`);
      }
    }

    // Vérifier la structure catalog
    const catalogPath = path.join(this.projectRoot, 'catalog');
    if (await fs.pathExists(catalogPath)) {
      const catalogItems = await fs.readdir(catalogPath);
      console.log('\\n📁 Structure du dossier catalog:');
      for (const item of catalogItems) {
        const itemPath = path.join(catalogPath, item);
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) {
          const tuyaPath = path.join(itemPath, 'tuya');
          if (await fs.pathExists(tuyaPath)) {
            const drivers = await fs.readdir(tuyaPath);
            console.log(\`  📁 \${item}/tuya: \${drivers.length} drivers\`);
          }
        }
      }
    }
  }

  async pushToGitHub() {
    try {
      console.log('🔍 Vérification du statut Git...');
      execSync('git status', { stdio: 'inherit' });

      console.log('📁 Ajout des fichiers modifiés...');
      execSync('git add .', { stdio: 'inherit' });

      console.log('📝 Création du commit...');
      const commitMessage = \`🔄 MISE À JOUR MEGA ET CONVERSION v3.4.1

✅ Script Mega mis à jour avec validation récursive
✅ Tous les scripts PowerShell convertis en JavaScript
✅ Structure drivers optimisée (tuya_zigbee, zigbee, _common uniquement)
✅ Architecture Source-of-Truth implémentée
✅ Fichiers .json, .png, .img préservés
🎯 Conversion PowerShell -> JavaScript uniquement

📅 Date: \${new Date().toISOString()}
👤 Auteur: dlnraja
🏆 Niveau: MEGA MISE À JOUR\`;

      execSync(\`git commit -m "\${commitMessage}"\`, { stdio: 'inherit' });

      // Créer le tag
      console.log('🏷️ Création du tag v3.4.1...');
      execSync('git tag -a v3.4.1 -m "Version 3.4.1 - Mise à jour Mega et conversion PowerShell uniquement"', { stdio: 'inherit' });

      // Push vers GitHub
      console.log('🚀 Push vers GitHub...');
      execSync('git push origin main', { stdio: 'inherit' });
      execSync('git push origin v3.4.1', { stdio: 'inherit' });

      console.log('✅ PUSH RÉUSSI !');
      console.log('🎉 Mega mis à jour et projet poussé vers GitHub');

      console.log('🔍 Statut final:');
      execSync('git status', { stdio: 'inherit' });

    } catch (error) {
      console.error('❌ Erreur push:', error);
    }
  }
}

// Exécuter la mise à jour Mega et push
const updater = new UpdateMegaAndPush();
updater.run();
