#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🔄 RÉORGANISATION COMPLÈTE v3.4.1 - FICHIERS JSON ET DRIVERS...');

const fs = require('fs-extra');
const path = require('path');

class CompleteReorganization {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupsPath = path.join(this.projectRoot, 'backups');
    this.driversPath = path.join(this.projectRoot, 'drivers');
    this.catalogPath = path.join(this.projectRoot, 'catalog');
  }

  async run() {
    try {
      console.log('📁 Phase 1: Réorganisation des fichiers .json de la racine...');
      await this.reorganizeRootJsonFiles();
      
      console.log('📁 Phase 2: Restructuration du dossier drivers...');
      await this.restructureDriversDirectory();
      
      console.log('📁 Phase 3: Fusion des drivers dans la nouvelle structure...');
      await this.mergeDriversIntoNewStructure();
      
      console.log('📁 Phase 4: Nettoyage final et validation...');
      await this.finalCleanupAndValidation();
      
      console.log('✅ RÉORGANISATION COMPLÈTE TERMINÉE !');
      
    } catch (error) {
      console.error('❌ Erreur réorganisation:', error);
    }
  }

  async reorganizeRootJsonFiles() {
    // Créer les catégories pour les fichiers .json
    const jsonCategories = ['config', 'linting', 'testing', 'build', 'git', 'vscode'];
    for (const category of jsonCategories) {
      const categoryPath = path.join(this.backupsPath, 'json', category);
      await fs.ensureDir(categoryPath);
    }

    // Fichiers .json à catégoriser
    const jsonFiles = [
      { name: 'app.json', category: 'config' },
      { name: 'package.json', category: 'config' },
      { name: 'package-lock.json', category: 'config' },
      { name: '.prettierrc', category: 'linting' },
      { name: '.eslintrc.json', category: 'linting' },
      { name: '.nycrc.json', category: 'testing' },
      { name: '.mocharc.json', category: 'testing' },
      { name: '.gitmessage', category: 'git' },
      { name: 'CODEOWNERS', category: 'git' }
    ];

    for (const fileInfo of jsonFiles) {
      const sourcePath = path.join(this.projectRoot, fileInfo.name);
      if (await fs.pathExists(sourcePath)) {
        const targetPath = path.join(this.backupsPath, 'json', fileInfo.category, fileInfo.name);
        await fs.move(sourcePath, targetPath);
        console.log(`📁 Déplacé: ${fileInfo.name} -> backups/json/${fileInfo.category}/`);
      }
    }
  }

  async restructureDriversDirectory() {
    // Garder seulement tuya_zigbee, zigbee, et _common
    const allowedDirs = ['tuya_zigbee', 'zigbee', '_common'];
    
    // Créer la structure SOT si elle n'existe pas
    await this.ensureSOTStructure();
    
    // Déplacer les autres dossiers vers backups
    const items = await fs.readdir(this.driversPath);
    for (const item of items) {
      const itemPath = path.join(this.driversPath, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        if (!allowedDirs.includes(item)) {
          // Déplacer vers backups
          const targetPath = path.join(this.backupsPath, 'drivers_old', item);
          await fs.move(itemPath, targetPath);
          console.log(`📁 Déplacé: drivers/${item} -> backups/drivers_old/${item}`);
        }
      } else if (item.endsWith('.md')) {
        // Déplacer les fichiers .md
        const targetPath = path.join(this.backupsPath, 'markdown', item);
        await fs.move(itemPath, targetPath);
        console.log(`📁 Déplacé: drivers/${item} -> backups/markdown/${item}`);
      }
    }
  }

  async ensureSOTStructure() {
    // Créer la structure Source-of-Truth
    const sotCategories = ['light', 'switch', 'sensor-motion', 'sensor-presence', 'sensor-temp', 'sensor-humidity', 'sensor-contact', 'sensor-water', 'sensor-smoke', 'sensor-gas', 'sensor-vibration', 'sensor-sound', 'sensor-light', 'sensor-occupancy', 'sensor-multi', 'curtain', 'blind', 'fan', 'thermostat', 'lock', 'garage', 'gate', 'valve', 'pump', 'motor', 'relay', 'dimmer', 'bulb', 'strip', 'panel', 'controller', 'bridge', 'gateway', 'repeater', 'extender', 'hub', 'coordinator', 'router', 'end-device', 'other'];
    
    for (const category of sotCategories) {
      const categoryPath = path.join(this.catalogPath, category);
      await fs.ensureDir(categoryPath);
      
      // Créer le dossier tuya dans chaque catégorie
      const tuyaPath = path.join(categoryPath, 'tuya');
      await fs.ensureDir(tuyaPath);
    }
  }

  async mergeDriversIntoNewStructure() {
    // Récupérer les drivers depuis backups/drivers_old et les fusionner
    const oldDriversPath = path.join(this.backupsPath, 'drivers_old');
    
    if (await fs.pathExists(oldDriversPath)) {
      const oldDrivers = await fs.readdir(oldDriversPath);
      
      for (const driver of oldDrivers) {
        const driverPath = path.join(oldDriversPath, driver);
        const category = this.getCategoryForDriver(driver);
        const targetPath = path.join(this.catalogPath, category, 'tuya', driver);
        
        // Créer le dossier de destination
        await fs.ensureDir(targetPath);
        
        // Copier le contenu du driver
        await fs.copy(driverPath, targetPath);
        console.log(`📁 Fusionné: ${driver} -> catalog/${category}/tuya/${driver}`);
        
        // Supprimer l'ancien dossier
        await fs.remove(driverPath);
      }
    }
  }

  getCategoryForDriver(driverName) {
    const name = driverName.toLowerCase();
    
    if (name.includes('bulb') || name.includes('light') || name.includes('lamp') || name.includes('rgb')) return 'light';
    if (name.includes('switch') || name.includes('plug') || name.includes('outlet')) return 'switch';
    if (name.includes('motion') || name.includes('pir')) return 'sensor-motion';
    if (name.includes('temp') || name.includes('therm')) return 'sensor-temp';
    if (name.includes('humid') || name.includes('moisture')) return 'sensor-humidity';
    if (name.includes('contact') || name.includes('door') || name.includes('window')) return 'sensor-contact';
    if (name.includes('water') || name.includes('leak')) return 'sensor-water';
    if (name.includes('smoke') || name.includes('fire')) return 'sensor-smoke';
    if (name.includes('gas') || name.includes('co2')) return 'sensor-gas';
    if (name.includes('vibration') || name.includes('shock')) return 'sensor-vibration';
    if (name.includes('sound') || name.includes('noise')) return 'sensor-sound';
    if (name.includes('light') || name.includes('luminance')) return 'sensor-light';
    if (name.includes('occupancy') || name.includes('presence')) return 'sensor-occupancy';
    if (name.includes('curtain') || name.includes('blind')) return 'curtain';
    if (name.includes('fan')) return 'fan';
    if (name.includes('thermostat') || name.includes('climate')) return 'thermostat';
    if (name.includes('lock')) return 'lock';
    if (name.includes('garage') || name.includes('gate')) return 'garage';
    if (name.includes('valve') || name.includes('pump')) return 'valve';
    if (name.includes('motor') || name.includes('relay')) return 'motor';
    if (name.includes('dimmer')) return 'dimmer';
    if (name.includes('strip') || name.includes('panel')) return 'strip';
    if (name.includes('controller') || name.includes('bridge') || name.includes('gateway')) return 'controller';
    if (name.includes('repeater') || name.includes('extender')) return 'repeater';
    if (name.includes('hub') || name.includes('coordinator')) return 'hub';
    if (name.includes('router') || name.includes('end-device')) return 'router';
    
    return 'other';
  }

  async finalCleanupAndValidation() {
    // Vérifier la structure finale
    console.log('\n🔍 Structure finale du dossier drivers:');
    const driversItems = await fs.readdir(this.driversPath);
    for (const item of driversItems) {
      const itemPath = path.join(this.driversPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(itemPath);
        console.log(`  📁 ${item}: ${files.length} éléments`);
      } else {
        console.log(`  📄 ${item}`);
      }
    }

    console.log('\n🔍 Structure finale du dossier catalog:');
    const catalogItems = await fs.readdir(this.catalogPath);
    for (const item of catalogItems) {
      const itemPath = path.join(this.catalogPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        const tuyaPath = path.join(itemPath, 'tuya');
        if (await fs.pathExists(tuyaPath)) {
          const drivers = await fs.readdir(tuyaPath);
          console.log(`  📁 ${item}/tuya: ${drivers.length} drivers`);
        }
      }
    }
  }
}

// Exécuter la réorganisation
const reorganization = new CompleteReorganization();
reorganization.run();
