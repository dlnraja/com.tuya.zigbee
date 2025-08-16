#!/usr/bin/env node
'use strict';

'use strict';
/**
 * Script de rangement des dossiers .backup*
 * - Trouve tous les dossiers .backup* dans le projet
 * - Les déplace dans un dossier centralisé .backup-central/
 * - Préserve la structure et les contenus
 * - Met à jour les références si nécessaire
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const BACKUP_CENTRAL = path.join(ROOT, '.backup-central');

function findBackupFolders() {
    const backupFolders = [];
    const stack = [ROOT];
    
    while (stack.length) {
        const current = stack.pop();
        try {
            const stat = fs.statSync(current);
            if (stat.isDirectory()) {
                const entries = fs.readdirSync(current);
                for (const entry of entries) {
                    const fullPath = path.join(current, entry);
                    try {
                        const entryStat = fs.statSync(fullPath);
                        if (entryStat.isDirectory() && entry.startsWith('.backup')) {
                            backupFolders.push({
                                path: fullPath,
                                relative: path.relative(ROOT, fullPath),
                                name: entry
                            });
                        } else if (entryStat.isDirectory() && !entry.startsWith('.') && !['node_modules', '.git', '.homeybuild'].includes(entry)) {
                            stack.push(fullPath);
                        }
                    } catch (err) {
                        // Ignore les erreurs d'accès
                    }
                }
            }
        } catch (err) {
            // Ignore les erreurs d'accès
        }
    }
    
    return backupFolders;
}

function moveBackupFolder(backupInfo) {
    const { path: backupPath, relative, name } = backupInfo;
    const targetPath = path.join(BACKUP_CENTRAL, name);
    
    try {
        // Créer le dossier de destination
        fs.mkdirSync(BACKUP_CENTRAL, { recursive: true });
        
        // Si le dossier de destination existe déjà, le renommer avec un timestamp
        if (fs.existsSync(targetPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const newName = `${name}-${timestamp}`;
            const newTargetPath = path.join(BACKUP_CENTRAL, newName);
            console.log(`[cleanup] ${name} existe déjà → renommé en ${newName}`);
            fs.renameSync(backupPath, newTargetPath);
        } else {
            // Déplacer le dossier
            fs.renameSync(backupPath, targetPath);
            console.log(`[cleanup] déplacé: ${relative} → .backup-central/${name}`);
        }
        
        return true;
    } catch (err) {
        console.error(`[cleanup] erreur lors du déplacement de ${relative}:`, err.message);
        return false;
    }
}

function updateReferences() {
    // Mettre à jour les scripts qui référencent .backup
    const scriptsToUpdate = [
        'scripts/normalize-backup.js',
        'scripts/sources/local/restore-tmp-sources.js',
        'scripts/ingest-tuya-zips.js'
    ];
    
    for (const scriptPath of scriptsToUpdate) {
        const fullPath = path.join(ROOT, scriptPath);
        if (fs.existsSync(fullPath)) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                const originalContent = content;
                
                // Remplacer les références .backup par .backup-central
                content = content.replace(/\.backup\//g, '.backup-central/');
                content = content.replace(/\.backup['"]/g, '.backup-central"');
                content = content.replace(/\.backup\s/g, '.backup-central ');
                
                if (content !== originalContent) {
                    fs.writeFileSync(fullPath, content);
                    console.log(`[cleanup] références mises à jour dans ${scriptPath}`);
                }
            } catch (err) {
                console.error(`[cleanup] erreur lors de la mise à jour de ${scriptPath}:`, err.message);
            }
        }
    }
}

function createBackupIndex() {
    try {
        const backupFolders = fs.readdirSync(BACKUP_CENTRAL, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);
        
        const index = {
            timestamp: new Date().toISOString(),
            totalBackups: backupFolders.length,
            backups: backupFolders.map(name => ({
                name,
                path: `.backup-central/${name}`,
                type: name.includes('zips') ? 'zips' : 
                      name.includes('tmp') ? 'temporary' : 
                      name.includes('snapshot') ? 'snapshot' : 'general'
            }))
        };
        
        const indexPath = path.join(BACKUP_CENTRAL, 'index.json');
        fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
        console.log(`[cleanup] index créé: .backup-central/index.json`);
        
        return index;
    } catch (err) {
        console.error('[cleanup] erreur lors de la création de l\'index:', err.message);
        return null;
    }
}

function main() {
    console.log('🧹 === RANGEMENT DES DOSSIERS .backup* ===');
    console.log(`📁 Dossier central: ${path.relative(ROOT, BACKUP_CENTRAL)}`);
    console.log('');
    
    // Trouver tous les dossiers .backup*
    const backupFolders = findBackupFolders();
    
    if (backupFolders.length === 0) {
        console.log('✅ Aucun dossier .backup* trouvé à ranger');
        return;
    }
    
    console.log(`📋 Dossiers .backup* trouvés (${backupFolders.length}):`);
    backupFolders.forEach(folder => {
        console.log(`  - ${folder.relative}`);
    });
    console.log('');
    
    // Créer le dossier central
    fs.mkdirSync(BACKUP_CENTRAL, { recursive: true });
    
    // Déplacer tous les dossiers
    let moved = 0;
    for (const backupInfo of backupFolders) {
        if (moveBackupFolder(backupInfo)) {
            moved++;
        }
    }
    
    console.log('');
    console.log(`📊 Résumé: ${moved}/${backupFolders.length} dossiers déplacés`);
    
    // Mettre à jour les références
    console.log('');
    console.log('🔄 Mise à jour des références...');
    updateReferences();
    
    // Créer l'index
    console.log('');
    console.log('📝 Création de l\'index...');
    const index = createBackupIndex();
    
    // Afficher le résultat final
    console.log('');
    console.log('🎉 === RANGEMENT TERMINÉ ===');
    console.log(`📁 Dossier central: .backup-central/`);
    console.log(`📊 Total backups: ${index?.totalBackups || 0}`);
    console.log(`📄 Index: .backup-central/index.json`);
    
    // Commit des changements
    try {
        console.log('');
        console.log('💾 Commit des changements...');
        spawnSync('git', ['add', '.backup-central/'], { stdio: 'inherit', shell: true });
        spawnSync('git', ['add', 'scripts/'], { stdio: 'inherit', shell: true });
        spawnSync('git', ['commit', '-m', 'chore: centralisation des dossiers .backup*'], { stdio: 'inherit', shell: true });
        console.log('✅ Changements commités');
    } catch (err) {
        console.log('⚠️ Commit échoué (peut-être pas de repo Git)');
    }
}

if (require.main === module) {
    main();
}

module.exports = { findBackupFolders, moveBackupFolder, updateReferences, createBackupIndex };
