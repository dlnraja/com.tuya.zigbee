#!/usr/bin/env node
'use strict';

/**
 * ANALYSE HIÉRARCHIE DES IMAGES
 * 
 * Comprend comment Homey résout les images:
 * 1. assets/ (racine) vs drivers/*/assets/
 * 2. Impact de .homeycompose et .homeybuild
 * 3. Détection des conflits et overrides
 * 4. Recommandations de correction
 */

const fs = require('fs').promises;
const path = require('path');

class ImageHierarchyAnalyzer {
  
  constructor() {
    this.projectRoot = path.join(__dirname, '..', '..');
    this.results = {
      rootAssets: {},
      driverAssets: {},
      conflicts: [],
      recommendations: [],
      homeycompose: {},
      homeybuild: {}
    };
  }

  async analyze() {
    console.log('\n🔍 ANALYSE HIÉRARCHIE DES IMAGES - DÉBUT\n');
    
    await this.analyzeRootAssets();
    await this.analyzeDriverAssets();
    await this.analyzeHomeyCompose();
    await this.analyzeHomeyBuild();
    await this.detectConflicts();
    await this.generateRecommendations();
    
    return this.results;
  }

  /**
   * Analyse assets/ à la racine
   */
  async analyzeRootAssets() {
    console.log('📁 Analyse assets/ racine...');
    const assetsPath = path.join(this.projectRoot, 'assets');
    
    try {
      const items = await fs.readdir(assetsPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(assetsPath, item.name);
        
        if (item.isFile() && /\.(png|svg)$/i.test(item.name)) {
          const stats = await fs.stat(itemPath);
          this.results.rootAssets[item.name] = {
            path: itemPath,
            size: stats.size,
            type: path.extname(item.name)
          };
        } else if (item.isDirectory() && item.name === 'images') {
          // Sous-dossier images/
          const subItems = await fs.readdir(itemPath);
          for (const subItem of subItems) {
            if (/\.(png|svg)$/i.test(subItem)) {
              const subPath = path.join(itemPath, subItem);
              const stats = await fs.stat(subPath);
              this.results.rootAssets[`images/${subItem}`] = {
                path: subPath,
                size: stats.size,
                type: path.extname(subItem)
              };
            }
          }
        }
      }
      
      console.log(`   ✅ Trouvé ${Object.keys(this.results.rootAssets).length} images racine`);
    } catch (err) {
      console.log('   ⚠️  Pas de dossier assets/ racine');
    }
  }

  /**
   * Analyse drivers/*/assets/
   */
  async analyzeDriverAssets() {
    console.log('\n📁 Analyse drivers/*/assets/...');
    const driversPath = path.join(this.projectRoot, 'drivers');
    
    try {
      const drivers = await fs.readdir(driversPath);
      
      for (const driverName of drivers) {
        const driverAssetsPath = path.join(driversPath, driverName, 'assets');
        
        try {
          const items = await fs.readdir(driverAssetsPath);
          const assets = {};
          
          for (const item of items) {
            if (/\.(png|svg)$/i.test(item)) {
              const itemPath = path.join(driverAssetsPath, item);
              const stats = await fs.stat(itemPath);
              
              // Vérifier les dimensions pour PNG
              let dimensions = null;
              if (path.extname(item) === '.png') {
                dimensions = await this.getPngDimensions(itemPath);
              }
              
              assets[item] = {
                path: itemPath,
                size: stats.size,
                type: path.extname(item),
                dimensions
              };
            }
          }
          
          if (Object.keys(assets).length > 0) {
            this.results.driverAssets[driverName] = assets;
          }
        } catch (err) {
          // Pas d'assets pour ce driver
        }
      }
      
      console.log(`   ✅ Analysé ${Object.keys(this.results.driverAssets).length} drivers avec assets`);
    } catch (err) {
      console.log('   ❌ Erreur analyse drivers:', err.message);
    }
  }

