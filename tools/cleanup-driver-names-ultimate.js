// !/usr/bin/env node

/**
 * Nettoyage ultime des noms de dossiers drivers
 * Suppression des patterns complexes et standardisation
 */

const fs = require('fs');
const path = require('path');

console.log('🧹 Nettoyage ultime des noms de dossiers...');

// Configuration
const DRIVERS_DIR = 'drivers';
const BACKUP_DIR = '.backup/cleanup-ultimate';
const REPORTS_DIR = 'reports';

// Fonction de nettoyage agressif
function cleanDriverNameUltimate(name) {
  let cleaned = name;
  
  // Suppression des timestamps et patterns de backup
  cleaned = cleaned.replace(/drivers-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_/g, '');
  
  // Suppression des patterns complexes
  cleaned = cleaned.replace(/_models_standard_default_models_standard_default/g, '');
  cleaned = cleaned.replace(/_models_standard_default/g, '');
  cleaned = cleaned.replace(/_standard_standard/g, '_standard');
  cleaned = cleaned.replace(/_generic_device_standard_standard/g, '_generic_standard');
  cleaned = cleaned.replace(/_template_standard_standard/g, '_template_standard');
  
  // Nettoyage des underscores multiples
  cleaned = cleaned.replace(/_+/g, '_');
  
  // Suppression des underscores en début/fin
  cleaned = cleaned.replace(/^_+|_+$/g, '');
  
  // Vérification et correction du format final
  const parts = cleaned.split('_').filter(p => p.length > 0);
  
  if (parts.length < 4) {
    // Ajout de segments manquants
    while (parts.length < 4) {
      if (parts.length === 1) {
        if (parts[0].startsWith('ts')) parts.push('device');
        else parts.push('generic');
      } else if (parts.length === 2) parts.push('standard');
      else parts.push('default');
    }
  } else if (parts.length > 4) {
    // Limitation à 4 segments
    parts.splice(4);
  }
  
  cleaned = parts.join('_');
  
  return cleaned;
}

// Fonction de sauvegarde
function createBackup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `cleanup-backup-${timestamp}`);
  
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

// Fonction de nettoyage des noms
function cleanupDriverNames() {
  const results = {
    cleaned: [],
    errors: [],
    backupPath: null
  };
  
  try {
    // Création de la sauvegarde
    results.backupPath = createBackup();
    
    // Nettoyage des noms
    for (const domain of ['tuya_zigbee', 'zigbee']) {
      const modelsPath = path.join(DRIVERS_DIR, domain, 'models');
      if (!fs.existsSync(modelsPath)) continue;
      
      const drivers = fs.readdirSync(modelsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
      
      for (const driver of drivers) {
        const oldPath = path.join(modelsPath, driver);
        const newName = cleanDriverNameUltimate(driver);
        const newPath = path.join(modelsPath, newName);
        
        if (driver !== newName) {
          try {
            // Vérification que le nouveau nom n'existe pas déjà
            let finalName = newName;
            let counter = 1;
            while (fs.existsSync(path.join(modelsPath, finalName))) {
              finalName = `${newName}_${counter}`;
              counter++;
            }
            
            // Renommage du dossier
            fs.renameSync(oldPath, path.join(modelsPath, finalName));
            
            // Mise à jour des références dans driver.compose.json
            const composePath = path.join(modelsPath, finalName, 'driver.compose.json');
            if (fs.existsSync(composePath)) {
              try {
                const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                // Mise à jour de l'ID du driver
                if (composeData.id) {
                  composeData.id = finalName;
                }
                
                // Mise à jour des chemins d'images
                if (composeData.images) {
                  if (composeData.images.small) {
                    composeData.images.small = `/drivers/${finalName}/assets/images/small.png`;
                  }
                  if (composeData.images.large) {
                    composeData.images.large = `/drivers/${finalName}/assets/images/large.png`;
                  }
                }
                
                fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
              } catch (error) {
                console.warn(`⚠️ Erreur lors de la mise à jour de ${composePath}:`, error.message);
              }
            }
            
            results.cleaned.push({
              old: driver,
              new: finalName,
              domain: domain
            });
            
            console.log(`✅ ${domain}/models/${driver} → ${finalName}`);
          } catch (error) {
            results.errors.push({
              driver: driver,
              domain: domain,
              error: error.message
            });
            console.error(`❌ Erreur lors du nettoyage de ${driver}:`, error.message);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage des noms:', error.message);
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
      cleaned: results.cleaned.length,
      errors: results.errors.length,
      backupPath: results.backupPath
    },
    details: {
      cleaned: results.cleaned,
      errors: results.errors
    }
  };
  
  // Sauvegarde du rapport
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
  
  const reportPath = path.join(REPORTS_DIR, `cleanup-ultimate-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Affichage du résumé
  console.log('\n📊 RÉSULTATS DU NETTOYAGE ULTIME:');
  console.log('=====================================');
  console.log(`✅ Noms nettoyés: ${results.cleaned.length}`);
  console.log(`❌ Erreurs: ${results.errors.length}`);
  console.log(`💾 Sauvegarde: ${results.backupPath}`);
  
  if (results.cleaned.length > 0) {
    console.log('\n✅ Noms nettoyés:');
    results.cleaned.forEach(item => {
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
function runUltimateCleanup() {
  console.log('🧹 Début du nettoyage ultime des noms de dossiers...');
  
  const results = cleanupDriverNames();
  const report = generateReport(results);
  
  console.log('\n🎯 Nettoyage ultime terminé !');
  
  return report;
}

// Exécution si appelé directement
if (require.main === module) {
  try {
    runUltimateCleanup();
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage ultime:', error.message);
    process.exit(1);
  }
}

module.exports = {
  runUltimateCleanup,
  cleanDriverNameUltimate,
  createBackup,
  cleanupDriverNames,
  generateReport
};
