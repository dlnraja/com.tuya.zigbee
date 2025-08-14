#!/usr/bin/env node

console.log('🧹 NETTOYAGE DES FICHIERS TEMPORAIRES v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function cleanupTemporaryFiles() {
  try {
    const projectRoot = process.cwd();
    
    // Fichiers temporaires à nettoyer
    const tempFiles = [
      'app.js.backup',
      'package.json.backup.1754945944470',
      'package.json.backup.1754942380797',
      'package.json.backup.1754941800950',
      'CLEANUP_REPORT_2025-08-10_13-01-58.txt',
      'CLEANUP_REPORT_2025-08-10_13-01-21.txt',
      'TMP_SOURCES_ANALYSIS.json',
      'reorganize-map.json',
      'generated-drivers-list.json',
      'drivers-index.json',
      'drivers-rename-map.json',
      'FINAL_RECOVERY_REPORT_v3.3.0.md',
      'VERIFY_REPORT.md',
      'STRUCTURE_VALIDATION_REPORT.md',
      'REORGANIZATION_REPORT.md',
      'MERGE_ENRICHMENT_REPORT.md',
      'LOCAL_ENRICHMENT_REPORT.md',
      'EXTERNAL_ENRICHMENT_REPORT.md',
      'COMPLETE_ENRICHMENT_REPORT.md',
      'CHANGELOG_AUTO.md',
      'cursor_todo_queue.md',
      'QUEUE_CURSOR_COMPLETE_ANALYSEE.md',
      'QUEUE_CURSOR_COMPLETE.md',
      'TODOS_RECUPERES.md',
      'MEGA_PROMPT_v3.4.0.md',
      'VERSION_3.4.0_REPORT.md',
      'MEGA_PIPELINE_GUIDE.md',
      'MEGA-COMMANDS.md',
      'SCRIPTS_README.md',
      'SOURCES.md',
      'FAQ.md',
      'CONTRIBUTING.md'
    ];
    
    console.log('🧹 Nettoyage des fichiers temporaires...');
    
    let cleanedCount = 0;
    let movedCount = 0;
    
    for (const tempFile of tempFiles) {
      const filePath = path.join(projectRoot, tempFile);
      
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          // Déplacer vers backups si c'est un fichier important
          if (tempFile.includes('.json') || tempFile.includes('.md') || tempFile.includes('.txt')) {
            const targetPath = path.join(projectRoot, 'backups', tempFile);
            await fs.move(filePath, targetPath);
            console.log(`📁 Déplacé: ${tempFile} -> backups/`);
            movedCount++;
          } else {
            // Supprimer les fichiers vraiment temporaires
            await fs.remove(filePath);
            console.log(`🗑️ Supprimé: ${tempFile}`);
            cleanedCount++;
          }
        }
      }
    }
    
    // Nettoyer les dossiers temporaires restants
    const tempDirs = [
      '.external_sources',
      'queue',
      'refs'
    ];
    
    for (const tempDir of tempDirs) {
      const dirPath = path.join(projectRoot, tempDir);
      
      if (await fs.pathExists(dirPath)) {
        const targetPath = path.join(projectRoot, 'backups', tempDir);
        await fs.move(dirPath, targetPath);
        console.log(`📁 Déplacé: ${tempDir} -> backups/`);
        movedCount++;
      }
    }
    
    console.log('\n✅ NETTOYAGE TERMINÉ !');
    console.log(`🗑️ Fichiers supprimés: ${cleanedCount}`);
    console.log(`📁 Fichiers déplacés: ${movedCount}`);
    
    // Mettre à jour le .gitignore
    await updateGitignore();
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
}

async function updateGitignore() {
  try {
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    
    // Ajouter les exclusions pour les fichiers temporaires
    const additionalExclusions = `
# Fichiers temporaires et de développement (NE PAS PUSHER)
*.backup
*.tmp
*.bak
*.log
*.zip
*.tar.gz
*.json.backup
*.md.backup
*.txt.backup
cursor_*.md
TODO_*.md
PROGRESS.md
FINAL_*.md
VERIFY_*.md
STRUCTURE_*.md
REORGANIZATION_*.md
MERGE_*.md
LOCAL_*.md
EXTERNAL_*.md
COMPLETE_*.md
CHANGELOG_*.md
QUEUE_*.md
TODOS_*.md
MEGA_*.md
VERSION_*.md
SOURCES.md
FAQ.md
CONTRIBUTING.md
SCRIPTS_*.md
`;
    
    const currentContent = await fs.readFile(gitignorePath, 'utf8');
    
    if (!currentContent.includes('# Fichiers temporaires et de développement')) {
      await fs.writeFile(gitignorePath, currentContent + additionalExclusions);
      console.log('📝 .gitignore mis à jour');
    }
    
  } catch (error) {
    console.error('❌ Erreur mise à jour .gitignore:', error);
  }
}

cleanupTemporaryFiles();
