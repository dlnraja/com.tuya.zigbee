#!/usr/bin/env node

console.log('🔄 RÉORGANISATION DE LA STRUCTURE DES BACKUPS v3.4.1...');

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
    
    // Créer un fichier .gitignore pour les backups
    const gitignorePath = path.join(centralBackupPath, '.gitignore');
    const gitignoreContent = `# Dossiers de backup - Ne pas pousser vers GitHub
*
!.gitignore
!README.md`;
    
    await fs.writeFile(gitignorePath, gitignoreContent);
    
    // Créer un README pour les backups
    const readmePath = path.join(centralBackupPath, 'README.md');
    const readmeContent = `# 📁 Dossiers de Backup

Ce dossier contient tous les dossiers de backup et temporaires du projet.

## 🚫 Ne pas pousser vers GitHub

Ces dossiers contiennent des données temporaires et de backup qui ne doivent pas être partagées.

## 📂 Contenu

- \`.backup\` - Sauvegardes des drivers
- \`.backup-central\` - Sauvegardes centralisées
- \`.ai_enrichment\` - Données d'enrichissement IA
- \`.enrichment_complete\` - Données d'enrichissement complètes
- \`.local_databases\` - Bases de données locales
- \`.dashboard\` - Données du dashboard
- \`.tmp_tuya_zip_work\` - Travail temporaire sur les ZIPs Tuya
- \`tmp-ingest\` - Données d'ingestion temporaires
- \`backup_20251008_140924\` - Sauvegarde du 08/10/2025

## 🔧 Utilisation

Ces dossiers sont utilisés pour :
- Sauvegarder l'état du projet
- Stocker des données temporaires
- Conserver l'historique des modifications
- Travailler sur des fonctionnalités expérimentales

---

**📅 Version** : 3.4.1  
**👤 Auteur** : dlnraja  
**✅ Statut** : BACKUP RÉORGANISÉ
`;
    
    await fs.writeFile(readmePath, readmeContent);
    
    console.log('✅ RÉORGANISATION TERMINÉE !');
    console.log('📁 Tous les dossiers de backup sont maintenant dans backups/');
    
  } catch (error) {
    console.error('❌ Erreur réorganisation:', error);
  }
}

reorganizeBackupStructure();
