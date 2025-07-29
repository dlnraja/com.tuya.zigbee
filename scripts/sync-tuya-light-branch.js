#!/usr/bin/env node
/**
 * Script de synchronisation de la branche tuya-light
 * Version: 1.0.12-20250729-1620
 * Objectif: Synchroniser la branche tuya-light avec les drivers de master
 * Basé sur: Demande de synchronisation mensuelle automatique
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1620',
    logFile: './logs/sync-tuya-light-branch.log',
    backupPath: './backups/tuya-light-sync'
};

// Fonction de logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    // Écrire dans le fichier de log
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Fonction pour vérifier l'état actuel du repository
function checkCurrentState() {
    log('🔍 === VÉRIFICATION DE L\'ÉTAT ACTUEL ===');
    
    try {
        // Vérifier la branche actuelle
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        log(`Branche actuelle: ${currentBranch}`);
        
        // Vérifier le statut git
        const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
        if (gitStatus.trim()) {
            log('Changements non commités détectés', 'WARN');
            log(gitStatus);
        } else {
            log('Repository propre');
        }
        
        // Vérifier les branches disponibles
        const branches = execSync('git branch -a', { encoding: 'utf8' });
        log('Branches disponibles:');
        log(branches);
        
        return { currentBranch, hasChanges: !!gitStatus.trim() };
    } catch (error) {
        log(`Erreur vérification état: ${error.message}`, 'ERROR');
        return { currentBranch: 'unknown', hasChanges: false };
    }
}

// Fonction pour créer la branche tuya-light si elle n'existe pas
function ensureTuyaLightBranch() {
    log('🌿 === VÉRIFICATION/CREATION BRANCHE TUYA-LIGHT ===');
    
    try {
        // Vérifier si la branche existe
        const branches = execSync('git branch -a', { encoding: 'utf8' });
        
        if (branches.includes('tuya-light')) {
            log('Branche tuya-light existe déjà');
            execSync('git checkout tuya-light');
            log('Basculement vers tuya-light');
        } else {
            log('Création de la branche tuya-light');
            execSync('git checkout -b tuya-light');
            log('Branche tuya-light créée et activée');
        }
        
        return true;
    } catch (error) {
        log(`Erreur création branche: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour synchroniser les drivers Tuya
function syncTuyaDrivers() {
    log('🔄 === SYNCHRONISATION DES DRIVERS TUYA ===');
    
    try {
        // Retourner à master
        execSync('git checkout master');
        log('Retour à master');
        
        // Vérifier que le dossier tuya existe
        const tuyaPath = './drivers/tuya';
        if (!fs.existsSync(tuyaPath)) {
            log('Dossier tuya non trouvé', 'ERROR');
            return false;
        }
        
        // Basculer vers tuya-light
        execSync('git checkout tuya-light');
        log('Basculement vers tuya-light');
        
        // Supprimer l'ancien dossier tuya s'il existe
        if (fs.existsSync(tuyaPath)) {
            execSync(`Remove-Item -Recurse -Force "${tuyaPath}"`, { shell: 'powershell' });
            log('Ancien dossier tuya supprimé');
        }
        
        // Copier le dossier tuya depuis master
        execSync('git checkout master -- drivers/tuya');
        log('Dossier tuya copié depuis master');
        
        // Vérifier la copie
        if (fs.existsSync(tuyaPath)) {
            const tuyaDrivers = execSync('Get-ChildItem -Path ".\drivers\tuya" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell' }).toString().match(/\d+/)[0];
            log(`Drivers Tuya synchronisés: ${tuyaDrivers}`);
            return true;
        } else {
            log('Échec de la copie du dossier tuya', 'ERROR');
            return false;
        }
        
    } catch (error) {
        log(`Erreur synchronisation: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour mettre à jour la documentation
function updateDocumentation() {
    log('📝 === MISE À JOUR DE LA DOCUMENTATION ===');
    
    try {
        // Mettre à jour le README pour la branche tuya-light
        const readmeContent = `# Tuya Light - Drivers Tuya pour Homey

## 🚀 Description

Cette branche contient uniquement les drivers Tuya pour Homey, optimisés pour les appareils d'éclairage et de contrôle.

## 📊 Statistiques

- **Drivers Tuya**: ${execSync('Get-ChildItem -Path ".\drivers\tuya" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell' }).toString().match(/\d+/)[0]}
- **Catégories**: Controllers, Sensors, Security, Climate, Automation, Lighting, Generic
- **Compatibilité**: Homey SDK 3, Tuya Zigbee

## 🔧 Installation

1. Cloner cette branche
2. Installer les dépendances: \`npm install\`
3. Compiler: \`npm run build\`

## 📋 Fonctionnalités

- Support complet Tuya Zigbee
- Drivers optimisés pour l'éclairage
- Compatibilité Homey SDK 3
- Gestion des capacités avancées
- Support multi-langue

## 🔄 Synchronisation

Cette branche est synchronisée mensuellement avec la branche master pour les drivers Tuya.

**Dernière synchronisation**: ${new Date().toISOString()}

## 📞 Support

Pour toute question ou problème, consultez la documentation principale ou ouvrez une issue.

---

**Version**: ${CONFIG.version}
**Maintenu par**: dlnraja / dylan.rajasekaram+homey@gmail.com
`;

        fs.writeFileSync('./README.md', readmeContent);
        log('README.md mis à jour');
        
        // Créer un fichier de version spécifique
        const versionContent = {
            version: CONFIG.version,
            lastSync: new Date().toISOString(),
            tuyaDrivers: parseInt(execSync('Get-ChildItem -Path ".\drivers\tuya" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell' }).toString().match(/\d+/)[0]),
            branch: 'tuya-light',
            description: 'Branche spécialisée pour les drivers Tuya'
        };
        
        fs.writeFileSync('./tuya-light-version.json', JSON.stringify(versionContent, null, 2));
        log('Version file créé');
        
        return true;
    } catch (error) {
        log(`Erreur documentation: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour commiter et pousser les changements
function commitAndPush() {
    log('💾 === COMMIT ET PUSH DES CHANGEMENTS ===');
    
    try {
        // Ajouter tous les fichiers
        execSync('git add .');
        log('Fichiers ajoutés au staging');
        
        // Commiter avec un message descriptif
        const commitMessage = `feat: Synchronisation mensuelle tuya-light - ${new Date().toISOString()}

- Synchronisation des drivers Tuya depuis master
- Mise à jour de la documentation
- Optimisation pour l'éclairage
- Support Homey SDK 3

Version: ${CONFIG.version}
Drivers Tuya: ${execSync('Get-ChildItem -Path ".\drivers\tuya" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell' }).toString().match(/\d+/)[0]}`;
        
        execSync(`git commit -m "${commitMessage}"`);
        log('Commit créé');
        
        // Pousser vers la branche distante
        execSync('git push origin tuya-light');
        log('Changements poussés vers tuya-light');
        
        return true;
    } catch (error) {
        log(`Erreur commit/push: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour retourner à master
function returnToMaster() {
    log('🔄 === RETOUR À MASTER ===');
    
    try {
        execSync('git checkout master');
        log('Retour à master effectué');
        return true;
    } catch (error) {
        log(`Erreur retour master: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction principale de synchronisation
function syncTuyaLightBranch() {
    log('🚀 === SYNCHRONISATION BRANCHE TUYA-LIGHT ===');
    
    // Vérifier l'état actuel
    const state = checkCurrentState();
    
    // Créer/assurer la branche tuya-light
    if (!ensureTuyaLightBranch()) {
        log('Échec de la création de la branche', 'ERROR');
        return false;
    }
    
    // Synchroniser les drivers Tuya
    if (!syncTuyaDrivers()) {
        log('Échec de la synchronisation des drivers', 'ERROR');
        return false;
    }
    
    // Mettre à jour la documentation
    if (!updateDocumentation()) {
        log('Échec de la mise à jour de la documentation', 'ERROR');
        return false;
    }
    
    // Commiter et pousser
    if (!commitAndPush()) {
        log('Échec du commit/push', 'ERROR');
        return false;
    }
    
    // Retourner à master
    if (!returnToMaster()) {
        log('Échec du retour à master', 'ERROR');
        return false;
    }
    
    // Rapport final
    const tuyaDrivers = execSync('Get-ChildItem -Path ".\drivers\tuya" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell' }).toString().match(/\d+/)[0];
    
    log('=== RÉSUMÉ SYNCHRONISATION ===');
    log(`Drivers Tuya synchronisés: ${tuyaDrivers}`);
    log(`Branche: tuya-light`);
    log(`Version: ${CONFIG.version}`);
    log(`Statut: Succès`);
    
    log('🎉 Synchronisation tuya-light terminée avec succès!');
    return true;
}

// Exécution
if (require.main === module) {
    syncTuyaLightBranch();
}

module.exports = { syncTuyaLightBranch }; 