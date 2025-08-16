#!/usr/bin/env node
'use strict';

// !/usr/bin/env node

/**
 * Script de restauration des sources temporaires
 * Restaure les fichiers zip depuis .backup/zips vers .tmp_tuya_zip_work
 */

const fs = require('fs');
const path = require('path');

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function restoreTmpSources() {
  log('🔄 Restauration des sources temporaires...');
  
  const backupDir = '.backup/zips';
  const tmpDir = '.tmp_tuya_zip_work';
  
  try {
    // Vérifier que le dossier de backup existe
    if (!fs.existsSync(backupDir)) {
      log(`⚠️  Dossier de backup non trouvé: ${backupDir}`);
      return { success: false, error: 'Backup directory not found' };
    }
    
    // Créer le dossier temporaire s'il n'existe pas
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
      log(`📁 Dossier temporaire créé: ${tmpDir}`);
    }
    
    // Lister les fichiers zip dans le backup
    const zipFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.zip'));
    
    if (zipFiles.length === 0) {
      log('📦 Aucun fichier zip trouvé dans le backup');
      return { success: true, restored: 0 };
    }
    
    log(`📦 ${zipFiles.length} fichiers zip trouvés dans ${backupDir}`);
    
    let restoredCount = 0;
    let errorCount = 0;
    
    // Copier chaque fichier zip
    for (const zipFile of zipFiles) {
      try {
        const srcPath = path.join(backupDir, zipFile);
        const destPath = path.join(tmpDir, zipFile);
        
        // Vérifier si le fichier existe déjà dans tmp
        if (fs.existsSync(destPath)) {
          log(`📋 Déjà présent: ${zipFile}`);
          restoredCount++;
          continue;
        }
        
        // Copier le fichier
        fs.copyFileSync(srcPath, destPath);
        log(`📋 Restauré: ${zipFile}`);
        restoredCount++;
        
      } catch (error) {
        log(`❌ Erreur restauration ${zipFile}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Générer un rapport
    const report = {
      timestamp: new Date().toISOString(),
      action: 'restore-tmp-sources',
      backupDirectory: backupDir,
      tmpDirectory: tmpDir,
      totalFiles: zipFiles.length,
      restoredFiles: restoredCount,
      errorFiles: errorCount,
      success: errorCount === 0
    };
    
    // Sauvegarder le rapport
    const reportPath = 'reports/restore-tmp-sources-report.json';
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`📊 Rapport généré: ${reportPath}`);
    log(`✅ Restauration terminée: ${restoredCount}/${zipFiles.length} fichiers restaurés`);
    
    if (errorCount > 0) {
      log(`⚠️  ${errorCount} erreurs rencontrées`);
    }
    
    return { success: true, restored: restoredCount, errors: errorCount };
    
  } catch (error) {
    log(`💥 Erreur fatale: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function main() {
  log('🚀 Début de la restauration des sources temporaires...');
  
  const result = restoreTmpSources();
  
  if (result.success) {
    log('🎉 Restauration des sources temporaires terminée avec succès !');
    process.exit(0);
  } else {
    log(`❌ Échec de la restauration: ${result.error}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  restoreTmpSources,
  main
};
