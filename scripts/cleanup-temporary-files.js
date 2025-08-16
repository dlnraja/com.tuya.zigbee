#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

this.log('🧹 NETTOYAGE COMPLET DES FICHIERS TEMPORAIRES ET DOCS v3.4.1...');

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
    
    this.log('🧹 Nettoyage des fichiers temporaires...');
    
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
            this.log(`📁 Déplacé: ${tempFile} -> backups/`);
            movedCount++;
          } else {
            // Supprimer les fichiers vraiment temporaires
            await fs.remove(filePath);
            this.log(`🗑️ Supprimé: ${tempFile}`);
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
        this.log(`📁 Déplacé: ${tempDir} -> backups/`);
        movedCount++;
      }
    }
    
    this.log('📄 Recherche et rangement de tous les fichiers backup, txt et md...');
    
    // Rechercher et ranger tous les fichiers restants
    const remainingFiles = await findRemainingFiles(projectRoot);
    
    for (const fileInfo of remainingFiles) {
      const targetPath = path.join(projectRoot, 'backups', fileInfo.category, fileInfo.name);
      const targetDir = path.dirname(targetPath);
      
      await fs.ensureDir(targetDir);
      await fs.move(fileInfo.fullPath, targetPath);
      
      this.log(`📁 Déplacé: ${fileInfo.name} -> backups/${fileInfo.category}/`);
      movedCount++;
    }
    
    this.log('\n✅ NETTOYAGE COMPLET TERMINÉ !');
    this.log(`🗑️ Fichiers supprimés: ${cleanedCount}`);
    this.log(`📁 Fichiers déplacés: ${movedCount}`);
    
    // Mettre à jour le .gitignore
    await updateGitignore();
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
}

async function findRemainingFiles(projectRoot) {
  const filesToMove = [];
  const excludeDirs = ['node_modules', '.git', 'backups', '.homeybuild', 'release', 'drivers', 'scripts', 'assets', '.github', 'workflows'];
  
  async function scanDirectory(dirPath, relativePath = '') {
    try {
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        if (excludeDirs.includes(item)) continue;
        
        const fullPath = path.join(dirPath, item);
        const relativeItemPath = path.join(relativePath, item);
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
          await scanDirectory(fullPath, relativeItemPath);
        } else {
          // Vérifier si le fichier doit être déplacé
          if (shouldMoveFile(item)) {
            const category = getCategoryForFile(item);
            filesToMove.push({
              name: item,
              fullPath: fullPath,
              category: category,
              relativePath: relativeItemPath
            });
          }
        }
      }
    } catch (error) {
      // Ignorer les erreurs de lecture
    }
  }
  
  await scanDirectory(projectRoot);
  return filesToMove;
}

function shouldMoveFile(filename) {
  const patterns = [
    /backup/i,           // Contient "backup"
    /\.backup$/i,        // Se termine par .backup
    /\.txt$/i,           // Fichier .txt
    /\.md$/i,            // Fichier .md
    /report/i,           // Contient "report"
    /log/i,              // Contient "log"
    /temp/i,             // Contient "temp"
    /tmp/i,              // Contient "tmp"
    /cursor/i,           // Contient "cursor"
    /todo/i,             // Contient "todo"
    /queue/i,            // Contient "queue"
    /mega/i,             // Contient "mega"
    /version/i,          // Contient "version"
    /final/i,            // Contient "final"
    /structure/i,        // Contient "structure"
    /reorganization/i,   // Contient "reorganization"
    /merge/i,            // Contient "merge"
    /local/i,            // Contient "local"
    /external/i,         // Contient "external"
    /complete/i,         // Contient "complete"
    /changelog/i,        // Contient "changelog"
    /sources/i,          // Contient "sources"
    /faq/i,              // Contient "faq"
    /contributing/i      // Contient "contributing"
  ];
  
  return patterns.some(pattern => pattern.test(filename));
}

function getCategoryForFile(filename) {
  if (filename.includes('backup') || filename.includes('.backup')) return 'backups';
  if (filename.includes('report') || filename.includes('log')) return 'reports';
  if (filename.includes('cursor') || filename.includes('todo')) return 'development';
  if (filename.includes('mega') || filename.includes('version')) return 'project';
  if (filename.includes('structure') || filename.includes('reorganization')) return 'structure';
  if (filename.includes('merge') || filename.includes('local')) return 'data';
  if (filename.includes('external') || filename.includes('complete')) return 'external';
  if (filename.includes('changelog') || filename.includes('sources')) return 'docs';
  if (filename.includes('faq') || filename.includes('contributing')) return 'docs';
  
  // Par défaut, selon l'extension
  if (filename.endsWith('.md')) return 'markdown';
  if (filename.endsWith('.txt')) return 'text';
  if (filename.endsWith('.json')) return 'data';
  
  return 'misc';
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
      this.log('📝 .gitignore mis à jour');
    }
    
  } catch (error) {
    console.error('❌ Erreur mise à jour .gitignore:', error);
  }
}

cleanupTemporaryFiles();