  /**
   * Lit les dimensions d'un PNG
   */
  async getPngDimensions(filePath) {
    try {
      const buffer = await fs.readFile(filePath);
      
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      if (buffer[0] !== 0x89 || buffer[1] !== 0x50) {
        return null;
      }
      
      // IHDR chunk starts at byte 16
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      
      return { width, height };
    } catch (err) {
      return null;
    }
  }

  /**
   * Analyse .homeycompose/app.json
   */
  async analyzeHomeyCompose() {
    console.log('\n📁 Analyse .homeycompose/...');
    const composePath = path.join(this.projectRoot, '.homeycompose', 'app.json');
    
    try {
      const data = await fs.readFile(composePath, 'utf8');
      const appJson = JSON.parse(data);
      
      // Images de l'app
      if (appJson.images) {
        this.results.homeycompose.appImages = appJson.images;
      }
      
      // Images des drivers
      if (appJson.drivers) {
        this.results.homeycompose.drivers = {};
        appJson.drivers.forEach(driver => {
          if (driver.images) {
            this.results.homeycompose.drivers[driver.id] = driver.images;
          }
        });
      }
      
      console.log('   ✅ .homeycompose/app.json analysé');
    } catch (err) {
      console.log('   ⚠️  Pas de .homeycompose/app.json');
    }
  }

  /**
   * Analyse .homeybuild/
   */
  async analyzeHomeyBuild() {
    console.log('\n📁 Analyse .homeybuild/...');
    const buildPath = path.join(this.projectRoot, '.homeybuild');
    
    try {
      await fs.access(buildPath);
      
      // Lister les fichiers
      const files = await this.walkDirectory(buildPath);
      const imageFiles = files.filter(f => /\.(png|svg)$/i.test(f));
      
      this.results.homeybuild.exists = true;
      this.results.homeybuild.imageCount = imageFiles.length;
      this.results.homeybuild.images = imageFiles.map(f => 
        path.relative(buildPath, f)
      );
      
      console.log(`   ✅ .homeybuild existe avec ${imageFiles.length} images`);
    } catch (err) {
      this.results.homeybuild.exists = false;
      console.log('   ✅ .homeybuild n\'existe pas (bien)');
    }
  }

