#!/usr/bin/env node

console.log('🔄 RÉORGANISATION COMPLÈTE DES BACKUPS ET DOCS v3.4.1...');

const fs = require('fs-extra');
const path = require('path');

async function reorganizeBackupStructure() {
  try {
    const projectRoot = process.cwd();
    
    // Dossiers de backup à déplacer
    const backupDirs = [
      '.backup',
      '.backup-central',
      '.ai_enrichment',
      '.enrichment_complete',
      '.local_databases',
      '.dashboard',
      '.tmp_tuya_zip_work',
      'tmp-ingest',
      'backup_20251008_140924'
    ];
    
    // Créer le dossier central de backup
    const centralBackupPath = path.join(projectRoot, 'backups');
    await fs.ensureDir(centralBackupPath);
    
    console.log('📁 Réorganisation des dossiers de backup...');
    
    for (const backupDir of backupDirs) {
      const sourcePath = path.join(projectRoot, backupDir);
      const targetPath = path.join(centralBackupPath, backupDir);
      
      if (await fs.pathExists(sourcePath)) {
        console.log(`🔄 Déplacement: ${backupDir} -> backups/${backupDir}`);
        
        // Déplacer le dossier
        await fs.move(sourcePath, targetPath);
        console.log(`✅ ${backupDir} déplacé avec succès`);
      } else {
        console.log(`⚠️ Dossier non trouvé: ${backupDir}`);
      }
    }
    
    console.log('📄 Recherche et rangement des fichiers backup, txt et md...');
    
    // Rechercher tous les fichiers à ranger
    const filesToMove = await findFilesToMove(projectRoot);
    
    for (const fileInfo of filesToMove) {
      const targetPath = path.join(centralBackupPath, fileInfo.category, fileInfo.name);
      const targetDir = path.dirname(targetPath);
      
      await fs.ensureDir(targetDir);
      await fs.move(fileInfo.fullPath, targetPath);
      
      console.log(`📁 Déplacé: ${fileInfo.name} -> backups/${fileInfo.category}/`);
    }
    
    // Créer un fichier .gitignore pour les backups
    const gitignorePath = path.join(centralBackupPath, '.gitignore');
    const gitignoreContent = `# Dossiers de backup - Ne pas pousser vers GitHub
*
!.gitignore
!README.md`;
    
    await fs.writeFile(gitignorePath, gitignoreContent);
    
    // Créer un README pour les backups
    const readmePath = path.join(centralBackupPath, 'README.md');
    const readmeContent = `# 📁 Dossiers de Backup et Documentation

Ce dossier contient tous les dossiers de backup, fichiers temporaires et documentation du projet.

## 🚫 Ne pas pousser vers GitHub

Ces dossiers et fichiers contiennent des données temporaires, de backup et de développement qui ne doivent pas être partagées.

## 📂 Contenu

### **📁 Dossiers de Backup**
- \`.backup\` - Sauvegardes des drivers
- \`.backup-central\` - Sauvegardes centralisées
- \`.ai_enrichment\` - Données d'enrichissement IA
- \`.enrichment_complete\` - Données d'enrichissement complètes
- \`.local_databases\` - Bases de données locales
- \`.dashboard\` - Données du dashboard
- \`.tmp_tuya_zip_work\` - Travail temporaire sur les ZIPs Tuya
- \`tmp-ingest\` - Données d'ingestion temporaires
- \`backup_20251008_140924\` - Sauvegarde du 08/10/2025

### **📄 Fichiers de Documentation**
- \`docs/\` - Documentation technique
- \`reports/\` - Rapports de validation
- \`*.md\` - Fichiers Markdown
- \`*.txt\` - Fichiers texte
- \`*.json.backup\` - Fichiers JSON de backup
- \`*.md.backup\` - Fichiers Markdown de backup

## 🔧 Utilisation

Ces dossiers et fichiers sont utilisés pour :
- Sauvegarder l'état du projet
- Stocker des données temporaires
- Conserver l'historique des modifications
- Travailler sur des fonctionnalités expérimentales
- Documenter le développement

---

**📅 Version** : 3.4.1  
**👤 Auteur** : dlnraja  
**✅ Statut** : BACKUP ET DOCS RÉORGANISÉS
`;
    
    await fs.writeFile(readmePath, readmeContent);
    
    console.log('✅ RÉORGANISATION TERMINÉE !');
    console.log(`📁 Tous les dossiers et fichiers sont maintenant dans backups/`);
    
  } catch (error) {
    console.error('❌ Erreur réorganisation:', error);
  }
}

async function findFilesToMove(projectRoot) {
  const filesToMove = [];
  const excludeDirs = ['node_modules', '.git', 'backups', '.homeybuild', 'release'];
  
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

reorganizeBackupStructure();
