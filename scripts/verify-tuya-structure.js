#!/usr/bin/env node

console.log('🔍 VÉRIFICATION DE LA STRUCTURE TUYA v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function verifyTuyaStructure() {
  try {
    const projectRoot = process.cwd();
    const tuyaPath = path.join(projectRoot, 'drivers', 'tuya');
    
    console.log('📁 Vérification du dossier Tuya...');
    
    if (await fs.pathExists(tuyaPath)) {
      console.log('✅ Dossier Tuya trouvé !');
      
      const categories = await fs.readdir(tuyaPath);
      console.log(`📂 Catégories trouvées: ${categories.length}`);
      
      for (const category of categories) {
        const categoryPath = path.join(tuyaPath, category);
        const stats = await fs.stat(categoryPath);
        
        if (stats.isDirectory()) {
          const vendorPath = path.join(categoryPath, 'tuya');
          if (await fs.pathExists(vendorPath)) {
            const drivers = await fs.readdir(vendorPath);
            console.log(`  📁 ${category}: ${drivers.length} drivers`);
            
            for (const driver of drivers) {
              const driverPath = path.join(vendorPath, driver);
              const driverStats = await fs.stat(driverPath);
              
              if (driverStats.isDirectory()) {
                const files = await fs.readdir(driverPath);
                console.log(`    🚗 ${driver}: ${files.length} fichiers`);
                
                // Vérifier fichiers requis
                const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
                const missingFiles = [];
                
                for (const file of requiredFiles) {
                  if (!(await fs.pathExists(path.join(driverPath, file)))) {
                    missingFiles.push(file);
                  }
                }
                
                if (missingFiles.length > 0) {
                  console.log(`      ❌ Fichiers manquants: ${missingFiles.join(', ')}`);
                } else {
                  console.log(`      ✅ Fichiers requis présents`);
                }
                
                // Vérifier assets
                const assetsPath = path.join(driverPath, 'assets');
                if (await fs.pathExists(assetsPath)) {
                  const assets = await fs.readdir(assetsPath);
                  console.log(`      🎨 Assets: ${assets.length} fichiers`);
                } else {
                  console.log(`      ❌ Dossier assets manquant`);
                }
              }
            }
          }
        }
      }
      
    } else {
      console.log('❌ Dossier Tuya non trouvé !');
      console.log('🔧 Création de la structure...');
      
      // Créer la structure de base
      await fs.ensureDir(tuyaPath);
      
      const categories = ['light', 'switch', 'sensor', 'plug', 'other'];
      for (const category of categories) {
        const categoryPath = path.join(tuyaPath, category);
        await fs.ensureDir(categoryPath);
        
        const vendorPath = path.join(categoryPath, 'tuya');
        await fs.ensureDir(vendorPath);
        
        console.log(`  📁 Créé: ${category}/tuya/`);
      }
      
      console.log('✅ Structure Tuya créée !');
    }
    
  } catch (error) {
    console.error('❌ Erreur vérification:', error);
  }
}

verifyTuyaStructure();
