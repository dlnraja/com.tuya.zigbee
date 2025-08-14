#!/usr/bin/env node

console.log('🔄 RESTAURATION ET FUSION COMPLÈTE DES DRIVERS v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

class DriverRestorationAndFusion {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.catalogPath = path.join(this.projectRoot, 'catalog');
    this.backupsPath = path.join(this.projectRoot, 'backups');
    
    // Structure des catégories selon la nouvelle architecture
    this.categories = {
      'light': ['bulb', 'strip', 'panel', 'ceiling', 'table', 'garden', 'floor'],
      'switch': ['wall', 'smart', 'outlet', 'power'],
      'sensor-motion': ['motion', 'presence'],
      'sensor-temp': ['temperature', 'thermostat', 'climate'],
      'sensor-humidity': ['humidity'],
      'sensor-contact': ['contact'],
      'sensor-water': ['water'],
      'sensor-smoke': ['smoke'],
      'sensor-gas': ['gas'],
      'sensor-vibration': ['vibration'],
      'cover': ['curtain', 'blind', 'shade', 'garage'],
      'lock': ['lock', 'deadbolt', 'padlock', 'door'],
      'fan': ['fan'],
      'heater': ['heater'],
      'ac': ['ac'],
      'other': ['generic', 'template']
    };
  }

  async run() {
    try {
      console.log('🚀 DÉMARRAGE RESTAURATION ET FUSION...');
      
      // 1. Restaurer la structure des dossiers
      await this.restoreDirectoryStructure();
      
      // 2. Analyser et fusionner les drivers existants
      await this.analyzeAndMergeExistingDrivers();
      
      // 3. Créer la structure SOT (Source of Truth)
      await this.createSOTStructure();
      
      // 4. Migrer les drivers vers la nouvelle architecture
      await this.migrateDriversToNewArchitecture();
      
      // 5. Générer les assets manquants
      await this.generateMissingAssets();
      
      // 6. Valider la structure finale
      await this.validateFinalStructure();
      
      console.log('✅ RESTAURATION ET FUSION TERMINÉES !');
      
    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error);
    }
  }

  async restoreDirectoryStructure() {
    console.log('📁 Restauration de la structure des dossiers...');
    
    // Créer les dossiers principaux s'ils n'existent pas
    const mainDirs = ['tuya_zigbee', 'zigbee', '_common'];
    for (const dir of mainDirs) {
      const dirPath = path.join(this.driversPath, dir);
      if (!await fs.pathExists(dirPath)) {
        await fs.ensureDir(dirPath);
        console.log(`✅ Créé: ${dir}`);
      }
    }
    
    // Créer la structure catalog SOT
    if (!await fs.pathExists(this.catalogPath)) {
      await fs.ensureDir(this.catalogPath);
    }
    
    // Créer les catégories dans catalog
    for (const [category, subcategories] of Object.entries(this.categories)) {
      const categoryPath = path.join(this.catalogPath, category);
      await fs.ensureDir(categoryPath);
      
      // Créer le dossier tuya dans chaque catégorie
      const tuyaPath = path.join(categoryPath, 'tuya');
      await fs.ensureDir(tuyaPath);
      
      // Créer le dossier zigbee dans chaque catégorie
      const zigbeePath = path.join(categoryPath, 'zigbee');
      await fs.ensureDir(zigbeePath);
    }
    
    console.log('✅ Structure des dossiers restaurée');
  }

  async analyzeAndMergeExistingDrivers() {
    console.log('🔍 Analyse et fusion des drivers existants...');
    
    // Analyser les drivers dans models
    const modelsPath = path.join(this.driversPath, 'tuya_zigbee', 'models');
    if (await fs.pathExists(modelsPath)) {
      const models = await fs.readdir(modelsPath);
      console.log(`📊 Trouvé ${models.length} modèles dans models/`);
      
      for (const model of models) {
        const modelPath = path.join(modelsPath, model);
        const stats = await fs.stat(modelPath);
        
        if (stats.isDirectory()) {
          await this.analyzeDriverModel(model, modelPath);
        }
      }
    }
    
    // Analyser les drivers dans zigbee
    const zigbeePath = path.join(this.driversPath, 'zigbee');
    if (await fs.pathExists(zigbeePath)) {
      const zigbeeDrivers = await fs.readdir(zigbeePath);
      console.log(`📊 Trouvé ${zigbeeDrivers.length} drivers Zigbee`);
      
      for (const driver of zigbeeDrivers) {
        const driverPath = path.join(zigbeePath, driver);
        const stats = await fs.stat(driverPath);
        
        if (stats.isDirectory()) {
          await this.analyzeZigbeeDriver(driver, driverPath);
        }
      }
    }
  }

  async analyzeDriverModel(modelName, modelPath) {
    console.log(`🔍 Analyse du modèle: ${modelName}`);
    
    // Déterminer la catégorie basée sur le nom
    const category = this.determineCategoryFromName(modelName);
    
    // Vérifier les fichiers requis
    const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      const filePath = path.join(modelPath, file);
      if (!await fs.pathExists(filePath)) {
        missingFiles.push(file);
      }
    }
    
    // Vérifier les assets
    const assetsPath = path.join(modelPath, 'assets');
    const hasAssets = await fs.pathExists(assetsPath);
    
    // Stocker l'analyse
    const analysis = {
      name: modelName,
      path: modelPath,
      category: category,
      missingFiles: missingFiles,
      hasAssets: hasAssets,
      type: 'tuya_model'
    };
    
    await this.storeDriverAnalysis(analysis);
    
    if (missingFiles.length > 0) {
      console.log(`⚠️ ${modelName}: fichiers manquants: ${missingFiles.join(', ')}`);
    }
  }

  async analyzeZigbeeDriver(driverName, driverPath) {
    console.log(`🔍 Analyse du driver Zigbee: ${driverName}`);
    
    // Déterminer la catégorie
    const category = this.determineCategoryFromName(driverName);
    
    // Vérifier les fichiers requis
    const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
    const missingFiles = [];
    
    for (const file of requiredFiles) {
      const filePath = path.join(driverPath, file);
      if (!await fs.pathExists(filePath)) {
        missingFiles.push(file);
      }
    }
    
    // Vérifier les assets
    const assetsPath = path.join(driverPath, 'assets');
    const hasAssets = await fs.pathExists(assetsPath);
    
    // Stocker l'analyse
    const analysis = {
      name: driverName,
      path: driverPath,
      category: category,
      missingFiles: missingFiles,
      hasAssets: hasAssets,
      type: 'zigbee_driver'
    };
    
    await this.storeDriverAnalysis(analysis);
  }

  determineCategoryFromName(name) {
    const lowerName = name.toLowerCase();
    
    // Vérifier chaque catégorie et ses sous-catégories
    for (const [category, subcategories] of Object.entries(this.categories)) {
      for (const subcategory of subcategories) {
        if (lowerName.includes(subcategory)) {
          return category;
        }
      }
    }
    
    // Vérifications spécifiques
    if (lowerName.includes('ts0001') || lowerName.includes('ts0002') || lowerName.includes('ts0003')) {
      return 'switch';
    }
    if (lowerName.includes('ts0201') || lowerName.includes('ts0202') || lowerName.includes('ts0203') || lowerName.includes('ts0205')) {
      return 'sensor-temp';
    }
    if (lowerName.includes('ts0601')) {
      if (lowerName.includes('curtain') || lowerName.includes('cover')) return 'cover';
      if (lowerName.includes('switch')) return 'switch';
      if (lowerName.includes('plug')) return 'switch';
      return 'other';
    }
    if (lowerName.includes('ts011f')) {
      return 'switch';
    }
    if (lowerName.includes('ts0505')) {
      return 'light';
    }
    
    return 'other';
  }

  async storeDriverAnalysis(analysis) {
    const analysisPath = path.join(this.backupsPath, 'driver-analysis.json');
    
    let analyses = [];
    if (await fs.pathExists(analysisPath)) {
      analyses = JSON.parse(await fs.readFile(analysisPath, 'utf8'));
    }
    
    analyses.push(analysis);
    await fs.writeFile(analysisPath, JSON.stringify(analyses, null, 2));
  }

  async createSOTStructure() {
    console.log('📁 Création de la structure Source of Truth...');
    
    // Créer la structure catalog avec les drivers existants
    const analysisPath = path.join(this.backupsPath, 'driver-analysis.json');
    
    if (await fs.pathExists(analysisPath)) {
      const analyses = JSON.parse(await fs.readFile(analysisPath, 'utf8'));
      
      for (const analysis of analyses) {
        await this.createSOTEntry(analysis);
      }
    }
    
    console.log('✅ Structure SOT créée');
  }

  async createSOTEntry(analysis) {
    const category = analysis.category;
    const categoryPath = path.join(this.catalogPath, category);
    
    if (!await fs.pathExists(categoryPath)) {
      await fs.ensureDir(categoryPath);
    }
    
    // Créer le dossier vendor (tuya ou zigbee)
    const vendor = analysis.type === 'tuya_model' ? 'tuya' : 'zigbee';
    const vendorPath = path.join(categoryPath, vendor);
    await fs.ensureDir(vendorPath);
    
    // Créer le dossier produit (nom lisible)
    const productName = this.createProductName(analysis.name);
    const productPath = path.join(vendorPath, productName);
    await fs.ensureDir(productPath);
    
    // Copier les fichiers du driver vers le SOT
    await this.copyDriverToSOT(analysis.path, productPath);
    
    console.log(`✅ SOT créé: ${category}/${vendor}/${productName}`);
  }

  createProductName(originalName) {
    // Convertir le nom technique en nom lisible
    let name = originalName
      .replace(/^tuya-/, '')
      .replace(/^ts\d+/, '')
      .replace(/_/g, '-')
      .replace(/-(\d+)/, '')
      .replace(/-default-\d+$/, '')
      .replace(/-standard$/, '');
    
    // Nettoyer et formater
    name = name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('_');
    
    return name || 'generic_device';
  }

  async copyDriverToSOT(sourcePath, targetPath) {
    try {
      // Copier les fichiers principaux
      const filesToCopy = ['driver.compose.json', 'device.js', 'driver.js'];
      
      for (const file of filesToCopy) {
        const sourceFile = path.join(sourcePath, file);
        const targetFile = path.join(targetPath, file);
        
        if (await fs.pathExists(sourceFile)) {
          await fs.copy(sourceFile, targetFile);
        }
      }
      
      // Copier le dossier assets s'il existe
      const sourceAssets = path.join(sourcePath, 'assets');
      const targetAssets = path.join(targetPath, 'assets');
      
      if (await fs.pathExists(sourceAssets)) {
        await fs.copy(sourceAssets, targetAssets);
      }
      
      // Créer metadata.json avec les informations du driver
      await this.createMetadataFile(targetPath, sourcePath);
      
    } catch (error) {
      console.log(`⚠️ Erreur lors de la copie vers SOT: ${error.message}`);
    }
  }

  async createMetadataFile(targetPath, sourcePath) {
    const metadata = {
      name: path.basename(targetPath),
      type: 'tuya_zigbee',
      category: this.extractCategoryFromPath(targetPath),
      source: path.relative(this.projectRoot, sourcePath),
      created: new Date().toISOString(),
      version: '3.4.1',
      sdk: '3.4.1'
    };
    
    const metadataPath = path.join(targetPath, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  extractCategoryFromPath(filePath) {
    const pathParts = filePath.split(path.sep);
    const catalogIndex = pathParts.indexOf('catalog');
    
    if (catalogIndex >= 0 && catalogIndex + 1 < pathParts.length) {
      return pathParts[catalogIndex + 1];
    }
    
    return 'other';
  }

  async migrateDriversToNewArchitecture() {
    console.log('🔄 Migration des drivers vers la nouvelle architecture...');
    
    // Créer les drivers plats depuis le SOT
    await this.generateFlatDriversFromSOT();
    
    // Organiser les drivers existants
    await this.organizeExistingDrivers();
    
    console.log('✅ Migration terminée');
  }

  async generateFlatDriversFromSOT() {
    console.log('📁 Génération des drivers plats depuis le SOT...');
    
    if (!await fs.pathExists(this.catalogPath)) {
      return;
    }
    
    const categories = await fs.readdir(this.catalogPath);
    
    for (const category of categories) {
      const categoryPath = path.join(this.catalogPath, category);
      const vendors = await fs.readdir(categoryPath);
      
      for (const vendor of vendors) {
        const vendorPath = path.join(categoryPath, vendor);
        const products = await fs.readdir(vendorPath);
        
        for (const product of products) {
          const productPath = path.join(vendorPath, product);
          await this.generateFlatDriver(category, vendor, product, productPath);
        }
      }
    }
  }

  async generateFlatDriver(category, vendor, product, productPath) {
    // Créer le nom du driver plat
    const flatDriverName = `${vendor}_${category}_${product}`;
    const flatDriverPath = path.join(this.driversPath, vendor === 'tuya' ? 'tuya_zigbee' : 'zigbee', flatDriverName);
    
    // Copier le contenu du SOT vers le driver plat
    if (await fs.pathExists(productPath)) {
      await fs.copy(productPath, flatDriverPath);
      console.log(`✅ Driver plat créé: ${flatDriverName}`);
    }
  }

  async organizeExistingDrivers() {
    console.log('📁 Organisation des drivers existants...');
    
    // Organiser les drivers dans models
    const modelsPath = path.join(this.driversPath, 'tuya_zigbee', 'models');
    if (await fs.pathExists(modelsPath)) {
      const models = await fs.readdir(modelsPath);
      
      for (const model of models) {
        const modelPath = path.join(modelsPath, model);
        await this.organizeDriver(modelPath, 'tuya_zigbee');
      }
    }
    
    // Organiser les drivers zigbee
    const zigbeePath = path.join(this.driversPath, 'zigbee');
    if (await fs.pathExists(zigbeePath)) {
      const zigbeeDrivers = await fs.readdir(zigbeePath);
      
      for (const driver of zigbeeDrivers) {
        const driverPath = path.join(zigbeePath, driver);
        await this.organizeDriver(driverPath, 'zigbee');
      }
    }
  }

  async organizeDriver(driverPath, targetDir) {
    try {
      const driverName = path.basename(driverPath);
      const category = this.determineCategoryFromName(driverName);
      
      // Créer le dossier de catégorie s'il n'existe pas
      const categoryPath = path.join(this.driversPath, targetDir, category);
      await fs.ensureDir(categoryPath);
      
      // Déplacer le driver vers sa catégorie
      const targetPath = path.join(categoryPath, driverName);
      if (!await fs.pathExists(targetPath)) {
        await fs.move(driverPath, targetPath);
        console.log(`✅ Driver organisé: ${targetDir}/${category}/${driverName}`);
      }
      
    } catch (error) {
      console.log(`⚠️ Erreur lors de l'organisation: ${error.message}`);
    }
  }

  async generateMissingAssets() {
    console.log('🎨 Génération des assets manquants...');
    
    // Parcourir tous les drivers et générer les assets manquants
    const drivers = await this.getAllDrivers();
    
    for (const driver of drivers) {
      await this.generateDriverAssets(driver);
    }
    
    console.log('✅ Assets générés');
  }

  async getAllDrivers() {
    const drivers = [];
    
    // Drivers dans tuya_zigbee
    const tuyaPath = path.join(this.driversPath, 'tuya_zigbee');
    if (await fs.pathExists(tuyaPath)) {
      await this.scanDriversRecursively(tuyaPath, drivers, 'tuya_zigbee');
    }
    
    // Drivers dans zigbee
    const zigbeePath = path.join(this.driversPath, 'zigbee');
    if (await fs.pathExists(zigbeePath)) {
      await this.scanDriversRecursively(zigbeePath, drivers, 'zigbee');
    }
    
    return drivers;
  }

  async scanDriversRecursively(dirPath, drivers, type) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          // Vérifier si c'est un driver (contient driver.compose.json)
          const composeFile = path.join(fullPath, 'driver.compose.json');
          if (await fs.pathExists(composeFile)) {
            drivers.push({
              path: fullPath,
              name: item,
              type: type
            });
          } else {
            // Continuer à scanner récursivement
            await this.scanDriversRecursively(fullPath, drivers, type);
          }
        }
      }
    } catch (error) {
      console.log(`⚠️ Erreur lors du scan: ${error.message}`);
    }
  }

  async generateDriverAssets(driver) {
    const assetsPath = path.join(driver.path, 'assets');
    await fs.ensureDir(assetsPath);
    
    const category = this.determineCategoryFromName(driver.name);
    
    // Générer l'icône SVG
    await this.generateIconSVG(assetsPath, category);
    
    // Générer les images SVG
    const sizes = [
      { name: 'small', width: 75, height: 75 },
      { name: 'large', width: 500, height: 500 },
      { name: 'xlarge', width: 1000, height: 1000 }
    ];
    
    for (const size of sizes) {
      await this.generateImageSVG(assetsPath, size.name, size.width, size.height, category);
    }
    
    console.log(`✅ Assets générés pour ${driver.name}`);
  }

  async generateIconSVG(assetsPath, category) {
    const iconContent = this.generateCategorySpecificIcon(category, 24, 24);
    await fs.writeFile(path.join(assetsPath, 'icon.svg'), iconContent);
  }

  async generateImageSVG(assetsPath, size, width, height, category) {
    const imageContent = this.generateCategorySpecificIcon(category, width, height);
    await fs.writeFile(path.join(assetsPath, `${size}.svg`), imageContent);
  }

  generateCategorySpecificIcon(category, width, height) {
    const baseStyle = `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg"`;
    const scale = Math.min(width, height) / 24;
    
    switch (category) {
      case 'light':
        return this.generateLightIcon(baseStyle, width, height, scale);
      case 'switch':
        return this.generateSwitchIcon(baseStyle, width, height, scale);
      case 'sensor-motion':
        return this.generateMotionSensorIcon(baseStyle, width, height, scale);
      case 'sensor-temp':
        return this.generateTempSensorIcon(baseStyle, width, height, scale);
      case 'sensor-humidity':
        return this.generateHumiditySensorIcon(baseStyle, width, height, scale);
      case 'cover':
        return this.generateCoverIcon(baseStyle, width, height, scale);
      case 'lock':
        return this.generateLockIcon(baseStyle, width, height, scale);
      default:
        return this.generateGenericIcon(baseStyle, width, height, scale);
    }
  }

  generateLightIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const bulbRadius = 8 * scale;
    const glowRadius = 12 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<defs>
  <radialGradient id="bulbGlow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" style="stop-color:#FFFF00;stop-opacity:1" />
    <stop offset="70%" style="stop-color:#FFD700;stop-opacity:0.8" />
    <stop offset="100%" style="stop-color:#FFA500;stop-opacity:0.3" />
  </radialGradient>
