#!/usr/bin/env node

console.log('🧹 NETTOYAGE FINAL SIMPLE v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function cleanupFinal() {
  try {
    const projectRoot = process.cwd();
    const backupsPath = path.join(projectRoot, 'backups');
    
    console.log('📁 Déplacement des fichiers restants...');
    
    // Fichiers à déplacer
    const filesToMove = [
      'CHANGELOG.md',
      'FINAL_REPORT_3.3.0.md',
      'README.md',
      'app.js'
    ];

    for (const fileName of filesToMove) {
      const sourcePath = path.join(projectRoot, fileName);
      if (await fs.pathExists(sourcePath)) {
        const targetPath = path.join(backupsPath, 'markdown', fileName);
        await fs.move(sourcePath, targetPath);
        console.log(`📁 Déplacé: ${fileName} -> backups/markdown/`);
      }
    }

    // Dossiers à déplacer
    const dirsToMove = ['reports', 'docs', 'dashboard', 'tools', 'lib', 'tests', 'release', 'workflows'];
    
    for (const dirName of dirsToMove) {
      const sourcePath = path.join(projectRoot, dirName);
      if (await fs.pathExists(sourcePath)) {
        const targetPath = path.join(backupsPath, dirName);
        await fs.move(sourcePath, targetPath);
        console.log(`📁 Déplacé: ${dirName} -> backups/`);
      }
    }

    // Supprimer les scripts PowerShell
    const psScripts = [
      'push-final.ps1',
      'cleanup-direct.ps1',
      'final-cleanup.ps1',
      'push-to-github.ps1',
      'restore-tuya.ps1',
      'final-reorganization-push.ps1'
    ];

    for (const psScript of psScripts) {
      const scriptPath = path.join(projectRoot, psScript);
      if (await fs.pathExists(scriptPath)) {
        await fs.remove(scriptPath);
        console.log(`🗑️ Supprimé: ${psScript}`);
      }
    }

    console.log('✅ NETTOYAGE FINAL TERMINÉ !');
    
    // Afficher la structure finale
    console.log('\n🔍 Structure finale:');
    const items = await fs.readdir(projectRoot);
    for (const item of items) {
      const itemPath = path.join(projectRoot, item);
      const stats = await fs.stat(itemPath);
      
      if (stats.isDirectory()) {
        try {
          const files = await fs.readdir(itemPath);
          console.log(`  📁 ${item}: ${files.length} éléments`);
        } catch (error) {
          console.log(`  📁 ${item}: Erreur lecture`);
        }
      } else {
        console.log(`  📄 ${item}`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur nettoyage final:', error);
  }
}

cleanupFinal();
