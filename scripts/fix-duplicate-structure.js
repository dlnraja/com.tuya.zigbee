#!/usr/bin/env node

console.log('🔧 CORRECTION INTELLIGENTE DE LA STRUCTURE ET ÉLIMINATION DES DOUBLONS...');

const fs = require('fs-extra');
const path = require('path');

class StructureFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.tuyaPath = path.join(this.driversPath, 'tuya_zigbee');
    this.zigbeePath = path.join(this.driversPath, 'zigbee');
    
    // Structure des catégories avec patterns de détection
    this.categories = {
      'light': {
        patterns: ['bulb', 'light', 'strip', 'panel', 'ceiling', 'table', 'garden', 'floor', 'ts0505', 'ts110f', 'ts130f'],
        exclude: ['device', 'plug']
      },
      'switch': {
        patterns: ['switch', 'plug', 'outlet', 'power', 'ts0001', 'ts0002', 'ts0003', 'ts011f'],
        exclude: ['device', 'light']
      },
      'sensor-motion': {
        patterns: ['motion', 'presence', 'radar', 'ts0601_presence'],
        exclude: []
      },
      'sensor-temp': {
        patterns: ['temp', 'therm', 'climate', 'ts0201', 'ts0202', 'ts0203', 'ts0205'],
        exclude: ['device', 'plug']
      },
      'sensor-humidity': {
        patterns: ['humid', 'ts0201'],
        exclude: ['device', 'plug']
      },
      'sensor-contact': {
        patterns: ['contact'],
        exclude: []
      },
      'sensor-water': {
        patterns: ['water', 'ts0601_water'],
        exclude: []
      },
      'sensor-smoke': {
        patterns: ['smoke', 'ts0601_smoke'],
        exclude: []
      },
      'sensor-gas': {
        patterns: ['gas', 'ts0601_gas'],
        exclude: []
      },
      'sensor-vibration': {
        patterns: ['vibration', 'ts0601_vibration'],
        exclude: []
      },
      'cover': {
        patterns: ['curtain', 'cover', 'blind', 'shade', 'garage', 'ts0601_curtain', 'ts130f'],
        exclude: ['device', 'plug']
      },
      'lock': {
        patterns: ['lock', 'deadbolt', 'padlock', 'door'],
        exclude: []
      },
      'fan': {
        patterns: ['fan'],
        exclude: ['device', 'plug']
      },
      'heater': {
        patterns: ['heater'],
        exclude: ['device', 'plug']
      },
      'ac': {
        patterns: ['ac', 'aircon', 'air_conditioning'],
        exclude: ['device', 'plug']
      },
      'thermostat': {
        patterns: ['thermostat', 'ts0601_climate'],
        exclude: ['device', 'plug']
      },
      'other': {
        patterns: ['generic', 'template', 'ts0601', 'device'],
        exclude: []
      }
    };
  }

  async run() {
    try {
      console.log('🔍 ANALYSE DE LA STRUCTURE ACTUELLE...');
      
      // 1. Analyser et identifier les problèmes
      const issues = await this.analyzeStructure();
      
      // 2. Corriger la structure
      await this.fixStructure(issues);
      
      // 3. Nettoyer les dossiers vides et doublons
      await this.cleanupDuplicates();
      
      // 4. Optimiser la structure finale
      await this.optimizeFinalStructure();
      
      console.log('✅ CORRECTION DE LA STRUCTURE TERMINÉE !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  }

  async analyzeStructure() {
    const issues = {
      misplacedDrivers: [],
      duplicateCategories: [],
      emptyDirectories: [],
      inconsistentNaming: []
    };

    console.log('📊 Analyse des dossiers mal placés...');
    
    // Vérifier les dossiers à la racine de tuya_zigbee
    const rootItems = await fs.readdir(this.tuyaPath);
    
    for (const item of rootItems) {
      const itemPath = path.join(this.tuyaPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        // Vérifier si c'est un driver mal placé
        if (this.isDriverDirectory(itemPath) && !this.categories[item]) {
          const correctCategory = this.determineCorrectCategory(item);
          if (correctCategory && correctCategory !== 'other') {
            issues.misplacedDrivers.push({
              name: item,
              currentPath: itemPath,
              correctCategory: correctCategory,
              targetPath: path.join(this.tuyaPath, correctCategory, item)
            });
            console.log(`⚠️ Driver mal placé: ${item} -> devrait être dans ${correctCategory}/`);
          }
        }
      }
    }

    // Vérifier les doublons dans les catégories
    for (const [category, config] of Object.entries(this.categories)) {
      const categoryPath = path.join(this.tuyaPath, category);
      if (await fs.pathExists(categoryPath)) {
        const drivers = await fs.readdir(categoryPath);
        const duplicates = this.findDuplicates(drivers);
        
        if (duplicates.length > 0) {
          issues.duplicateCategories.push({
            category: category,
            duplicates: duplicates
          });
          console.log(`⚠️ Doublons dans ${category}: ${duplicates.join(', ')}`);
        }
      }
    }

    return issues;
  }

  isDriverDirectory(dirPath) {
    // Vérifier si le dossier contient les fichiers d'un driver
    const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
    return requiredFiles.some(file => fs.pathExistsSync(path.join(dirPath, file)));
  }

  determineCorrectCategory(driverName) {
    const lowerName = driverName.toLowerCase();
    
    for (const [category, config] of Object.entries(this.categories)) {
      // Vérifier les patterns d'inclusion
      const matchesPattern = config.patterns.some(pattern => 
        lowerName.includes(pattern)
      );
      
      // Vérifier les exclusions
      const matchesExclusion = config.exclude.some(exclusion => 
        lowerName.includes(exclusion)
      );
      
      if (matchesPattern && !matchesExclusion) {
        return category;
      }
    }
    
    return 'other';
  }

  findDuplicates(drivers) {
    const groups = {};
    
    for (const driver of drivers) {
      const baseName = this.extractBaseName(driver);
      if (!groups[baseName]) {
        groups[baseName] = [];
      }
      groups[baseName].push(driver);
    }
    
    return Object.entries(groups)
      .filter(([base, items]) => items.length > 1)
      .map(([base, items]) => ({ base, items }));
  }

  extractBaseName(driverName) {
    // Extraire le nom de base en supprimant les suffixes
    return driverName
      .replace(/[-_]\d+$/, '')
      .replace(/[-_]standard[-_]\d+$/, '')
      .replace(/[-_]default[-_]\d+$/, '')
      .replace(/[-_]device[-_]\w+$/, '')
      .replace(/[-_]plug[-_]\w+$/, '')
      .replace(/[-_]light[-_]\w+$/, '')
      .replace(/[-_]ac[-_]\w+$/, '');
  }

  async fixStructure(issues) {
    console.log('🔧 Correction de la structure...');
    
    // 1. Déplacer les drivers mal placés
    for (const issue of issues.misplacedDrivers) {
      await this.moveDriver(issue.currentPath, issue.targetPath);
    }
    
    // 2. Fusionner les doublons
    for (const duplicate of issues.duplicateCategories) {
      await this.mergeDuplicates(duplicate);
    }
  }

  async moveDriver(sourcePath, targetPath) {
    try {
      if (!await fs.pathExists(targetPath)) {
        await fs.move(sourcePath, targetPath);
        console.log(`✅ Déplacé: ${path.basename(sourcePath)} -> ${path.dirname(targetPath)}/`);
      } else {
        // Si la destination existe, fusionner
        await this.mergeDriverDirectories(sourcePath, targetPath);
        await fs.remove(sourcePath);
        console.log(`✅ Fusionné et supprimé: ${path.basename(sourcePath)}`);
      }
    } catch (error) {
      console.log(`⚠️ Erreur lors du déplacement de ${path.basename(sourcePath)}: ${error.message}`);
    }
  }

  async mergeDriverDirectories(sourcePath, targetPath) {
    try {
      // Fusionner les fichiers de configuration
      const sourceCompose = path.join(sourcePath, 'driver.compose.json');
      const targetCompose = path.join(targetPath, 'driver.compose.json');
      
      if (await fs.pathExists(sourceCompose) && await fs.pathExists(targetCompose)) {
        const source = JSON.parse(await fs.readFile(sourceCompose, 'utf8'));
        const target = JSON.parse(await fs.readFile(targetCompose, 'utf8'));
        
        // Fusionner les capacités
        if (source.capabilities) {
          if (!target.capabilities) target.capabilities = [];
          target.capabilities = [...new Set([...target.capabilities, ...source.capabilities])];
        }
        
        // Fusionner les clusters
        if (source.clusters) {
          if (!target.clusters) target.clusters = [];
          target.clusters = [...new Set([...target.clusters, ...source.clusters])];
        }
        
        await fs.writeFile(targetCompose, JSON.stringify(target, null, 2));
      }
      
      // Copier les assets manquants
      const sourceAssets = path.join(sourcePath, 'assets');
      const targetAssets = path.join(targetPath, 'assets');
      
      if (await fs.pathExists(sourceAssets)) {
        if (!await fs.pathExists(targetAssets)) {
          await fs.copy(sourceAssets, targetAssets);
        } else {
          // Fusionner les assets
          const sourceFiles = await fs.readdir(sourceAssets);
          for (const file of sourceFiles) {
            const sourceFile = path.join(sourceAssets, file);
            const targetFile = path.join(targetAssets, file);
            
            if (!await fs.pathExists(targetFile)) {
              await fs.copy(sourceFile, targetFile);
            }
          }
        }
      }
      
    } catch (error) {
      console.log(`⚠️ Erreur lors de la fusion: ${error.message}`);
    }
  }

  async mergeDuplicates(duplicate) {
    const categoryPath = path.join(this.tuyaPath, duplicate.category);
    
    for (const { base, items } of duplicate.duplicates) {
      if (items.length > 1) {
        console.log(`🔄 Fusion de ${items.length} doublons: ${base}`);
        
        // Garder le premier et fusionner les autres
        const primaryDriver = items[0];
        const primaryPath = path.join(categoryPath, primaryDriver);
        
        for (let i = 1; i < items.length; i++) {
          const secondaryDriver = items[i];
          const secondaryPath = path.join(categoryPath, secondaryDriver);
          
          await this.mergeDriverDirectories(secondaryPath, primaryPath);
          await fs.remove(secondaryPath);
          console.log(`✅ Fusionné et supprimé: ${secondaryDriver}`);
        }
      }
    }
  }

  async cleanupDuplicates() {
    console.log('🧹 Nettoyage des doublons et dossiers vides...');
    
    // Supprimer les dossiers vides
    await this.removeEmptyDirectories(this.tuyaPath);
    await this.removeEmptyDirectories(this.zigbeePath);
    
    // Nettoyer les dossiers racine inutiles
    await this.cleanupRootDirectories();
  }

  async removeEmptyDirectories(dirPath) {
    if (!await fs.pathExists(dirPath)) return;
    
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await this.removeEmptyDirectories(fullPath);
        
        // Vérifier si le dossier est vide après récursion
        const remainingItems = await fs.readdir(fullPath);
        if (remainingItems.length === 0) {
          await fs.remove(fullPath);
          console.log(`🗑️ Supprimé dossier vide: ${fullPath}`);
        }
      }
    }
  }

  async cleanupRootDirectories() {
    // Supprimer les dossiers racine qui ne sont plus nécessaires
    const rootItems = await fs.readdir(this.tuyaPath);
    
    for (const item of rootItems) {
      const itemPath = path.join(this.tuyaPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        // Vérifier si c'est un dossier racine qui devrait être supprimé
        if (this.shouldRemoveRootDirectory(item)) {
          await fs.remove(itemPath);
          console.log(`🗑️ Supprimé dossier racine inutile: ${item}`);
        }
      }
    }
  }

  shouldRemoveRootDirectory(dirName) {
    // Dossiers qui ne devraient pas être à la racine
    const invalidRootDirs = [
      'models', // Vide maintenant
      'categories', // Déplacé vers la structure appropriée
      'brands' // Déplacé vers la structure appropriée
    ];
    
    return invalidRootDirs.includes(dirName);
  }

  async optimizeFinalStructure() {
    console.log('⚡ Optimisation de la structure finale...');
    
    // Vérifier que chaque catégorie a une structure cohérente
    for (const category of Object.keys(this.categories)) {
      const categoryPath = path.join(this.tuyaPath, category);
      
      if (await fs.pathExists(categoryPath)) {
        const drivers = await fs.readdir(categoryPath);
        
        if (drivers.length > 0) {
          console.log(`✅ ${category}: ${drivers.length} drivers organisés`);
        } else {
          console.log(`📁 ${category}: vide (prêt pour nouveaux drivers)`);
        }
      }
    }
    
    // Créer un fichier de rapport de la structure
    await this.createStructureReport();
  }

  async createStructureReport() {
    const report = {
      timestamp: new Date().toISOString(),
      structure: {},
      summary: {
        totalDrivers: 0,
        categories: Object.keys(this.categories).length,
        issues: []
      }
    };
    
    for (const category of Object.keys(this.categories)) {
      const categoryPath = path.join(this.tuyaPath, category);
      
      if (await fs.pathExists(categoryPath)) {
        const drivers = await fs.readdir(categoryPath);
        const validDrivers = [];
        
        for (const driver of drivers) {
          const driverPath = path.join(categoryPath, driver);
          const stats = await fs.stat(driverPath);
          
          if (stats.isDirectory()) {
            const hasRequiredFiles = await this.hasRequiredDriverFiles(driverPath);
            if (hasRequiredFiles) {
              validDrivers.push(driver);
              report.summary.totalDrivers++;
            }
          }
        }
        
        report.structure[category] = {
          count: validDrivers.length,
          drivers: validDrivers
        };
      }
    }
    
    const reportPath = path.join(this.projectRoot, 'STRUCTURE_REPORT_v3.4.1.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Rapport de structure créé: ${reportPath}`);
  }

  async hasRequiredDriverFiles(driverPath) {
    const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
    
    for (const file of requiredFiles) {
      if (!await fs.pathExists(path.join(driverPath, file))) {
        return false;
      }
    }
    
    return true;
  }
}

// Exécuter la correction
if (require.main === module) {
  const fixer = new StructureFixer();
  fixer.run().catch(console.error);
}