</defs>
<circle cx="${centerX}" cy="${centerY}" r="${glowRadius}" fill="url(#bulbGlow)"/>
<circle cx="${centerX}" cy="${centerY}" r="${bulbRadius}" fill="#FFD700" stroke="#FFA500" stroke-width="${2 * scale}"/>
<path d="M ${centerX - 2 * scale} ${centerY - 2 * scale} L ${centerX + 2 * scale} ${centerY + 2 * scale} M ${centerX + 2 * scale} ${centerY - 2 * scale} L ${centerX - 2 * scale} ${centerY + 2 * scale}" stroke="#FFA500" stroke-width="${1 * scale}"/>
</svg>`;
  }

  generateSwitchIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const buttonWidth = 12 * scale;
    const buttonHeight = 8 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<rect x="${centerX - buttonWidth/2}" y="${centerY - buttonHeight/2}" width="${buttonWidth}" height="${buttonHeight}" rx="${2 * scale}" fill="#4CAF50" stroke="#2E7D32" stroke-width="${2 * scale}"/>
<circle cx="${centerX}" cy="${centerY}" r="${2 * scale}" fill="#FFFFFF"/>
</svg>`;
  }

  generateMotionSensorIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const sensorRadius = 8 * scale;
    const waveRadius = 12 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<defs>
  <radialGradient id="motionWaves" cx="50%" cy="50%" r="50%">
    <stop offset="0%" style="stop-color:#2196F3;stop-opacity:0.8" />
    <stop offset="100%" style="stop-color:#1976D2;stop-opacity:0.1" />
  </radialGradient>