  /**
   * Parcourt récursivement un dossier
   */
  async walkDirectory(dir) {
    const files = [];
    const items = await fs.readdir(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        files.push(...await this.walkDirectory(fullPath));
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Détecte les conflits
   */
  async detectConflicts() {
    console.log('\n🔍 Détection des conflits...\n');
    
    // Conflit 1: Images racine vs driver
    for (const driverName in this.results.driverAssets) {
      const driverImages = this.results.driverAssets[driverName];
      
      for (const imageName in driverImages) {
        // Vérifier si une image racine pourrait override
        if (this.results.rootAssets[imageName] || 
            this.results.rootAssets[`images/${imageName}`]) {
          
          this.results.conflicts.push({
            type: 'root_override_driver',
            severity: 'high',
            driver: driverName,
            image: imageName,
            description: `Image racine "${imageName}" peut override l'image du driver`
          });
        }
      }
      
      // Conflit 2: Dimensions incorrectes
      if (driverImages['small.png']) {
        const dims = driverImages['small.png'].dimensions;
        if (dims && (dims.width !== 75 || dims.height !== 75)) {
          this.results.conflicts.push({
            type: 'wrong_dimensions',
            severity: 'critical',
            driver: driverName,
            image: 'small.png',
            expected: '75x75',
            actual: `${dims.width}x${dims.height}`,
            description: `Driver ${driverName}: small.png doit être 75x75 (actuellement ${dims.width}x${dims.height})`
          });
        }
      }
      
      if (driverImages['large.png']) {
        const dims = driverImages['large.png'].dimensions;
        if (dims && (dims.width !== 500 || dims.height !== 500)) {
          this.results.conflicts.push({
            type: 'wrong_dimensions',
            severity: 'high',
            driver: driverName,
            image: 'large.png',
            expected: '500x500',
            actual: `${dims.width}x${dims.height}`,
            description: `Driver ${driverName}: large.png doit être 500x500 (actuellement ${dims.width}x${dims.height})`
          });
        }
      }
    }
    
    // Conflit 3: .homeybuild cache
    if (this.results.homeybuild.exists) {
      this.results.conflicts.push({
        type: 'cache_exists',
        severity: 'medium',
        description: '.homeybuild existe et peut causer des problèmes de cache',
        recommendation: 'Supprimer .homeybuild avant validation'
      });
    }
    
    console.log(`   🔴 Trouvé ${this.results.conflicts.length} conflits`);
    this.results.conflicts.forEach(c => {
      console.log(`      [${c.severity.toUpperCase()}] ${c.description}`);
    });
  }

  /**
   * Génère les recommandations
   */
  async generateRecommendations() {
    console.log('\n💡 Génération des recommandations...\n');
    
    // Recommandation 1: Nettoyer le cache
    if (this.results.homeybuild.exists) {
      this.results.recommendations.push({
        priority: 'high',
        action: 'Supprimer .homeybuild',
        command: 'Remove-Item -Recurse -Force .homeybuild',
        reason: 'Le cache peut contenir des images obsolètes'
      });
    }
    
    // Recommandation 2: Supprimer images racine conflictuelles
    const rootConflicts = this.results.conflicts.filter(c => 
      c.type === 'root_override_driver'
    );
    if (rootConflicts.length > 0) {
      this.results.recommendations.push({
        priority: 'high',
        action: 'Nettoyer assets/ racine',
        reason: 'Images racine peuvent override celles des drivers',
        details: 'Garder uniquement small.png (250x175), large.png (500x350) pour l\'app'
      });
    }
    
    // Recommandation 3: Corriger dimensions
    const dimensionConflicts = this.results.conflicts.filter(c => 
      c.type === 'wrong_dimensions'
    );
    if (dimensionConflicts.length > 0) {
      this.results.recommendations.push({
        priority: 'critical',
        action: 'Corriger dimensions des images',
        drivers: [...new Set(dimensionConflicts.map(c => c.driver))],
        reason: 'Homey requiert des dimensions spécifiques',
        specs: {
          driver_small: '75x75',
          driver_large: '500x500',
          app_small: '250x175',
          app_large: '500x350'
        }
      });
    }
    
    // Recommandation 4: Structure recommandée
    this.results.recommendations.push({
      priority: 'info',
      action: 'Structure recommandée',
      structure: {
        'assets/': {
          'small.png': '250x175 (app)',
          'large.png': '500x350 (app)',
          'xlarge.png': '1000x700 (app)'
        },
        'drivers/*/assets/': {
          'small.png': '75x75 (driver)',
          'large.png': '500x500 (driver)',
          'xlarge.png': '1000x1000 (driver)'
        }
      }
    });
    
    this.results.recommendations.forEach(r => {
      console.log(`   [${r.priority.toUpperCase()}] ${r.action}`);
      if (r.reason) console.log(`      Raison: ${r.reason}`);
    });
  }

  /**
   * Sauvegarde le rapport
   */
  async saveReport() {
    const reportPath = path.join(this.projectRoot, 'reports', 'IMAGE_HIERARCHY_ANALYSIS.json');
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n✅ Rapport sauvegardé: ${reportPath}`);
  }
}

// Exécution
if (require.main === module) {
  (async () => {
    try {
      const analyzer = new ImageHierarchyAnalyzer();
      await analyzer.analyze();
      await analyzer.saveReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 RÉSUMÉ');
      console.log('='.repeat(60));
      console.log(`Images racine: ${Object.keys(analyzer.results.rootAssets).length}`);
      console.log(`Drivers avec assets: ${Object.keys(analyzer.results.driverAssets).length}`);
      console.log(`Conflits: ${analyzer.results.conflicts.length}`);
      console.log(`Recommandations: ${analyzer.results.recommendations.length}`);
      console.log('='.repeat(60) + '\n');
      
      process.exit(analyzer.results.conflicts.filter(c => 
        c.severity === 'critical'
      ).length > 0 ? 1 : 0);
      
    } catch (err) {
      console.error('❌ ERREUR:', err);
      process.exit(1);
    }
  })();
}

module.exports = ImageHierarchyAnalyzer;
