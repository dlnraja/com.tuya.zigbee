#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🔧 CORRECTION COMPLÈTE DE LA STRUCTURE HOMEY...');

const fs = require('fs-extra');
const path = require('path');

class HomeyStructureFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.tuyaZigbeePath = path.join(this.driversPath, 'tuya_zigbee');
    this.zigbeePath = path.join(this.driversPath, 'zigbee');
    this.tuyaPath = path.join(this.driversPath, 'tuya');
    
    // Structure correcte des catégories
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
        patterns: ['lock', 'deadbolt', 'padbolt', 'door'],
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
      
      // 1. Nettoyer les fichiers mal placés
      await this.cleanupMisplacedFiles();
      
      // 2. Réorganiser la structure des drivers
      await this.reorganizeDriverStructure();
      
      // 3. Créer la structure Homey correcte
      await this.createHomeyStructure();
      
      // 4. Valider la structure finale
      await this.validateFinalStructure();
      
      console.log('✅ STRUCTURE HOMEY CORRIGÉE ET RÉORGANISÉE !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  }

  async cleanupMisplacedFiles() {
    console.log('🧹 Nettoyage des fichiers mal placés...');
    
    // Supprimer les fichiers à la racine de tuya_zigbee
    const rootFiles = ['driver.js', 'device.js', 'driver.compose.json'];
    
    for (const file of rootFiles) {
      const filePath = path.join(this.tuyaZigbeePath, file);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        console.log(`🗑️ Supprimé: ${file} de la racine tuya_zigbee`);
      }
    }
    
    // Supprimer les dossiers inutiles
    const invalidDirs = ['__templates__', '__generic__'];
    
    for (const dir of invalidDirs) {
      const dirPath = path.join(this.tuyaZigbeePath, dir);
      if (await fs.pathExists(dirPath)) {
        await fs.remove(dirPath);
        console.log(`🗑️ Supprimé: ${dir}/ de tuya_zigbee`);
      }
    }
  }

  async reorganizeDriverStructure() {
    console.log('📁 Réorganisation de la structure des drivers...');
    
    // Créer la structure correcte
    await this.createCorrectStructure();
    
    // Déplacer les drivers vers leurs bonnes catégories
    await this.moveDriversToCorrectCategories();
    
    // Nettoyer les dossiers vides
    await this.cleanupEmptyDirectories();
  }

  async createCorrectStructure() {
    // Créer la structure pour tuya_zigbee
    for (const category of Object.keys(this.categories)) {
      const categoryPath = path.join(this.tuyaZigbeePath, category);
      await fs.ensureDir(categoryPath);
      console.log(`✅ Créé: tuya_zigbee/${category}/`);
    }
    
    // Créer la structure pour zigbee
    for (const category of Object.keys(this.categories)) {
      const categoryPath = path.join(this.zigbeePath, category);
      await fs.ensureDir(categoryPath);
      console.log(`✅ Créé: zigbee/${category}/`);
    }
    
    // Créer la structure pour tuya
    const tuyaCategories = ['plug', 'sensor-contact', 'sensor-motion', 'switch', 'siren'];
    for (const category of tuyaCategories) {
      const categoryPath = path.join(this.tuyaPath, category);
      await fs.ensureDir(categoryPath);
      console.log(`✅ Créé: tuya/${category}/`);
    }
  }

  async moveDriversToCorrectCategories() {
    console.log('🔄 Déplacement des drivers vers leurs catégories...');
    
    // Traiter chaque catégorie
    for (const [category, config] of Object.entries(this.categories)) {
      const categoryPath = path.join(this.tuyaZigbeePath, category);
      
      if (await fs.pathExists(categoryPath)) {
        const items = await fs.readdir(categoryPath);
        
        for (const item of items) {
          const itemPath = path.join(categoryPath, item);
          const stats = await fs.stat(itemPath);
          
          if (stats.isDirectory()) {
            // Vérifier si c'est un driver valide
            if (await this.isValidDriver(itemPath)) {
              console.log(`✅ Driver valide: ${category}/${item}`);
            } else {
              // Déplacer vers la bonne catégorie ou supprimer
              await this.handleInvalidDriver(itemPath, item, category);
            }
          }
        }
      }
    }
  }

  async isValidDriver(driverPath) {
    const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
    
    for (const file of requiredFiles) {
      const filePath = path.join(driverPath, file);
      if (!await fs.pathExists(filePath)) {
        return false;
      }
    }
    
    return true;
  }

  async handleInvalidDriver(driverPath, driverName, currentCategory) {
    const correctCategory = this.determineCorrectCategory(driverName);
    
    if (correctCategory && correctCategory !== currentCategory) {
      const targetPath = path.join(this.tuyaZigbeePath, correctCategory, driverName);
      
      if (!await fs.pathExists(targetPath)) {
        await fs.move(driverPath, targetPath);
        console.log(`✅ Déplacé: ${driverName} -> ${correctCategory}/`);
      } else {
        // Fusionner si la destination existe
        await this.mergeDrivers(driverPath, targetPath);
        await fs.remove(driverPath);
        console.log(`✅ Fusionné et supprimé: ${driverName}`);
      }
    } else if (correctCategory === 'other') {
      // Déplacer vers 'other' si pas de catégorie spécifique
      const otherPath = path.join(this.tuyaZigbeePath, 'other', driverName);
      if (!await fs.pathExists(otherPath)) {
        await fs.move(driverPath, otherPath);
        console.log(`✅ Déplacé vers other: ${driverName}`);
      }
    }
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

  async mergeDrivers(sourcePath, targetPath) {
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
        }
      }
      
    } catch (error) {
      console.log(`⚠️ Erreur lors de la fusion: ${error.message}`);
    }
  }

  async cleanupEmptyDirectories() {
    console.log('🧹 Nettoyage des dossiers vides...');
    
    const dirs = [this.tuyaZigbeePath, this.zigbeePath, this.tuyaPath];
    
    for (const dir of dirs) {
      await this.removeEmptyRecursive(dir);
    }
  }

  async removeEmptyRecursive(dirPath) {
    if (!await fs.pathExists(dirPath)) return;
    
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await this.removeEmptyRecursive(fullPath);
        
        // Vérifier si le dossier est vide après récursion
        const remainingItems = await fs.readdir(fullPath);
        if (remainingItems.length === 0) {
          await fs.remove(fullPath);
          console.log(`🗑️ Supprimé dossier vide: ${fullPath}`);
        }
      }
    }
  }

  async createHomeyStructure() {
    console.log('🏠 Création de la structure Homey correcte...');
    
    // Vérifier que les fichiers essentiels sont présents
    const essentialFiles = [
      'app.json',
      'package.json',
      'app.js',
      'README.md',
      'CHANGELOG.md'
    ];
    
    for (const file of essentialFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (await fs.pathExists(filePath)) {
        console.log(`✅ Fichier essentiel présent: ${file}`);
      } else {
        console.log(`⚠️ Fichier essentiel manquant: ${file}`);
      }
    }
    
    // Vérifier la structure des drivers
    await this.validateDriverStructure();
  }

  async validateDriverStructure() {
    console.log('🔍 Validation de la structure des drivers...');
    
    const driverTypes = ['tuya_zigbee', 'zigbee', 'tuya'];
    
    for (const type of driverTypes) {
      const typePath = path.join(this.driversPath, type);
      
      if (await fs.pathExists(typePath)) {
        const categories = await fs.readdir(typePath);
        console.log(`📁 ${type}: ${categories.length} catégories`);
        
        for (const category of categories) {
          const categoryPath = path.join(typePath, category);
          const stats = await fs.stat(categoryPath);
          
          if (stats.isDirectory()) {
            const drivers = await fs.readdir(categoryPath);
            const validDrivers = drivers.filter(async (driver) => {
              const driverPath = path.join(categoryPath, driver);
              const stats = await fs.stat(driverPath);
              return stats.isDirectory() && await this.isValidDriver(driverPath);
            });
            
            console.log(`  - ${category}: ${validDrivers.length} drivers valides`);
          }
        }
      }
    }
  }

  async validateFinalStructure() {
    console.log('✅ Validation de la structure finale...');
    
    // Créer un rapport de validation
    const validationReport = {
      timestamp: new Date().toISOString(),
      structure: {},
      summary: {
        totalDrivers: 0,
        validDrivers: 0,
        invalidDrivers: 0,
        categories: 0
      }
    };
    
    // Analyser la structure finale
    await this.analyzeFinalStructure(validationReport);
    
    // Sauvegarder le rapport
    const reportPath = path.join(this.projectRoot, 'HOMEY_STRUCTURE_VALIDATION_v3.4.1.json');
    await fs.writeFile(reportPath, JSON.stringify(validationReport, null, 2));
    console.log(`📊 Rapport de validation créé: ${reportPath}`);
    
    console.log(`\n📈 RÉSUMÉ FINAL:`);
    console.log(`   - Total drivers: ${validationReport.summary.totalDrivers}`);
    console.log(`   - Drivers valides: ${validationReport.summary.validDrivers}`);
    console.log(`   - Drivers invalides: ${validationReport.summary.invalidDrivers}`);
    console.log(`   - Catégories: ${validationReport.summary.categories}`);
  }

  async analyzeFinalStructure(report) {
    const driverTypes = ['tuya_zigbee', 'zigbee', 'tuya'];
    
    for (const type of driverTypes) {
      const typePath = path.join(this.driversPath, type);
      
      if (await fs.pathExists(typePath)) {
        report.structure[type] = {};
        const categories = await fs.readdir(typePath);
        report.summary.categories += categories.length;
        
        for (const category of categories) {
          const categoryPath = path.join(typePath, category);
          const stats = await fs.stat(categoryPath);
          
          if (stats.isDirectory()) {
            const drivers = await fs.readdir(categoryPath);
            const validDrivers = [];
            const invalidDrivers = [];
            
            for (const driver of drivers) {
              const driverPath = path.join(categoryPath, driver);
              const stats = await fs.stat(driverPath);
              
              if (stats.isDirectory()) {
                report.summary.totalDrivers++;
                
                if (await this.isValidDriver(driverPath)) {
                  validDrivers.push(driver);
                  report.summary.validDrivers++;
                } else {
                  invalidDrivers.push(driver);
                  report.summary.invalidDrivers++;
                }
              }
            }
            
            report.structure[type][category] = {
              valid: validDrivers,
              invalid: invalidDrivers,
              total: drivers.length
            };
          }
        }
      }
    }
  }
}

// Exécuter la correction
if (require.main === module) {
  const fixer = new HomeyStructureFixer();
  fixer.run().catch(console.error);
}