</defs>
<circle cx="${centerX}" cy="${centerY}" r="${waveRadius}" fill="url(#motionWaves)"/>
<circle cx="${centerX}" cy="${centerY}" r="${sensorRadius}" fill="#2196F3" stroke="#1976D2" stroke-width="${2 * scale}"/>
<circle cx="${centerX}" cy="${centerY}" r="${3 * scale}" fill="#FFFFFF"/>
</svg>`;
  }

  generateTempSensorIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const bulbRadius = 6 * scale;
    const stemHeight = 16 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<defs>
  <linearGradient id="thermometerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
    <stop offset="0%" style="stop-color:#FF5722;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#D84315;stop-opacity:1" />
  </linearGradient>
</defs>
<path d="M ${centerX - 2 * scale} ${centerY + stemHeight/2} L ${centerX - 2 * scale} ${centerY - stemHeight/2} A ${2 * scale} ${2 * scale} 0 0 1 ${centerX + 2 * scale} ${centerY - stemHeight/2} L ${centerX + 2 * scale} ${centerY + stemHeight/2} Z" fill="url(#thermometerGradient)" stroke="#D84315" stroke-width="${1 * scale}"/>
<circle cx="${centerX}" cy="${centerY - stemHeight/2}" r="${bulbRadius}" fill="url(#thermometerGradient)" stroke="#D84315" stroke-width="${1 * scale}"/>
</svg>`;
  }

  generateHumiditySensorIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<defs>
  <radialGradient id="waterDrop" cx="30%" cy="30%" r="70%">
    <stop offset="0%" style="stop-color:#03A9F4;stop-opacity:1" />
    <stop offset="100%" style="stop-color:#0277BD;stop-opacity:0.8" />
  </radialGradient>
