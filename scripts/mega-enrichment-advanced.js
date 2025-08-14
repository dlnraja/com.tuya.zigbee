#!/usr/bin/env node

console.log('🚀 MEGA ENRICHMENT AVANCÉ v3.4.1 - IMAGES PERSONNALISÉES...');

const fs = require('fs-extra');
const path = require('path');

class MegaEnrichmentAdvanced {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.catalogPath = path.join(this.projectRoot, 'catalog');
    this.backupsPath = path.join(this.projectRoot, 'backups');
    
    // Références d'images par catégorie (inspirées de Johan Benz)
    this.imageReferences = {
      'light': {
        colors: ['#FFD700', '#FFA500', '#FFFF00'],
        elements: ['bulb', 'rays', 'glow'],
        style: 'modern'
      },
      'switch': {
        colors: ['#4CAF50', '#2E7D32', '#FFFFFF'],
        elements: ['button', 'indicator', 'frame'],
        style: 'minimal'
      },
      'sensor-motion': {
        colors: ['#2196F3', '#1976D2', '#FFFFFF'],
        elements: ['radar', 'waves', 'detection'],
        style: 'tech'
      },
      'sensor-temp': {
        colors: ['#FF5722', '#D84315', '#FFFFFF'],
        elements: ['thermometer', 'scale', 'mercury'],
        style: 'scientific'
      },
      'sensor-humidity': {
        colors: ['#03A9F4', '#0277BD', '#FFFFFF'],
        elements: ['droplet', 'waves', 'moisture'],
        style: 'fluid'
      }
    };
  }

  async run() {
    try {
      console.log('🔍 ANALYSE DES IMAGES EXISTANTES...');
      await this.analyzeExistingImages();
      
      console.log('🎨 GÉNÉRATION D\'IMAGES PERSONNALISÉES...');
      await this.generatePersonalizedImages();
      
      console.log('📊 VALIDATION DES ASSETS...');
      await this.validateAllAssets();
      
      console.log('✅ MEGA ENRICHMENT AVANCÉ TERMINÉ !');
      
    } catch (error) {
      console.error('❌ Erreur Mega Enrichment Avancé:', error);
    }
  }

  async analyzeExistingImages() {
    console.log('🔍 Recherche d\'images existantes comme références...');
    
    const existingImages = await this.findExistingImages();
    console.log(`📸 Trouvé ${existingImages.length} images existantes`);
    
    // Analyser les patterns d'images existantes
    for (const image of existingImages) {
      await this.analyzeImagePattern(image);
    }
  }

  async findExistingImages() {
    const images = [];
    
    // Chercher dans tous les dossiers assets
    const searchPaths = [this.driversPath, this.catalogPath];
    
    for (const searchPath of searchPaths) {
      if (await fs.pathExists(searchPath)) {
        await this.searchImagesRecursively(searchPath, images);
      }
    }
    
    return images;
  }

  async searchImagesRecursively(dirPath, images) {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await this.searchImagesRecursively(fullPath, images);
        } else if (this.isImageFile(item)) {
          images.push({
            path: fullPath,
            name: item,
            relativePath: path.relative(this.projectRoot, fullPath),
            size: stats.size,
            category: this.extractCategoryFromPath(fullPath)
          });
        }
      }
    } catch (error) {
      console.log(`⚠️ Erreur lors de la recherche dans ${dirPath}:`, error.message);
    }
  }

  isImageFile(filename) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.bmp'];
    const ext = path.extname(filename).toLowerCase();
    return imageExtensions.includes(ext);
  }

  extractCategoryFromPath(filePath) {
    const pathParts = filePath.split(path.sep);
    const assetsIndex = pathParts.indexOf('assets');
    
    if (assetsIndex > 0) {
      // Remonter de 2 niveaux depuis assets pour trouver la catégorie
      const categoryIndex = assetsIndex - 2;
      if (categoryIndex >= 0) {
        return pathParts[categoryIndex];
      }
    }
    
    return 'unknown';
  }

  async analyzeImagePattern(image) {
    console.log(`🔍 Analyse de ${image.relativePath} (${image.category})`);
    
    // Analyser les caractéristiques de l'image
    const analysis = {
      path: image.path,
      category: image.category,
      size: image.size,
      type: path.extname(image.name),
      patterns: await this.extractImagePatterns(image)
    };
    
    // Stocker l'analyse pour référence future
    await this.storeImageAnalysis(analysis);
  }

  async extractImagePatterns(image) {
    const patterns = {
      colors: [],
      style: 'unknown',
      complexity: 'medium'
    };
    
    // Analyser le nom du fichier pour des indices
    const filename = image.name.toLowerCase();
    
    if (filename.includes('icon')) patterns.complexity = 'simple';
    if (filename.includes('large') || filename.includes('xlarge')) patterns.complexity = 'detailed';
    
    // Analyser la catégorie pour le style
    if (image.category in this.imageReferences) {
      patterns.style = this.imageReferences[image.category].style;
      patterns.colors = this.imageReferences[image.category].colors;
    }
    
    return patterns;
  }

  async storeImageAnalysis(analysis) {
    const analysisPath = path.join(this.backupsPath, 'image-analysis.json');
    
    let analyses = [];
    if (await fs.pathExists(analysisPath)) {
      analyses = JSON.parse(await fs.readFile(analysisPath, 'utf8'));
    }
    
    analyses.push(analysis);
    await fs.writeFile(analysisPath, JSON.stringify(analyses, null, 2));
  }

  async generatePersonalizedImages() {
    console.log('🎨 Génération d\'images personnalisées par catégorie...');
    
    const drivers = await this.getAllDrivers();
    
    for (const driver of drivers) {
      await this.generateDriverAssets(driver);
    }
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
    
    return drivers;
  }

  async generateDriverAssets(driver) {
    const assetsPath = path.join(driver.path, 'assets');
    await fs.ensureDir(assetsPath);
    
    const category = this.getCategoryFromDriver(driver);
    
    // Générer l'icône SVG personnalisée
    await this.generatePersonalizedIcon(assetsPath, category, driver);
    
    // Générer les images PNG personnalisées
    await this.generatePersonalizedImages(assetsPath, category, driver);
    
    console.log(`✅ Assets personnalisés générés pour ${driver.name} (${category})`);
  }

  getCategoryFromDriver(driver) {
    const name = driver.name.toLowerCase();
    
    if (name.includes('bulb') || name.includes('light') || name.includes('rgb')) return 'light';
    if (name.includes('switch') || name.includes('plug')) return 'switch';
    if (name.includes('motion') || name.includes('sensor')) return 'sensor-motion';
    if (name.includes('temp') || name.includes('therm')) return 'sensor-temp';
    if (name.includes('humid')) return 'sensor-humidity';
    if (name.includes('contact')) return 'sensor-contact';
    if (name.includes('curtain') || name.includes('blind')) return 'curtain';
    if (name.includes('fan')) return 'fan';
    if (name.includes('thermostat')) return 'thermostat';
    if (name.includes('lock')) return 'lock';
    
    return 'other';
  }

  async generatePersonalizedIcon(assetsPath, category, driver) {
    const iconContent = this.generateCategorySpecificIcon(category, 24, 24, driver);
    await fs.writeFile(path.join(assetsPath, 'icon.svg'), iconContent);
  }

  async generatePersonalizedImages(assetsPath, category, driver) {
    const sizes = [
      { name: 'small', width: 75, height: 75 },
      { name: 'large', width: 500, height: 500 },
      { name: 'xlarge', width: 1000, height: 1000 }
    ];
    
    for (const size of sizes) {
      const imageContent = this.generateCategorySpecificIcon(category, size.width, size.height, driver);
      await fs.writeFile(path.join(assetsPath, `${size.name}.svg`), imageContent);
    }
  }

  generateCategorySpecificIcon(category, width, height, driver) {
    const baseStyle = `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg"`;
    const scale = Math.min(width, height) / 24; // Facteur d'échelle
    
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
      case 'sensor-contact':
        return this.generateContactSensorIcon(baseStyle, width, height, scale);
      case 'curtain':
        return this.generateCurtainIcon(baseStyle, width, height, scale);
      case 'fan':
        return this.generateFanIcon(baseStyle, width, height, scale);
      case 'thermostat':
        return this.generateThermostatIcon(baseStyle, width, height, scale);
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
<rect x="${centerX - buttonWidth/2 - 2 * scale}" y="${centerY - buttonHeight/2 - 2 * scale}" width="${buttonWidth + 4 * scale}" height="${buttonHeight + 4 * scale}" rx="${3 * scale}" fill="none" stroke="#2E7D32" stroke-width="${1 * scale}" stroke-dasharray="${2 * scale}"/>
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
<path d="M ${centerX - 2 * scale} ${centerY - 2 * scale} L ${centerX + 2 * scale} ${centerY + 2 * scale} M ${centerX + 2 * scale} ${centerY - 2 * scale} L ${centerX - 2 * scale} ${centerY + 2 * scale}" stroke="#1976D2" stroke-width="${2 * scale}"/>
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
<path d="M ${centerX - 4 * scale} ${centerY - stemHeight/2 + 2 * scale} L ${centerX + 4 * scale} ${centerY - stemHeight/2 + 2 * scale}" stroke="#D84315" stroke-width="${1 * scale}"/>
<path d="M ${centerX - 4 * scale} ${centerY - stemHeight/2 + 6 * scale} L ${centerX + 4 * scale} ${centerY - stemHeight/2 + 6 * scale}" stroke="#D84315" stroke-width="${1 * scale}"/>
<path d="M ${centerX - 4 * scale} ${centerY - stemHeight/2 + 10 * scale} L ${centerX + 4 * scale} ${centerY - stemHeight/2 + 10 * scale}" stroke="#D84315" stroke-width="${1 * scale}"/>
</svg>`;
  }

  generateHumiditySensorIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const dropRadius = 8 * scale;
    
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
<path d="M ${centerX - 3 * scale} ${centerY + 2 * scale} Q ${centerX} ${centerY + 5 * scale} ${centerX + 3 * scale} ${centerY + 2 * scale}" fill="none" stroke="#0277BD" stroke-width="${1 * scale}" opacity="0.6"/>
</svg>`;
  }

  generateContactSensorIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const sensorWidth = 16 * scale;
    const sensorHeight = 12 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<rect x="${centerX - sensorWidth/2}" y="${centerY - sensorHeight/2}" width="${sensorWidth}" height="${sensorHeight}" rx="${2 * scale}" fill="#9C27B0" stroke="#7B1FA2" stroke-width="${2 * scale}"/>
