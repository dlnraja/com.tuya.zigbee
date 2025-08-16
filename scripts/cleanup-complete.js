#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

console.log('🧹 NETTOYAGE COMPLET DES FICHIERS TEMPORAIRES ET DOCS v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function cleanupComplete() {
  try {
    const projectRoot = process.cwd();
    
    console.log('📄 Recherche et rangement de tous les fichiers backup, txt et md...');
    
    // Rechercher et ranger tous les fichiers
    const filesToMove = await findFilesToMove(projectRoot);
    
    for (const fileInfo of filesToMove) {
      const targetPath = path.join(projectRoot, 'backups', fileInfo.category, fileInfo.name);
      const targetDir = path.dirname(targetPath);
      
      await fs.ensureDir(targetDir);
      await fs.move(fileInfo.fullPath, targetPath);
      
      console.log(`📁 Déplacé: ${fileInfo.name} -> backups/${fileInfo.category}/`);
    }
    
    console.log('\n✅ NETTOYAGE COMPLET TERMINÉ !');
    console.log(`📁 Total fichiers déplacés: ${filesToMove.length}`);
    
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
  }
}

async function findFilesToMove(projectRoot) {
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

cleanupComplete();