</defs>
<path d="M ${centerX} ${centerY - 8 * scale} Q ${centerX - 6 * scale} ${centerY} ${centerX} ${centerY + 8 * scale} Q ${centerX + 6 * scale} ${centerY} ${centerX} ${centerY - 8 * scale} Z" fill="url(#waterDrop)" stroke="#0277BD" stroke-width="${1 * scale}"/>
<circle cx="${centerX}" cy="${centerY}" r="${2 * scale}" fill="#FFFFFF"/>
</svg>`;
  }

  generateCoverIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<rect x="${2 * scale}" y="${4 * scale}" width="${width - 4 * scale}" height="${2 * scale}" fill="#795548"/>
<rect x="${2 * scale}" y="${height - 6 * scale}" width="${width - 4 * scale}" height="${2 * scale}" fill="#795548"/>
<path d="M ${3 * scale} ${6 * scale} L ${width - 3 * scale} ${6 * scale}" stroke="#795548" stroke-width="${2 * scale}"/>
<path d="M ${3 * scale} ${centerY} L ${width - 3 * scale} ${centerY}" stroke="#795548" stroke-width="${2 * scale}"/>
<path d="M ${3 * scale} ${height - 8 * scale} L ${width - 3 * scale} ${height - 8 * scale}" stroke="#795548" stroke-width="${2 * scale}"/>
<circle cx="${centerX}" cy="${centerY}" r="${3 * scale}" fill="#5D4037"/>
</svg>`;
  }

  generateLockIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const lockWidth = 8 * scale;
    const lockHeight = 8 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<rect x="${centerX - lockWidth/2}" y="${centerY}" width="${lockWidth}" height="${lockHeight}" rx="${3 * scale}" fill="#FFC107" stroke="#FF8F00" stroke-width="${2 * scale}"/>