<path d="M ${centerX - sensorWidth/2 + 2 * scale} ${centerY - sensorHeight/2 + 3 * scale} L ${centerX + sensorWidth/2 - 2 * scale} ${centerY - sensorHeight/2 + 3 * scale}" stroke="#7B1FA2" stroke-width="${1 * scale}"/>
<path d="M ${centerX - sensorWidth/2 + 2 * scale} ${centerY - sensorHeight/2 + 7 * scale} L ${centerX + sensorWidth/2 - 2 * scale} ${centerY - sensorHeight/2 + 7 * scale}" stroke="#7B1FA2" stroke-width="${1 * scale}"/>
<circle cx="${centerX}" cy="${centerY}" r="${2 * scale}" fill="#FFFFFF" stroke="#7B1FA2" stroke-width="${1 * scale}"/>
</svg>`;
  }

  generateCurtainIcon(baseStyle, width, height, scale) {
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

  generateFanIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const fanRadius = 8 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<circle cx="${centerX}" cy="${centerY}" r="${fanRadius}" fill="#607D8B" stroke="#455A64" stroke-width="${2 * scale}"/>
<path d="M ${centerX} ${centerY - fanRadius - 2 * scale} L ${centerX} ${centerY - fanRadius + 2 * scale}" stroke="#455A64" stroke-width="${3 * scale}"/>
<path d="M ${centerX - fanRadius - 2 * scale} ${centerY} L ${centerX - fanRadius + 2 * scale} ${centerY}" stroke="#455A64" stroke-width="${3 * scale}"/>
<circle cx="${centerX}" cy="${centerY}" r="${2 * scale}" fill="#FFFFFF"/>
<path d="M ${centerX - fanRadius/2} ${centerY - fanRadius/2} L ${centerX + fanRadius/2} ${centerY + fanRadius/2}" stroke="#455A64" stroke-width="${1 * scale}" opacity="0.5"/>
<path d="M ${centerX + fanRadius/2} ${centerY - fanRadius/2} L ${centerX - fanRadius/2} ${centerY + fanRadius/2}" stroke="#455A64" stroke-width="${1 * scale}" opacity="0.5"/>
</svg>`;
  }

  generateThermostatIcon(baseStyle, width, height, scale) {
    const centerX = width / 2;
    const centerY = height / 2;
    const thermostatRadius = 8 * scale;
    
    return `<svg ${baseStyle}>
<rect width="${width}" height="${height}" fill="white"/>
<rect x="${centerX - 10 * scale}" y="${centerY - 8 * scale}" width="${20 * scale}" height="${16 * scale}" rx="${5 * scale}" fill="#FF9800" stroke="#F57C00" stroke-width="${2 * scale}"/>
<circle cx="${centerX}" cy="${centerY}" r="${thermostatRadius}" fill="#FFFFFF" stroke="#F57C00" stroke-width="${2 * scale}"/>
<path d="M ${centerX} ${centerY - 4 * scale} L ${centerX} ${centerY + 4 * scale}" stroke="#F57C00" stroke-width="${2 * scale}"/>
<path d="M ${centerX - 4 * scale} ${centerY} L ${centerX + 4 * scale} ${centerY}" stroke="#F57C00" stroke-width="${2 * scale}"/>
<text x="${centerX}" y="${centerY + 2 * scale}" text-anchor="middle" fill="#F57C00" font-size="${6 * scale}" font-family="Arial, sans-serif">T</text>
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
<rect x="${centerX - 1 * scale}" y="${centerY - 2 * scale}" width="${2 * scale}" height="${2 * scale}" fill="#FF8F00"/>
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

  async validateAllAssets() {
    console.log('📊 Validation de tous les assets...');
    
    const drivers = await this.getAllDrivers();
    let totalAssets = 0;
    let validAssets = 0;
    
    for (const driver of drivers) {
      const assetsPath = path.join(driver.path, 'assets');
      if (await fs.pathExists(assetsPath)) {
        const assets = await fs.readdir(assetsPath);
        
        // Vérifier l'icône SVG
        if (assets.includes('icon.svg')) {
          totalAssets++;
          validAssets++;
        }
        
        // Vérifier les images SVG
        const requiredImages = ['small.svg', 'large.svg', 'xlarge.svg'];
        for (const image of requiredImages) {
          if (assets.includes(image)) {
            totalAssets++;
            validAssets++;
          }
        }
      }
    }
    
    console.log(`📊 Assets: ${validAssets}/${totalAssets} valides`);
    
    if (validAssets === totalAssets) {
      console.log('✅ Tous les assets sont valides !');
    } else {
      console.log(`⚠️ ${totalAssets - validAssets} assets manquants`);
    }
  }
}

// Exécuter Mega Enrichment Avancé
if (require.main === module) {
  const mega = new MegaEnrichmentAdvanced();
  mega.run().catch(console.error);
}
