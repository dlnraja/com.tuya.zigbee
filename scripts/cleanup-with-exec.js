#!/usr/bin/env node

console.log('🧹 NETTOYAGE AVEC EXEC v3.4.1...');

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

async function cleanupWithExec() {
  try {
    const projectRoot = process.cwd();
    const backupsPath = path.join(projectRoot, 'backups');
    
    // Créer le dossier backups s'il n'existe pas
    await fs.ensureDir(backupsPath);
    await fs.ensureDir(path.join(backupsPath, 'markdown'));
    
    console.log('📁 Déplacement des fichiers avec exec...');
    
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
        
        try {
          // Utiliser execSync pour déplacer
          if (process.platform === 'win32') {
            execSync(`move "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' });
          } else {
            execSync(`mv "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' });
          }
          console.log(`📁 Déplacé: ${fileName} -> backups/markdown/`);
        } catch (error) {
          console.log(`⚠️ Erreur déplacement ${fileName}:`, error.message);
        }
      }
    }

    // Dossiers à déplacer
    const dirsToMove = ['reports', 'docs', 'dashboard', 'tools', 'lib', 'tests', 'release', 'workflows'];
    
    for (const dirName of dirsToMove) {
      const sourcePath = path.join(projectRoot, dirName);
      if (await fs.pathExists(sourcePath)) {
        const targetPath = path.join(backupsPath, dirName);
        
        try {
          if (process.platform === 'win32') {
            execSync(`move "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' });
          } else {
            execSync(`mv "${sourcePath}" "${targetPath}"`, { stdio: 'inherit' });
          }
          console.log(`📁 Déplacé: ${dirName} -> backups/`);
        } catch (error) {
          console.log(`⚠️ Erreur déplacement ${dirName}:`, error.message);
        }
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
        try {
          if (process.platform === 'win32') {
            execSync(`del "${scriptPath}"`, { stdio: 'inherit' });
          } else {
            execSync(`rm "${scriptPath}"`, { stdio: 'inherit' });
          }
          console.log(`🗑️ Supprimé: ${psScript}`);
        } catch (error) {
          console.log(`⚠️ Erreur suppression ${psScript}:`, error.message);
        }
      }
    }

    console.log('✅ NETTOYAGE AVEC EXEC TERMINÉ !');
    
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
    console.error('❌ Erreur nettoyage avec exec:', error);
  }
}

cleanupWithExec();
