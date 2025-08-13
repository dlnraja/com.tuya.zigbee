// !/usr/bin/env node

/**
 * Validation finale de la migration vers la structure SDK3+ conforme
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validation finale de la migration SDK3+...');

// Configuration
const DRIVERS_DIR = 'drivers';

// Fonction principale
async function validateFinalSDK3() {
  try {
    console.log('📊 Vérification de l\'état final...');
    
    // 1. Vérifier la structure
    const structure = await checkStructure();
    
    // 2. Compter les drivers
    const drivers = await countDrivers();
    
    // 3. Vérifier les noms
    const naming = await checkNaming();
    
    // 4. Vérifier les fichiers
    const files = await checkFiles();
    
    // 5. Résumé final
    console.log('\n📋 RÉSUMÉ FINAL DE LA MIGRATION SDK3+');
    console.log('=====================================');
    console.log(`🏗️  Structure: ${structure.valid ? '✅ Conforme' : '❌ Non conforme'}`);
    console.log(`📊 Drivers: ${drivers.total} total`);
    console.log(`🏷️  Noms: ${naming.valid ? '✅ Conformes' : '❌ Non conformes'}`);
    console.log(`📄 Fichiers: ${files.valid ? '✅ Complets' : '❌ Incomplets'}`);
    
    if (structure.valid && naming.valid && files.valid) {
      console.log('\n🎉 MIGRATION SDK3+ RÉUSSIE !');
      console.log('✅ Tous les composants sont conformes aux spécifications');
    } else {
      console.log('\n⚠️ Migration SDK3+ partiellement réussie');
      console.log('🔧 Certains composants nécessitent une attention');
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la validation:', error.message);
  }
}

// Vérifier la structure
async function checkStructure() {
  console.log('📁 Vérification de la structure...');
  
  const requiredDirs = [
    'drivers/tuya_zigbee/models',
    'drivers/tuya_zigbee/brands',
    'drivers/tuya_zigbee/categories',
    'drivers/tuya_zigbee/__generic__',
    'drivers/tuya_zigbee/__templates__',
    'drivers/zigbee/models',
    'drivers/zigbee/brands',
    'drivers/zigbee/categories',
    'drivers/zigbee/__generic__',
    'drivers/zigbee/__templates__'
  ];
  
  let valid = true;
  
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      console.log(`❌ Dossier manquant: ${dir}`);
      valid = false;
    } else {
      console.log(`✅ Dossier présent: ${dir}`);
    }
  }
  
  return { valid };
}

// Compter les drivers
async function countDrivers() {
  console.log('\n📊 Comptage des drivers...');
  
  const drivers = await scanAllDrivers();
  
  const counts = {
    total: drivers.length,
    tuyaZigbee: drivers.filter(d => d.domain === 'tuya_zigbee').length,
    zigbee: drivers.filter(d => d.domain === 'zigbee').length,
    models: drivers.filter(d => d.type === 'models').length,
    generic: drivers.filter(d => d.type === '__generic__').length,
    templates: drivers.filter(d => d.type === '__templates__').length
  };
  
  console.log(`📊 Total: ${counts.total} drivers`);
  console.log(`🔌 Tuya Zigbee: ${counts.tuyaZigbee} drivers`);
  console.log(`📡 Zigbee: ${counts.zigbee} drivers`);
  console.log(`📋 Modèles: ${counts.models} drivers`);
  console.log(`🎯 Génériques: ${counts.generic} drivers`);
  console.log(`📝 Templates: ${counts.templates} drivers`);
  
  return counts;
}

// Vérifier les noms
async function checkNaming() {
  console.log('\n🏷️ Vérification des noms...');
  
  const drivers = await scanAllDrivers();
  let valid = true;
  let invalidNames = 0;
  
  for (const driver of drivers) {
    if (!isValidSDK3Name(driver.name)) {
      console.log(`❌ Nom invalide: ${driver.name}`);
      invalidNames++;
      valid = false;
    }
  }
  
  if (valid) {
    console.log('✅ Tous les noms respectent les conventions SDK3+');
  } else {
    console.log(`⚠️ ${invalidNames} noms non conformes`);
  }
  
  return { valid, invalidNames };
}

// Vérifier si un nom respecte les conventions SDK3+
function isValidSDK3Name(name) {
  // Format attendu : <ts_model|vendor>_<device_type>_<form_factor>_<variant>
  const pattern = /^[a-z0-9_]+_[a-z_]+_[a-z_]+_[a-z0-9_]+$/;
  
  // Vérifications supplémentaires
  const parts = name.split('_');
  if (parts.length < 4) {
    return false;
  }
  
  // Vérifier que le premier segment est un vendor valide
  const vendor = parts[0];
  if (!vendor || vendor.length < 2) {
    return false;
  }
  
  return pattern.test(name);
}

// Vérifier les fichiers
async function checkFiles() {
  console.log('\n📄 Vérification des fichiers...');
  
  const drivers = await scanAllDrivers();
  const requiredFiles = [
    'driver.compose.json',
    'driver.js',
    'device.js',
    'metadata.json',
    'README.md'
  ];
  
  let valid = true;
  let missingFiles = 0;
  
  for (const driver of drivers) {
    for (const file of requiredFiles) {
      const filePath = path.join(driver.fullPath, file);
      if (!fs.existsSync(filePath)) {
        console.log(`❌ Fichier manquant: ${driver.path}/${file}`);
        missingFiles++;
        valid = false;
      }
    }
  }
  
  if (valid) {
    console.log(`✅ Tous les fichiers requis sont présents (${drivers.length * requiredFiles.length} fichiers)`);
  } else {
    console.log(`⚠️ ${missingFiles} fichiers manquants`);
  }
  
  return { valid, missingFiles };
}

// Scanner tous les drivers
async function scanAllDrivers() {
  const drivers = [];
  
  if (!fs.existsSync(DRIVERS_DIR)) {
    return drivers;
  }
  
  const domains = fs.readdirSync(DRIVERS_DIR).filter(item => 
    fs.statSync(path.join(DRIVERS_DIR, item)).isDirectory()
  );
  
  for (const domain of domains) {
    const domainPath = path.join(DRIVERS_DIR, domain);
    const subdirs = fs.readdirSync(domainPath).filter(item => 
      fs.statSync(path.join(domainPath, item)).isDirectory()
    );
    
    for (const subdir of subdirs) {
      if (subdir === 'models' || subdir === '__generic__' || subdir === '__templates__') {
        const subdirPath = path.join(domainPath, subdir);
        const driverDirs = fs.readdirSync(subdirPath).filter(item => 
          fs.statSync(path.join(subdirPath, item)).isDirectory()
        );
        
        for (const driverDir of driverDirs) {
          const driverPath = path.join(subdirPath, driverDir);
          drivers.push({
            path: `${domain}/${subdir}/${driverDir}`,
            fullPath: driverPath,
            domain,
            type: subdir,
            name: driverDir
          });
        }
      }
    }
  }
  
  return drivers;
}

// Exécution
if (require.main === module) {
  validateFinalSDK3().catch(console.error);
}

module.exports = { validateFinalSDK3 };
