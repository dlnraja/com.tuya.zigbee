#!/usr/bin/env node

console.log('🔍 VALIDATION FINALE TUYA v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function validateTuyaFinal() {
  try {
    const projectRoot = process.cwd();
    const tuyaPath = path.join(projectRoot, 'drivers', 'tuya');
    
    console.log('📁 Validation de la structure Tuya...');
    
    if (!(await fs.pathExists(tuyaPath))) {
      console.log('❌ Dossier Tuya non trouvé !');
      return false;
    }
    
    console.log('✅ Dossier Tuya trouvé !');
    
    const categories = await fs.readdir(tuyaPath);
    console.log(`📂 Catégories trouvées: ${categories.length}`);
    
    let totalDrivers = 0;
    let validDrivers = 0;
    let invalidDrivers = 0;
    
    for (const category of categories) {
      const categoryPath = path.join(tuyaPath, category);
      const stats = await fs.stat(categoryPath);
      
      if (stats.isDirectory()) {
        const vendorPath = path.join(categoryPath, 'tuya');
        if (await fs.pathExists(vendorPath)) {
          const drivers = await fs.readdir(vendorPath);
          totalDrivers += drivers.length;
          
          console.log(`  📁 ${category}: ${drivers.length} drivers`);
          
          for (const driver of drivers) {
            const driverPath = path.join(vendorPath, driver);
            const driverStats = await fs.stat(driverPath);
            
            if (driverStats.isDirectory()) {
              const files = await fs.readdir(driverPath);
              
              // Vérifier fichiers requis
              const requiredFiles = ['driver.compose.json', 'device.js', 'driver.js'];
              const missingFiles = [];
              
              for (const file of requiredFiles) {
                if (!(await fs.pathExists(path.join(driverPath, file)))) {
                  missingFiles.push(file);
                }
              }
              
              if (missingFiles.length === 0) {
                validDrivers++;
                console.log(`    ✅ ${driver}: Fichiers complets`);
              } else {
                invalidDrivers++;
                console.log(`    ❌ ${driver}: Fichiers manquants: ${missingFiles.join(', ')}`);
              }
              
              // Vérifier assets
              const assetsPath = path.join(driverPath, 'assets');
              if (await fs.pathExists(assetsPath)) {
                const assets = await fs.readdir(assetsPath);
                if (assets.length > 0) {
                  console.log(`      🎨 Assets: ${assets.length} fichiers`);
                } else {
                  console.log(`      ⚠️ Assets: Dossier vide`);
                }
              } else {
                console.log(`      ❌ Assets: Dossier manquant`);
              }
            }
          }
        }
      }
    }
    
    console.log('\n📊 RÉSUMÉ DE VALIDATION');
    console.log('========================');
    console.log(`📁 Catégories: ${categories.length}`);
    console.log(`🚗 Total drivers: ${totalDrivers}`);
    console.log(`✅ Drivers valides: ${validDrivers}`);
    console.log(`❌ Drivers invalides: ${invalidDrivers}`);
    console.log(`📈 Taux de succès: ${totalDrivers > 0 ? Math.round((validDrivers / totalDrivers) * 100) : 0}%`);
    
    if (validDrivers === totalDrivers && totalDrivers > 0) {
      console.log('\n🎉 VALIDATION COMPLÈTE RÉUSSIE !');
      console.log('✅ Tous les drivers sont valides et prêts pour la production !');
      return true;
    } else {
      console.log('\n⚠️ VALIDATION PARTIELLE');
      console.log('🔧 Certains drivers nécessitent des corrections');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erreur validation:', error);
    return false;
  }
}

validateTuyaFinal();
