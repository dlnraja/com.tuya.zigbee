#!/usr/bin/env node
'use strict';

// !/usr/bin/env node

/**
 * Correction automatique des noms de dossiers pour respecter le format SDK3+
 * Format: <ts_model|vendor>_<device_type>_<form_factor>_<variant>
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Correction automatique des noms de dossiers SDK3+...');

// Configuration
const DRIVERS_DIR = 'drivers';
const BACKUP_DIR = '.backup/naming-correction-sdk3';
const REPORTS_DIR = 'reports';

// Mapping des noms incorrects vers les noms corrects
const NAMING_MAPPINGS = {
  // Patterns génériques
  'generic_': 'generic_device_',
  'template_': 'template_device_',
  '___generic___': '_generic_',
  '___templates___': '_template_',
  '_models_': '_',
  '_standard_default': '_standard',
  '_standard_default_models_standard_default': '_standard',
  
  // Corrections spécifiques
  'generic_sensor_humidity___generic___standard_default': 'generic_sensor_humidity_generic_standard',
  'generic_sensor_motion___generic___standard_default': 'generic_sensor_motion_generic_standard',
  'generic_sensor_temperature___generic___standard_default': 'generic_sensor_temperature_generic_standard',
  'generic_smart_plug_em___generic___standard_default': 'generic_smart_plug_em_generic_standard',
  'generic_wall_switch_1gang___generic___standard_default': 'generic_wall_switch_1gang_generic_standard',
  'generic_wall_switch_2gang___generic___standard_default': 'generic_wall_switch_2gang_generic_standard',
  'generic_wall_switch_3gang___generic___standard_default': 'generic_wall_switch_3gang_generic_standard',
  'template_tuya_dp_sensor_basic___templates___standard_default': 'template_tuya_dp_sensor_basic_template_standard',
  'template_tuya_dp_sensor_battery___templates___standard_default': 'template_tuya_dp_sensor_battery_template_standard',
  'template_tuya_dp_switch_multi___templates___standard_default': 'template_tuya_dp_switch_multi_template_standard'
};

// Fonction de nettoyage des noms
function cleanDriverName(name) {
  let cleaned = name;
  
  // Application des mappings
  for (const [pattern, replacement] of Object.entries(NAMING_MAPPINGS)) {
    cleaned = cleaned.replace(new RegExp(pattern, 'g'), replacement);
  }
  
  // Nettoyage des underscores multiples
  cleaned = cleaned.replace(/_+/g, '_');
  
  // Suppression des underscores en début/fin
  cleaned = cleaned.replace(/^_+|_+$/g, '');
  
  // Vérification du format final
  const pattern = /^[a-z0-9_]+_[a-z0-9_]+_[a-z0-9_]+_[a-z0-9_]+$/;
  
  if (!pattern.test(cleaned)) {
    // Si le format n'est toujours pas correct, on applique une correction générique
    const parts = cleaned.split('_').filter(p => p.length > 0);
    
    if (parts.length < 4) {
      // Ajout de segments manquants
      while (parts.length < 4) {
        if (parts.length === 1) parts.push('device');
        else if (parts.length === 2) parts.push('standard');
        else parts.push('default');
      }
    } else if (parts.length > 4) {
      // Limitation à 4 segments
      parts.splice(4);
    }
    
    cleaned = parts.join('_');
  }
  
  return cleaned;
}

// Fonction de sauvegarde
function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, \naming-backup-${timestamp}`);
  
  // Copie de la structure drivers
  fs.mkdirSync(backupPath, { recursive: true });
  
  for (const domain of ['tuya_zigbee', 'zigbee']) {
    const domainPath = path.join(DRIVERS_DIR, domain);
    if (fs.existsSync(domainPath)) {
      const domainBackupPath = path.join(backupPath, domain);
      fs.mkdirSync(domainBackupPath, { recursive: true });
      
      // Copie des dossiers models
      const modelsPath = path.join(domainPath, 'models');
      if (fs.existsSync(modelsPath)) {
        const modelsBackupPath = path.join(domainBackupPath, 'models');
        fs.mkdirSync(modelsBackupPath, { recursive: true });
        
        const models = fs.readdirSync(modelsPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name);
        
        for (const model of models) {
          const sourcePath = path.join(modelsPath, model);
          const destPath = path.join(modelsBackupPath, model);
          
          // Copie récursive
          copyDirectoryRecursive(sourcePath, destPath);
        }
      }
    }
  }
  
  console.log(`💾 Sauvegarde créée: ${backupPath}`);
  return backupPath;
}

// Fonction de copie récursive
function copyDirectoryRecursive(source, destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }
  
  const items = fs.readdirSync(source);
  
  for (const item of items) {
    const sourcePath = path.join(source, item);
    const destPath = path.join(destination, item);
    
    const stat = fs.statSync(sourcePath);
    
    if (stat.isDirectory()) {
      copyDirectoryRecursive(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// Fonction de correction des noms
function fixDriverNames() {
  const results = {
    corrected: [],
    errors: [],
    backupPath: null
  };
  
  try {
    // Création de la sauvegarde
    results.backupPath = createBackup();
    
    // Correction des noms
    for (const domain of ['tuya_zigbee', 'zigbee']) {
      const modelsPath = path.join(DRIVERS_DIR, domain, 'models');
      if (!fs.existsSync(modelsPath)) continue;
      
      const drivers = fs.readdirSync(modelsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const driver of drivers) {
        const oldPath = path.join(modelsPath, driver);
        const newName = cleanDriverName(driver);
        const newPath = path.join(modelsPath, newName);
        
        if (driver !== newName) {
          try {
            // Renommage du dossier
            fs.renameSync(oldPath, newPath);
            
            // Mise à jour des références dans driver.compose.json
            const composePath = path.join(newPath, 'driver.compose.json');
            if (fs.existsSync(composePath)) {
              try {
                const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                // Mise à jour de l'ID du driver
                if (composeData.id) {
                  composeData.id = newName;
                }
                
                // Mise à jour des chemins d'images
                if (composeData.images) {
                  if (composeData.images.small) {
                    composeData.images.small = `/drivers/${newName}/assets/images/small.png`;
                  }
                  if (composeData.images.large) {
                    composeData.images.large = `/drivers/${newName}/assets/images/large.png`;
                  }
                }
                
                fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
              } catch (error) {
                console.warn(`⚠️ Erreur lors de la mise à jour de ${composePath}:`, error.message);
              }
            }
            
            results.corrected.push({
              old: driver,
              new: newName,
              domain: domain
            });
            
            console.log(`✅ ${domain}/models/${driver} → ${newName}`);
          } catch (error) {
            results.errors.push({
              driver: driver,
              domain: domain,
              error: error.message
            });
            console.error(`❌ Erreur lors du renommage de ${driver}:`, error.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction des noms:', error.message);
    results.errors.push({
      driver: 'GLOBAL',
      domain: 'ALL',
      error: error.message
    });
  }
  
  return results;
}

// Fonction de génération du rapport
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      corrected: results.corrected.length,
      errors: results.errors.length,
      backupPath: results.backupPath
    },
    details: {
      corrected: results.corrected,
      errors: results.errors
    }
  };
  
  // Sauvegarde du rapport
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const reportPath = path.join(REPORTS_DIR, \naming-correction-sdk3-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Affichage du résumé
  console.log('\n📊 RÉSULTATS DE LA CORRECTION DES NOMS:');
  console.log('=====================================');
  console.log(`✅ Noms corrigés: ${results.corrected.length}`);
  console.log(`❌ Erreurs: ${results.errors.length}`);
  console.log(`💾 Sauvegarde: ${results.backupPath}`);
  
  if (results.corrected.length > 0) {
    console.log('\n✅ Noms corrigés:');
    results.corrected.forEach(item => {
      console.log(`  - ${item.domain}/models/${item.old} → ${item.new}`);
    });
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Erreurs:');
    results.errors.forEach(item => {
      console.log(`  - ${item.domain}/models/${item.driver}: ${item.error}`);
    });
  }
  
  console.log(`\n📄 Rapport complet sauvegardé: ${reportPath}`);
  
  return report;
}

// Fonction principale
function runNamingCorrection() {
  console.log('🔧 Début de la correction des noms de dossiers...');
  
  const results = fixDriverNames();
  const report = generateReport(results);
  
  console.log('\n🎯 Correction des noms terminée !');
  
  return report;
}

// Exécution si appelé directement
if (require.main === module) {
  try {
    runNamingCorrection();
  } catch (error) {
    console.error('❌ Erreur lors de la correction des noms:', error.message);
    process.exit(1);
  }
}

module.exports = {
  runNamingCorrection,
  cleanDriverName,
  createBackup,
  fixDriverNames,
  generateReport
};
