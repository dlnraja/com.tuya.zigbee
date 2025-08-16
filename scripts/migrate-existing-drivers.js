#!/usr/bin/env node
'use strict';

// !/usr/bin/env node

/**
 * Migration des drivers existants vers la nouvelle structure 3.3
 * Déplace tous les drivers de l'ancienne structure vers la nouvelle
 */

const fs = require('fs');
const path = require('path');

this.log('🚀 Migration des drivers existants vers la nouvelle structure 3.3...');

// Configuration
const OLD_DRIVERS_DIR = '.backup/migration-3.2-to-3.3';
const NEW_DRIVERS_DIR = 'drivers';

// Fonction principale
async function migrateExistingDrivers() {
  try {
    // 1. Vérifier si la sauvegarde existe
    if (!fs.existsSync(OLD_DRIVERS_DIR)) {
      this.log('⚠️ Aucune sauvegarde trouvée. Création d\'une sauvegarde de l\'ancienne structure...');
      await createBackup();
    }
    
    // 2. Scanner l'ancienne structure
    const oldDrivers = await scanOldStructure();
    this.log(`📊 ${oldDrivers.length} drivers trouvés dans l'ancienne structure`);
    
    // 3. Migrer chaque driver
    let migrated = 0;
    let skipped = 0;
    
    for (const driver of oldDrivers) {
      try {
        const success = await migrateDriver(driver);
        if (success) {
          migrated++;
          this.log(`✅ Migré: ${driver.oldPath} → ${driver.newPath}`);
        } else {
          skipped++;
          this.log(`⏭️ Ignoré: ${driver.oldPath}`);
        }
      } catch (error) {
        this.log(`⚠️ Erreur migration ${driver.oldPath}:`, error.message);
        skipped++;
      }
    }
    
    this.log(`📊 Résumé: ${migrated} migrés, ${skipped} ignorés`);
    
    // 4. Nettoyer l'ancienne structure
    await cleanupOldStructure();
    
    this.log('🎉 Migration des drivers existants terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error.message);
    throw error;
  }
}

// Créer une sauvegarde de l'ancienne structure
async function createBackup() {
  const backupDir = '.backup/migration-3.2-to-3.3';
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  // Scanner l'ancienne structure drivers/
  const oldDrivers = await scanCurrentDrivers();
  
  for (const driver of oldDrivers) {
    const backupPath = path.join(backupDir, driver.path);
    if (!fs.existsSync(path.dirname(backupPath))) {
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    }
    await copyDirectory(driver.fullPath, backupPath);
  }
  
  this.log('💾 Sauvegarde créée dans .backup/migration-3.2-to-3.3/');
}

// Scanner la structure actuelle des drivers
async function scanCurrentDrivers() {
  const drivers = [];
  const driversDir = 'drivers';
  
  if (!fs.existsSync(driversDir)) {
    return drivers;
  }
  
  const domains = fs.readdirSync(driversDir).filter(item => 
    fs.statSync(path.join(driversDir, item)).isDirectory()
  );
  
  for (const domain of domains) {
    const domainPath = path.join(driversDir, domain);
    const categories = fs.readdirSync(domainPath).filter(item => 
      fs.statSync(path.join(domainPath, item)).isDirectory()
    );
    
    for (const category of categories) {
      const categoryPath = path.join(domainPath, category);
      const vendors = fs.readdirSync(categoryPath).filter(item => 
        fs.statSync(path.join(categoryPath, item)).isDirectory()
      );
      
      for (const vendor of vendors) {
        const vendorPath = path.join(categoryPath, vendor);
        const models = fs.readdirSync(vendorPath).filter(item => 
          fs.statSync(path.join(vendorPath, item)).isDirectory()
        );
        
        for (const model of models) {
          const modelPath = path.join(vendorPath, model);
          drivers.push({
            path: `${domain}/${category}/${vendor}/${model}`,
            fullPath: modelPath,
            domain,
            category,
            vendor,
            model
          });
        }
      }
    }
  }
  
  return drivers;
}

// Scanner l'ancienne structure
async function scanOldStructure() {
  const drivers = [];
  
  if (!fs.existsSync(OLD_DRIVERS_DIR)) {
    return drivers;
  }
  
  const domains = fs.readdirSync(OLD_DRIVERS_DIR).filter(item => 
    fs.statSync(path.join(OLD_DRIVERS_DIR, item)).isDirectory()
  );
  
  for (const domain of domains) {
    const domainPath = path.join(OLD_DRIVERS_DIR, domain);
    const categories = fs.readdirSync(domainPath).filter(item => 
      fs.statSync(path.join(domainPath, item)).isDirectory()
    );
    
    for (const category of categories) {
      const categoryPath = path.join(domainPath, category);
      const vendors = fs.readdirSync(categoryPath).filter(item => 
        fs.statSync(path.join(categoryPath, item)).isDirectory()
      );
      
      for (const vendor of vendors) {
        const vendorPath = path.join(categoryPath, vendor);
        const models = fs.readdirSync(vendorPath).filter(item => 
          fs.statSync(path.join(vendorPath, item)).isDirectory()
        );
        
        for (const model of models) {
          const modelPath = path.join(vendorPath, model);
          drivers.push({
            oldPath: `${domain}/${category}/${vendor}/${model}`,
            oldFullPath: modelPath,
            domain,
            category,
            vendor,
            model,
            newPath: determineNewPath(domain, category, vendor, model)
          });
        }
      }
    }
  }
  
  return drivers;
}

// Déterminer le nouveau chemin
function determineNewPath(domain, category, vendor, model) {
  if (domain === 'tuya') {
    return \tuya_zigbee/models/${vendor}_${model}`;
  } else if (domain === 'zigbee') {
    return `zigbee/models/${vendor}_${model}`;
  } else {
    return \tuya_zigbee/models/${domain}_${model}`;
  }
}

// Migrer un driver
async function migrateDriver(driver) {
  const newFullPath = path.join(NEW_DRIVERS_DIR, driver.newPath);
  
  // Vérifier si le driver existe déjà
  if (fs.existsSync(newFullPath)) {
    return false; // Ignorer
  }
  
  // Créer le nouveau dossier
  if (!fs.existsSync(path.dirname(newFullPath))) {
    fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
  }
  
  // Copier le contenu
  await copyDirectory(driver.oldFullPath, newFullPath);
  
  // Créer les fichiers manquants
  await createMissingFiles(newFullPath, driver);
  
  return true;
}

// Créer les fichiers manquants
async function createMissingFiles(driverPath, driverInfo) {
  const requiredFiles = [
    'driver.compose.json',
    'driver.js',
    'device.js',
    'metadata.json',
    'README.md'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(driverPath, file);
    if (!fs.existsSync(filePath)) {
      const content = generateFileContent(file, driverInfo);
      fs.writeFileSync(filePath, content);
    }
  }
  
  // Créer le dossier assets
  const assetsPath = path.join(driverPath, 'assets');
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
  }
  
  // Créer icon.svg
  const iconPath = path.join(assetsPath, 'icon.svg');
  if (!fs.existsSync(iconPath)) {
    const iconContent = generateIconSVG();
    fs.writeFileSync(iconPath, iconContent);
  }
}

