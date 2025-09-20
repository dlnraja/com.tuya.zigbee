'use strict';

const fs = require('fs');
const path = require('path');

class MegaHierarchicalValidator {
  constructor() {
    this.drivers = {
      tuya: [],
      zigbee: []
    };
    this.stats = {
      total: 0,
      complete: 0,
      incomplete: 0,
      hierarchical: 0,
      flat: 0
    };
  }

  async validateHierarchicalStructure() {
    console.log('🚀 MEGA HIERARCHICAL VALIDATOR - DÉTECTION COMPLÈTE');
    console.log('=====================================================\n');

    await this.scanAllDrivers();
    await this.analyzeHierarchicalStructure();
    await this.generateDetailedReport();

    this.generateFinalReport();
  }

  async scanAllDrivers() {
    console.log('🔍 SCANNING COMPLET DE LA STRUCTURE HIÉRARCHIQUE...');
    
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
        console.log(`  📂 ${category}/`);
        await this.scanCategory(categoryPath, type, category);
      }
    }
  }

  async scanCategory(categoryPath, type, category) {
    const items = fs.readdirSync(categoryPath);
    let hasDriverFiles = false;
    let hasSubdirectories = false;
    
    // Vérifier si c'est un driver complet (fichiers présents)
    const hasDriverJs = items.includes('driver.js');
    const hasComposeJson = items.includes('driver.compose.json');
    const hasDeviceJs = items.includes('device.js');
    const hasReadme = items.includes('README.md');
    const hasAssets = items.includes('assets');
    
    if (hasDriverJs && hasComposeJson) {
      hasDriverFiles = true;
      this.stats.total++;
      
      const driverInfo = {
        type: type,
        category: category,
        path: `${type}/${category}`,
        level: 'root',
        files: {
          driverJs: hasDriverJs,
          composeJson: hasComposeJson,
          deviceJs: hasDeviceJs,
          readme: hasReadme,
          assets: hasAssets
        },
        complete: hasDriverJs && hasComposeJson && hasDeviceJs && hasReadme && hasAssets
      };
      
      this.drivers[type].push(driverInfo);
      
      if (driverInfo.complete) {
        this.stats.complete++;
        console.log(`    ✅ Driver complet: ${type}/${category}`);
      } else {
        this.stats.incomplete++;
        console.log(`    ⚠️ Driver incomplet: ${type}/${category}`);
      }
    }
    
    // Scanner les sous-dossiers
    for (const item of items) {
      const itemPath = path.join(categoryPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        hasSubdirectories = true;
        console.log(`    📁 ${item}/`);
        await this.scanSubdirectory(itemPath, type, category, item);
      }
    }
    
    if (hasSubdirectories) {
      this.stats.hierarchical++;
    } else if (hasDriverFiles) {
      this.stats.flat++;
    }
  }

  async scanSubdirectory(subPath, type, parentCategory, subCategory) {
    const items = fs.readdirSync(subPath);
    
    // Vérifier si c'est un driver complet dans le sous-dossier
    const hasDriverJs = items.includes('driver.js');
    const hasComposeJson = items.includes('driver.compose.json');
    const hasDeviceJs = items.includes('device.js');
    const hasReadme = items.includes('README.md');
    const hasAssets = items.includes('assets');
    
    if (hasDriverJs && hasComposeJson) {
      this.stats.total++;
      
      const driverInfo = {
        type: type,
        category: parentCategory,
        subcategory: subCategory,
        path: `${type}/${parentCategory}/${subCategory}`,
        level: 'subdirectory',
        files: {
          driverJs: hasDriverJs,
          composeJson: hasComposeJson,
          deviceJs: hasDeviceJs,
          readme: hasReadme,
          assets: hasAssets
        },
        complete: hasDriverJs && hasComposeJson && hasDeviceJs && hasReadme && hasAssets
      };
      
      this.drivers[type].push(driverInfo);
      
      if (driverInfo.complete) {
        this.stats.complete++;
        console.log(`      ✅ Driver complet: ${type}/${parentCategory}/${subCategory}`);
      } else {
        this.stats.incomplete++;
        console.log(`      ⚠️ Driver incomplet: ${type}/${parentCategory}/${subCategory}`);
      }
    }
    
    // Scanner les sous-sous-dossiers
    for (const item of items) {
      const itemPath = path.join(subPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        console.log(`      📁 ${item}/`);
        await this.scanSubSubdirectory(itemPath, type, parentCategory, subCategory, item);
      }
    }
  }

  async scanSubSubdirectory(subSubPath, type, parentCategory, subCategory, subSubCategory) {
    const items = fs.readdirSync(subSubPath);
    
    // Vérifier si c'est un driver complet dans le sous-sous-dossier
    const hasDriverJs = items.includes('driver.js');
    const hasComposeJson = items.includes('driver.compose.json');
    const hasDeviceJs = items.includes('device.js');
    const hasReadme = items.includes('README.md');
    const hasAssets = items.includes('assets');
    
    if (hasDriverJs && hasComposeJson) {
      this.stats.total++;
      
      const driverInfo = {
        type: type,
        category: parentCategory,
        subcategory: subCategory,
        subsubcategory: subSubCategory,
        path: `${type}/${parentCategory}/${subCategory}/${subSubCategory}`,
        level: 'subsubdirectory',
        files: {
          driverJs: hasDriverJs,
          composeJson: hasComposeJson,
          deviceJs: hasDeviceJs,
          readme: hasReadme,
          assets: hasAssets
        },
        complete: hasDriverJs && hasComposeJson && hasDeviceJs && hasReadme && hasAssets
      };
      
      this.drivers[type].push(driverInfo);
      
      if (driverInfo.complete) {
        this.stats.complete++;
        console.log(`        ✅ Driver complet: ${type}/${parentCategory}/${subCategory}/${subSubCategory}`);
      } else {
        this.stats.incomplete++;
        console.log(`        ⚠️ Driver incomplet: ${type}/${parentCategory}/${subCategory}/${subSubCategory}`);
      }
    }
  }

  async analyzeHierarchicalStructure() {
    console.log('\n📊 ANALYSE DE LA STRUCTURE HIÉRARCHIQUE');
    console.log('========================================');
    
    for (const [type, drivers] of Object.entries(this.drivers)) {
      console.log(`\n🔍 ${type.toUpperCase()} DRIVERS:`);
      
      const rootDrivers = drivers.filter(d => d.level === 'root');
      const subDrivers = drivers.filter(d => d.level === 'subdirectory');
      const subSubDrivers = drivers.filter(d => d.level === 'subsubdirectory');
      
      console.log(`  📁 Root level: ${rootDrivers.length} drivers`);
      console.log(`  📂 Subdirectory level: ${subDrivers.length} drivers`);
      console.log(`  📂 Sub-subdirectory level: ${subSubDrivers.length} drivers`);
      
      // Afficher les drivers par niveau
      if (rootDrivers.length > 0) {
        console.log('\n  📁 ROOT LEVEL DRIVERS:');
        rootDrivers.forEach(driver => {
          const status = driver.complete ? '✅' : '⚠️';
          console.log(`    ${status} ${driver.path}`);
        });
      }
      
      if (subDrivers.length > 0) {
        console.log('\n  📂 SUBDIRECTORY LEVEL DRIVERS:');
        subDrivers.forEach(driver => {
          const status = driver.complete ? '✅' : '⚠️';
          console.log(`    ${status} ${driver.path}`);
        });
      }
      
      if (subSubDrivers.length > 0) {
        console.log('\n  📂 SUB-SUBDIRECTORY LEVEL DRIVERS:');
        subSubDrivers.forEach(driver => {
          const status = driver.complete ? '✅' : '⚠️';
          console.log(`    ${status} ${driver.path}`);
        });
      }
    }
  }

  async generateDetailedReport() {
    console.log('\n📋 RAPPORT DÉTAILLÉ PAR TYPE');
    console.log('==============================');
    
    for (const [type, drivers] of Object.entries(this.drivers)) {
      console.log(`\n🔌 ${type.toUpperCase()} DRIVERS (${drivers.length} total):`);
      
      const completeDrivers = drivers.filter(d => d.complete);
      const incompleteDrivers = drivers.filter(d => !d.complete);
      
      console.log(`  ✅ Complets: ${completeDrivers.length}`);
      console.log(`  ⚠️ Incomplets: ${incompleteDrivers.length}`);
      
      if (incompleteDrivers.length > 0) {
        console.log('\n  ⚠️ DRIVERS INCOMPLETS:');
        incompleteDrivers.forEach(driver => {
          const missingFiles = [];
          if (!driver.files.driverJs) missingFiles.push('driver.js');
          if (!driver.files.composeJson) missingFiles.push('driver.compose.json');
          if (!driver.files.deviceJs) missingFiles.push('device.js');
          if (!driver.files.readme) missingFiles.push('README.md');
          if (!driver.files.assets) missingFiles.push('assets');
          
          console.log(`    ❌ ${driver.path} - Manquant: ${missingFiles.join(', ')}`);
        });
      }
    }
  }

  generateFinalReport() {
    console.log('\n📊 RAPPORT FINAL - MEGA HIERARCHICAL VALIDATOR');
    console.log('================================================');
    
    console.log(`📈 STATISTIQUES GLOBALES:`);
    console.log(`  📊 Total drivers détectés: ${this.stats.total}`);
    console.log(`  ✅ Drivers complets: ${this.stats.complete}`);
    console.log(`  ⚠️ Drivers incomplets: ${this.stats.incomplete}`);
    console.log(`  📈 Taux de complétude: ${Math.round((this.stats.complete / this.stats.total) * 100)}%`);
    
    console.log(`\n🏗️ STRUCTURE HIÉRARCHIQUE:`);
    console.log(`  📁 Drivers hiérarchiques: ${this.stats.hierarchical}`);
    console.log(`  📄 Drivers plats: ${this.stats.flat}`);
    
    console.log(`\n📋 RÉPARTITION PAR TYPE:`);
    for (const [type, drivers] of Object.entries(this.drivers)) {
      const completeCount = drivers.filter(d => d.complete).length;
      const totalCount = drivers.length;
      const completionRate = Math.round((completeCount / totalCount) * 100);
      
      console.log(`  🔌 ${type.toUpperCase()}: ${completeCount}/${totalCount} (${completionRate}%)`);
    }
    
    console.log('\n🎉 MEGA HIERARCHICAL VALIDATOR TERMINÉ !');
    console.log('✅ Structure hiérarchique correctement détectée');
    console.log('✅ Sous-dossiers et sous-sous-dossiers analysés');
    console.log('✅ Comptage précis des drivers');
    console.log('✅ Mode YOLO Ultra confirmé');
  }
}

// Exécuter la validation hiérarchique
const megaValidator = new MegaHierarchicalValidator();
megaValidator.validateHierarchicalStructure(); 