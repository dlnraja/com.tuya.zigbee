#!/usr/bin/env node

console.log('🔍 ANALYSE SIMPLE DES ARCHIVES TUYA v3.4.1 Starting...');

const fs = require('fs-extra');
const path = require('path');

async function main() {
  try {
    console.log('🚀 DÉMARRAGE...');
    
    const projectRoot = process.cwd();
    const tmpDir = path.join(projectRoot, '.tmp_tuya_zip_work');
    const backupDir = path.join(projectRoot, '.backup', 'zips');
    
    console.log('📁 Vérification des dossiers...');
    console.log('Project Root:', projectRoot);
    console.log('Tmp Dir:', tmpDir);
    console.log('Backup Dir:', backupDir);
    
    // Vérification du dossier .tmp_tuya_zip_work
    if (await fs.pathExists(tmpDir)) {
      console.log('✅ Dossier .tmp_tuya_zip_work trouvé');
      const tmpItems = await fs.readdir(tmpDir);
      console.log('📦 Contenu:', tmpItems);
      
      for (const item of tmpItems) {
        const itemPath = path.join(tmpDir, item);
        const stats = await fs.stat(itemPath);
        console.log(`📂 ${item}: ${stats.isDirectory() ? 'Dossier' : 'Fichier'} - ${stats.size} bytes`);
      }
    } else {
      console.log('❌ Dossier .tmp_tuya_zip_work non trouvé');
    }
    
    // Vérification du dossier .backup/zips
    if (await fs.pathExists(backupDir)) {
      console.log('✅ Dossier .backup/zips trouvé');
      const backupItems = await fs.readdir(backupDir);
      console.log('📦 Contenu:', backupItems);
    } else {
      console.log('❌ Dossier .backup/zips non trouvé');
    }
    
    console.log('✅ ANALYSE SIMPLE TERMINÉE');
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    console.error(error.stack);
  }
}

main();
