#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🔄 FUSION SIMPLE DES DRIVERS EXISTANTS v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function fusionDrivers() {
  try {
    const projectRoot = process.cwd();
    const driversPath = path.join(projectRoot, 'drivers');
    const tuyaPath = path.join(driversPath, 'tuya');
    
    // Drivers existants à fusionner
    const existingDrivers = [
      'motion_sensor',
      'rgb_bulb_E27', 
      'smartplug',
      'temphumidsensor',
      'tuya_zigbee',
      'wall_switch_1_gang',
      'wall_switch_2_gang',
      'wall_switch_3_gang',
      'zigbee'
    ];
    
    console.log('🚗 Fusion des drivers existants...');
    
    for (const driver of existingDrivers) {
      const sourcePath = path.join(driversPath, driver);
      const targetCategory = getCategoryForDriver(driver);
      const targetPath = path.join(tuyaPath, targetCategory, 'tuya', driver);
      
      if (await fs.pathExists(sourcePath)) {
        console.log(`🔄 Fusion: ${driver} -> ${targetCategory}`);
        
        // Créer le dossier de destination
        await fs.ensureDir(targetPath);
        
        // Copier les fichiers existants
        const files = await fs.readdir(sourcePath);
        for (const file of files) {
          if (file === 'README_OLD.md' || file === 'STRUCTURE_OLD.md') continue;
          
          const sourceFilePath = path.join(sourcePath, file);
          const targetFilePath = path.join(targetPath, file);
          const stats = await fs.stat(sourceFilePath);
          
          if (stats.isDirectory()) {
            await fs.copy(sourceFilePath, targetFilePath);
          } else {
            await fs.copy(sourceFilePath, targetFilePath);
          }
        }
        
        console.log(`✅ ${driver} fusionné vers ${targetCategory}`);
      }
    }
    
    console.log('✅ FUSION TERMINÉE !');
    
  } catch (error) {
    console.error('❌ Erreur fusion:', error);
  }
}

function getCategoryForDriver(driverName) {
  if (driverName.includes('light') || driverName.includes('bulb')) return 'light';
  if (driverName.includes('switch')) return 'switch';
  if (driverName.includes('sensor') || driverName.includes('motion') || driverName.includes('temp')) return 'sensor';
  if (driverName.includes('plug')) return 'plug';
  return 'other';
}

fusionDrivers();