<path d="M ${centerX - lockWidth/2 - 2 * scale} ${centerY} L ${centerX - lockWidth/2 - 2 * scale} ${centerY - 4 * scale} A ${2 * scale} ${2 * scale} 0 0 1 ${centerX + lockWidth/2 + 2 * scale} ${centerY - 4 * scale} L ${centerX + lockWidth/2 + 2 * scale} ${centerY}" stroke="#FF8F00" stroke-width="${2 * scale}" fill="none"/>
<circle cx="${centerX}" cy="${centerY + 2 * scale}" r="${1 * scale}" fill="#FF8F00"/>
</svg>`;
  }

  generateGenericIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const boxSize = 12 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<rect x="${centerX - boxSize/2}" y="${centerY - boxSize/2}" width="${boxSize}" height="${boxSize}" rx="${2 * scale}" fill="#9E9E9E" stroke="#757575" stroke-width="${2 * scale}"/>
<path d="M ${centerX - 3 * scale} ${centerY} L ${centerX + 3 * scale} ${centerY}" stroke="#757575" stroke-width="${2 * scale}"/>
<path d="M ${centerX} ${centerY - 3 * scale} L ${centerX} ${centerY + 3 * scale}" stroke="#757575" stroke-width="${2 * scale}"/>
<circle cx="${centerX}" cy="${centerY}" r="${2 * scale}" fill="#FFFFFF"/>
</svg>`;
  }

  async validateFinalStructure() {
    console.log('📊 Validation de la structure finale...');
    
    // Compter les drivers
    const drivers = await this.getAllDrivers();
    console.log(`📊 Total drivers: ${drivers.length}`);
    
    // Compter par type
    const tuyaDrivers = drivers.filter(d => d.type === 'tuya_zigbee').length;
    const zigbeeDrivers = drivers.filter(d => d.type === 'zigbee').length;
    
    console.log(`📊 Tuya drivers: ${tuyaDrivers}`);
    console.log(`📊 Zigbee drivers: ${zigbeeDrivers}`);
    
    // Vérifier la structure SOT
    if (await fs.pathExists(this.catalogPath)) {
      const categories = await fs.readdir(this.catalogPath);
      console.log(`📊 Catégories SOT: ${categories.length}`);
      
      for (const category of categories) {
        const categoryPath = path.join(this.catalogPath, category);
        const vendors = await fs.readdir(categoryPath);
        
        for (const vendor of vendors) {
          const vendorPath = path.join(categoryPath, vendor);
          const products = await fs.readdir(vendorPath);
          console.log(`📊 ${category}/${vendor}: ${products.length} produits`);
        }
      }
    }
    
    console.log('✅ Validation terminée');
  }
}

// Exécuter la restauration et fusion
if (require.main === module) {
  const restoration = new DriverRestorationAndFusion();
  restoration.run().catch(console.error);
}
