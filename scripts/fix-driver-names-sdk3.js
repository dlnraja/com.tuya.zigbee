#!/usr/bin/env node
'use strict';

// !/usr/bin/env node

/**
 * Correction des noms des drivers selon les conventions SDK3+
 * Format: <ts_model|vendor>_<device_type>_<form_factor>_<variant>
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction des noms des drivers selon les conventions SDK3+...');

// Configuration
const DRIVERS_DIR = 'drivers';

// Mapping des catégories vers device_type
const CATEGORY_MAPPING = {
  'switch': 'wall_switch',
  'light': 'bulb',
  'sensor': 'sensor',
  'cover': 'cover',
  'thermostat': 'thermostat',
  'plug': 'smart_plug',
  'lock': 'lock',
  'water': 'sensor',
  'vibration': 'sensor',
  'presence': 'sensor',
  'smoke': 'sensor',
  'gas': 'sensor',
  'curtain': 'cover',
  'blind': 'cover',
  'garage': 'cover',
  'deadbolt': 'lock',
  'padlock': 'lock',
  'door': 'lock',
  'contact': 'sensor',
  'motion': 'sensor',
  'temperature': 'sensor',
  'humidity': 'sensor',
  'heater': 'thermostat',
  'fan': 'switch',
  'bulb': 'bulb',
  'ceiling': 'bulb',
  'table': 'bulb',
  'floor': 'bulb',
  'garden': 'bulb',
  'strip': 'bulb',
  'outlet': 'smart_plug',
  'power': 'smart_plug',
  'smart': 'smart_plug',
  'ac': 'smart_plug',
  'chime': 'sensor',
  'buzzer': 'sensor',
  'alarm': 'sensor'
};

// Fonction principale
async function fixDriverNamesSDK3() {
  try {
    // 1. Scanner tous les drivers
    console.log('📊 Scanner des drivers...');
    const drivers = await scanAllDrivers();
    console.log(`📊 ${drivers.length} drivers trouvés`);
    
    // 2. Corriger les noms
    console.log('🔧 Correction des noms...');
    let corrected = 0;
    let skipped = 0;
    
    for (const driver of drivers) {
      try {
        const success = await fixDriverName(driver);
        if (success) {
          corrected++;
          console.log(`✅ Corrigé: ${driver.oldName} → ${driver.newName}`);
        } else {
          skipped++;
          console.log(`⏭️ Ignoré: ${driver.oldName}`);
        }
      } catch (error) {
        console.log(`⚠️ Erreur correction ${driver.oldName}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`📊 Résumé: ${corrected} corrigés, ${skipped} ignorés`);
    
    // 3. Générer le rapport
    console.log('📄 Génération du rapport...');
    await generateReport(drivers, corrected, skipped);
    
    console.log('🎉 Correction des noms terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error.message);
    throw error;
  }
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
            oldName: driverDir,
            newName: generateCorrectName(driverDir)
          });
        }
      }
    }
  }
  
  return drivers;
}

// Générer le nom correct selon les conventions SDK3+
function generateCorrectName(oldName) {
  // Nettoyer le nom
  let cleanName = oldName;
  
  // Supprimer les suffixes de migration
  cleanName = cleanName.replace(/drivers-backup-2025-08-13T\d{2}-\d{2}-\d{2}-\d{3}Z_/g, '');
  cleanName = cleanName.replace(/models_standard_default_models_standard_default/g, '');
  cleanName = cleanName.replace(/___templates___standard_default/g, '');
  cleanName = cleanName.replace(/___generic___standard_default/g, '');
  
  // Extraire les composants
  const parts = cleanName.split('_');
  
  if (parts.length < 2) {
    return cleanName; // Garder tel quel si pas assez de parties
  }
  
  // Premier segment = vendor/ts_model
  const vendor = parts[0];
  
  // Détecter le device_type depuis le nom
  let deviceType = 'device';
  let formFactor = 'standard';
  let variant = 'default';
  
  // Analyser le nom pour détecter le type
  if (cleanName.includes('ts0001') || cleanName.includes('ts0002') || cleanName.includes('ts0003')) {
    deviceType = 'wall_switch';
    if (cleanName.includes('1gang')) {
      variant = '1gang';
      formFactor = 'wall';
    } else if (cleanName.includes('2gang')) {
      variant = '2gang';
      formFactor = 'wall';
    } else if (cleanName.includes('3gang')) {
      variant = '3gang';
      formFactor = 'wall';
    }
  } else if (cleanName.includes('ts011f')) {
    deviceType = 'smart_plug';
    formFactor = 'mains';
    if (cleanName.includes('em')) {
      variant = 'em';
    }
  } else if (cleanName.includes('ts0505a') || cleanName.includes('ts0505b') || cleanName.includes('ts0505c')) {
    deviceType = 'bulb';
    formFactor = 'e27';
    if (cleanName.includes('rgbcw')) {
      variant = 'rgbcw';
    }
  } else if (cleanName.includes('ts0601')) {
    deviceType = 'sensor';
    formFactor = 'battery';
    if (cleanName.includes('thermostat')) {
      deviceType = 'thermostat';
      formFactor = 'wall';
      variant = 'wk';
    } else if (cleanName.includes('curtain')) {
      deviceType = 'cover';
      formFactor = 'curtain';
    }
  } else if (cleanName.includes('ts0201') || cleanName.includes('ts0202') || cleanName.includes('ts0203') || cleanName.includes('ts0205')) {
    deviceType = 'sensor';
    formFactor = 'battery';
    if (cleanName.includes('motion')) {
      variant = 'motion';
    } else if (cleanName.includes('presence')) {
      variant = 'presence';
    }
  } else if (cleanName.includes('ts110f') || cleanName.includes('ts130f')) {
    deviceType = 'bulb';
    formFactor = 'e27';
  } else if (cleanName.includes('radar-24g')) {
    deviceType = 'sensor';
    formFactor = 'battery';
    variant = 'presence';
  } else if (cleanName.includes('generic')) {
    deviceType = 'generic';
    if (cleanName.includes('wall_switch')) {
      deviceType = 'wall_switch';
      if (cleanName.includes('1gang')) variant = '1gang';
      else if (cleanName.includes('2gang')) variant = '2gang';
      else if (cleanName.includes('3gang')) variant = '3gang';
      formFactor = 'wall';
    } else if (cleanName.includes('smart_plug')) {
      deviceType = 'smart_plug';
      formFactor = 'mains';
      if (cleanName.includes('em')) variant = 'em';
    } else if (cleanName.includes('bulb')) {
      deviceType = 'bulb';
      if (cleanName.includes('rgbcw')) variant = 'rgbcw';
    } else if (cleanName.includes('sensor')) {
      deviceType = 'sensor';
      if (cleanName.includes('motion')) variant = 'motion';
      else if (cleanName.includes('temperature')) variant = 'temperature';
      else if (cleanName.includes('humidity')) variant = 'humidity';
    }
  } else if (cleanName.includes('template')) {
    deviceType = 'template';
    if (cleanName.includes('switch')) variant = 'switch';
    else if (cleanName.includes('thermostat')) variant = 'thermostat';
    else if (cleanName.includes('sensor')) variant = 'sensor';
  }
  
  // Construire le nouveau nom
  const newName = `${vendor}_${deviceType}_${formFactor}_${variant}`;
  
  return newName;
}

// Corriger le nom d'un driver
async function fixDriverName(driver) {
  if (driver.oldName === driver.newName) {
    return false; // Pas de changement nécessaire
  }
  
  const oldPath = driver.fullPath;
  const newPath = path.join(path.dirname(oldPath), driver.newName);
  
  // Vérifier si le nouveau nom existe déjà
  if (fs.existsSync(newPath)) {
    console.log(`⚠️ Le nom ${driver.newName} existe déjà, impossible de renommer`);
    return false;
  }
  
  try {
    // Renommer le dossier
    fs.renameSync(oldPath, newPath);
    
    // Mettre à jour les chemins dans les fichiers
    await updateFilePaths(newPath, driver.oldName, driver.newName);
    
    return true;
  } catch (error) {
    console.log(`❌ Erreur lors du renommage: ${error.message}`);
    return false;
  }
}

// Mettre à jour les chemins dans les fichiers
async function updateFilePaths(driverPath, oldName, newName) {
  const filesToUpdate = ['driver.compose.json', 'metadata.json', 'README.md'];
  
  for (const file of filesToUpdate) {
    const filePath = path.join(driverPath, file);
    if (fs.existsSync(filePath)) {
      try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Remplacer l'ancien nom par le nouveau
        content = content.replace(new RegExp(oldName, 'g'), newName);
        
        // Mettre à jour les chemins d'images
        content = content.replace(
          /"small": "\/drivers\/[^"]+"/g,
          `"small": "/drivers/${newName}/assets/images/small.png"`
        );
        content = content.replace(
          /"large": "\/drivers\/[^"]+"/g,
          `"large": "/drivers/${newName}/assets/images/large.png"`
        );
        
        fs.writeFileSync(filePath, content);
      } catch (error) {
        console.log(`⚠️ Erreur mise à jour ${file}: ${error.message}`);
      }
    }
  }
}

// Générer le rapport
async function generateReport(drivers, corrected, skipped) {
  const report = {
    generated: new Date().toISOString(),
    action: 'Correction des noms SDK3+',
    summary: {
      totalDrivers: drivers.length,
      corrected: corrected,
      skipped: skipped
    },
    drivers: drivers.map(driver => ({
      oldName: driver.oldName,
      newName: driver.newName,
      path: driver.path,
      status: driver.oldName === driver.newName ? 'unchanged' : 'corrected'
    }))
  };
  
  const reportsDir = 'reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, 'driver-names-sdk3-correction-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`📄 Rapport sauvegardé: ${reportPath}`);
}

// Exécution
if (require.main === module) {
  fixDriverNamesSDK3().catch(console.error);
}

module.exports = { fixDriverNamesSDK3 };
