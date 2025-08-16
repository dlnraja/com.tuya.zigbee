#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🧹 NETTOYAGE FINAL COMPLET v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function finalCleanup() {
  try {
    const projectRoot = process.cwd();
    const backupsPath = path.join(projectRoot, 'backups');
    
    // Créer les catégories dans backups
    const categories = ['markdown', 'text', 'reports', 'development', 'project', 'structure', 'data', 'external', 'docs', 'misc', 'scripts'];
    for (const category of categories) {
      const categoryPath = path.join(backupsPath, category);
      await fs.ensureDir(categoryPath);
    }
    
    console.log('📄 Déplacement des fichiers restants...');
    
    // Fichiers à déplacer
    const filesToMove = [
      { name: 'CHANGELOG.md', category: 'markdown' },
      { name: 'FINAL_REPORT_3.3.0.md', category: 'markdown' },
      { name: 'push-to-github.ps1', category: 'scripts' },
      { name: 'restore-tuya.ps1', category: 'scripts' },
      { name: 'final-cleanup.ps1', category: 'scripts' }
    ];
    
    for (const fileInfo of filesToMove) {
      const sourcePath = path.join(projectRoot, fileInfo.name);
      if (await fs.pathExists(sourcePath)) {
        const targetPath = path.join(backupsPath, fileInfo.category, fileInfo.name);
        await fs.move(sourcePath, targetPath);
        console.log(`📁 Déplacé: ${fileInfo.name} -> backups/${fileInfo.category}/`);
      }
    }
    
    // Déplacer les dossiers restants
    const dirsToMove = [
      'reports',
      'docs',
      'dashboard'
    ];
    
    for (const dir of dirsToMove) {
      const sourcePath = path.join(projectRoot, dir);
      if (await fs.pathExists(sourcePath)) {
        const targetPath = path.join(backupsPath, dir);
        await fs.move(sourcePath, targetPath);
        console.log(`📁 Déplacé: ${dir} -> backups/`);
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

finalCleanup();
