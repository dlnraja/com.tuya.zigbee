#!/usr/bin/env node

console.log('🔍 VALIDATION HOMEY SDK3 v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function validateHomeyProject() {
  try {
    const projectRoot = process.cwd();
    
    console.log('📁 Validation de la structure du projet...');
    
    // Vérifier les fichiers requis
    const requiredFiles = ['app.json', 'package.json', 'app.js'];
    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file);
      if (await fs.pathExists(filePath)) {
        console.log(`✅ ${file} - Présent`);
      } else {
        console.log(`❌ ${file} - Manquant`);
      }
    }
    
    // Vérifier la structure drivers
    const driversPath = path.join(projectRoot, 'drivers');
    if (await fs.pathExists(driversPath)) {
      const driverDirs = await fs.readdir(driversPath);
      console.log(`📊 Dossiers drivers: ${driverDirs.join(', ')}`);
      
      // Vérifier tuya_zigbee
      const tuyaPath = path.join(driversPath, 'tuya_zigbee');
      if (await fs.pathExists(tuyaPath)) {
        const tuyaItems = await fs.readdir(tuyaPath);
        console.log(`📊 Contenu tuya_zigbee: ${tuyaItems.length} éléments`);
        
        if (tuyaItems.includes('models')) {
          const modelsPath = path.join(tuyaPath, 'models');
          const models = await fs.readdir(modelsPath);
          console.log(`📊 Modèles Tuya: ${models.length} drivers`);
        }
      }
      
      // Vérifier zigbee
      const zigbeePath = path.join(driversPath, 'zigbee');
      if (await fs.pathExists(zigbeePath)) {
        const zigbeeItems = await fs.readdir(zigbeePath);
        console.log(`📊 Contenu zigbee: ${zigbeeItems.length} éléments`);
      }
    }
    
    // Vérifier la structure catalog
    const catalogPath = path.join(projectRoot, 'catalog');
    if (await fs.pathExists(catalogPath)) {
      const categories = await fs.readdir(catalogPath);
      console.log(`📊 Catégories catalog: ${categories.length} catégories`);
      
      // Compter les drivers dans catalog
      let totalDrivers = 0;
      for (const category of categories) {
        const categoryPath = path.join(catalogPath, category);
        if (await fs.pathExists(categoryPath)) {
          const vendors = await fs.readdir(categoryPath);
          for (const vendor of vendors) {
            const vendorPath = path.join(categoryPath, vendor);
            if (await fs.pathExists(vendorPath)) {
              const products = await fs.readdir(vendorPath);
              totalDrivers += products.length;
            }
          }
        }
      }
      console.log(`📊 Total drivers dans catalog: ${totalDrivers}`);
    }
    
    // Vérifier les assets
    console.log('\n🎨 Validation des assets...');
    await validateAssets();
    
    console.log('\n✅ Validation terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error);
  }
}

async function validateAssets() {
  const driversPath = path.join(process.cwd(), 'drivers');
  
  if (!await fs.pathExists(driversPath)) {
    return;
  }
  
  let totalDrivers = 0;
  let driversWithAssets = 0;
  let driversWithAllAssets = 0;
  
  // Scanner récursivement tous les drivers
  await scanDriversForAssets(driversPath, {
    totalDrivers,
    driversWithAssets,
    driversWithAllAssets
  });
  
  console.log(`📊 Drivers avec assets: ${driversWithAssets}/${totalDrivers}`);
  console.log(`📊 Drivers avec tous les assets: ${driversWithAllAssets}/${totalDrivers}`);
}

async function scanDriversForAssets(dirPath, stats) {
  try {
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const itemStats = await fs.stat(fullPath);
      
      if (itemStats.isDirectory()) {
        // Vérifier si c'est un driver
        const composeFile = path.join(fullPath, 'driver.compose.json');
        if (await fs.pathExists(composeFile)) {
          stats.totalDrivers++;
          
          // Vérifier les assets
          const assetsPath = path.join(fullPath, 'assets');
          if (await fs.pathExists(assetsPath)) {
            stats.driversWithAssets++;
            
            const assets = await fs.readdir(assetsPath);
            const requiredAssets = ['icon.svg', 'small.svg', 'large.svg', 'xlarge.svg'];
            const hasAllAssets = requiredAssets.every(asset => assets.includes(asset));
            
            if (hasAllAssets) {
              stats.driversWithAllAssets++;
            }
          }
        } else {
          // Continuer à scanner récursivement
          await scanDriversForAssets(fullPath, stats);
        }
      }
    }
  } catch (error) {
    // Ignorer les erreurs de permission
  }
}

// Exécuter la validation
validateHomeyProject().catch(console.error);