// Générer le contenu des fichiers
function generateFileContent(fileType, driverInfo) {
  const driverName = `${driverInfo.vendor}_${driverInfo.model}`;
  
  switch (fileType) {
    case 'driver.compose.json':
      return JSON.stringify({
        "id": driverName,
        "name": driverName.replace(/_/g, ' '),
        "images": {
          "small": "assets/images/small.png",
          "large": "assets/images/large.png"
        }
      }, null, 2);
    
    case 'driver.js':
      return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${driverName.replace(/[^a-zA-Z0-9]/g, '_')}Driver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = ${driverName.replace(/[^a-zA-Z0-9]/g, '_')}Driver;`;
    
    case 'device.js':
      return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${driverName.replace(/[^a-zA-Z0-9]/g, '_')}Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique de l'appareil
  }
}

module.exports = ${driverName.replace(/[^a-zA-Z0-9]/g, '_')}Device;`;
    
    case 'metadata.json':
      return JSON.stringify({
        "id": driverName,
        "name": driverName.replace(/_/g, ' '),
        "capabilities": ["onoff"],
        "clusters": ["0x0006"],
        "endpoints": [1]
      }, null, 2);
    
    case 'README.md':
      return `// ${driverName.replace(/_/g, ' ')}

Driver pour ${driverName.replace(/_/g, ' ')}.

#// Capabilities
- onoff

#// Clusters
- 0x0006: On/Off

#// Installation
1. Installer l'app Tuya Zigbee
2. Ajouter l'appareil
3. Sélectionner ce driver

#// Support
- Forum Homey: [lien]
- GitHub: [lien]`;
    
    default:
      return '';
  }
}

// Générer l'icône SVG
function generateIconSVG() {
  return `<svg xmlns = "http://www.w3.org/2000/svg" viewBox = "0 0 960 960">
  <rect width = "960" height = "960" fill = "none"/>
  <circle cx = "480" cy = "480" r = "200" fill = "// 3498db" stroke = "// 2980b9" stroke-width = "20"/>
  <path d = "M400 400 L560 480 L400 560 Z" fill = "white"/>
</svg>`;
}

// Copier un répertoire
async function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Nettoyer l'ancienne structure
async function cleanupOldStructure() {
  if (fs.existsSync(OLD_DRIVERS_DIR)) {
    this.log('🧹 Nettoyage de l\'ancienne structure...');
    // Garder la sauvegarde pour sécurité
    this.log('💾 Sauvegarde conservée dans .backup/migration-3.2-to-3.3/');
  }
}

// Exécution
if (require.main === module) {
  migrateExistingDrivers().catch(console.error);
}

module.exports = { migrateExistingDrivers };
