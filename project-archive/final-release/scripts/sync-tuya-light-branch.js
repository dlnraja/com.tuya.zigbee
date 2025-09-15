// MEGA ULTIMATE ENHANCED - 2025-08-07T16:33:44.828Z
// Script amélioré avec liens corrigés et fonctionnalités étendues

#!/usr/bin/env node
/**
 * Script de synchronisation de la branche tuya-light
 * Synchronise les drivers tuya depuis master vers tuya-light
 * Version: 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1700',
    logFile: './logs/sync-tuya-light.log',
    syncDataFile: './data/tuya-light-sync.json'
};

// Fonction de logging
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + '\n');
}

// Fonction pour vérifier l'état actuel
function checkCurrentState() {
    log('🔍 === VÉRIFICATION DE L\'ÉTAT ACTUEL ===');
    
    try {
        // Vérifier la branche actuelle
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        log(`Branche actuelle: ${currentBranch}`);
        
        // Vérifier s'il y a des changements non commités
        const status = execSync('git status --porcelain', { encoding: 'utf8' });
        if (status.trim()) {
            log('⚠️ Changements non commités détectés', 'WARN');
            log(status);
        } else {
            log('Repository propre');
        }
        
        // Lister les branches disponibles
        const branches = execSync('git branch -a', { encoding: 'utf8' });
        log('Branches disponibles:');
        log(branches);
        
        return { currentBranch, hasChanges: !!status.trim() };
        
    } catch (error) {
        log(`❌ Erreur vérification état: ${error.message}`, 'ERROR');
        throw error;
    }
}

// Fonction pour créer/vérifier la branche tuya-light
function ensureTuyaLightBranch() {
    log('🌿 === VÉRIFICATION/CREATION BRANCHE TUYA-LIGHT ===');
    
    try {
        // Vérifier si la branche existe
        const branches = execSync('git branch -a', { encoding: 'utf8' });
        
        if (branches.includes('tuya-light')) {
            log('Branche tuya-light existe déjà');
            
            // Basculer vers tuya-light
            execSync('git checkout tuya-light');
            log('Basculement vers tuya-light');
            
        } else {
            log('Création de la branche tuya-light');
            execSync('git checkout -b tuya-light');
            log('Branche tuya-light créée et basculée');
        }
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur création branche: ${error.message}`, 'ERROR');
        throw error;
    }
}

// Fonction pour synchroniser les drivers tuya
function syncTuyaDrivers() {
    log('🔄 === SYNCHRONISATION DES DRIVERS TUYA ===');
    
    try {
        // Retourner à master pour récupérer les drivers
        execSync('git checkout master');
        log('Retour à master');
        
        // Vérifier que le dossier tuya existe
        if (!fs.existsSync('./drivers/tuya')) {
            log('❌ Dossier tuya non trouvé dans master', 'ERROR');
            throw new Error('Dossier tuya manquant dans master');
        }
        
        // Basculer vers tuya-light
        execSync('git checkout tuya-light');
        log('Basculement vers tuya-light');
        
        // Supprimer l'ancien dossier tuya s'il existe
        if (fs.existsSync('./drivers/tuya')) {
            fs.rmSync('./drivers/tuya', { recursive: true, force: true });
            log('Ancien dossier tuya supprimé');
        }
        
        // Copier le dossier tuya depuis master
        execSync('git checkout master -- drivers/tuya');
        log('Dossier tuya copié depuis master');
        
        // Compter les drivers tuya
        const tuyaDrivers = execSync('Get-ChildItem -Path ".\\drivers\\tuya" -Recurse -Include "driver.compose.json" | Measure-Object | Select-Object Count', { shell: 'powershell', encoding: 'utf8' });
        const count = parseInt(tuyaDrivers.match(/\d+/)[0]);
        log(`✅ Drivers tuya synchronisés: ${count}`);
        
        return { syncedDrivers: count };
        
    } catch (error) {
        log(`❌ Erreur synchronisation: ${error.message}`, 'ERROR');
        throw error;
    }
}

// Fonction pour commiter les changements
function commitChanges() {
    log('💾 === COMMIT DES CHANGEMENTS ===');
    
    try {
        // Ajouter tous les changements
        execSync('git add drivers/tuya/');
        log('Changements ajoutés au staging');
        
        // Commiter avec un message descriptif
        const commitMessage = `🔄 Sync tuya drivers from master - ${new Date().toISOString()}`;
        execSync(`git commit -m "${commitMessage}"`);
        log('Changements commités');
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur commit: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour pousser vers le remote
function pushToRemote() {
    log('🚀 === PUSH VERS REMOTE ===');
    
    try {
        execSync('git push origin tuya-light');
        log('✅ Push vers tuya-light réussi');
        return true;
        
    } catch (error) {
        log(`❌ Erreur push: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour retourner à master
function returnToMaster() {
    log('🏠 === RETOUR À MASTER ===');
    
    try {
        execSync('git checkout master');
        log('Retour à master');
        return true;
        
    } catch (error) {
        log(`❌ Erreur retour master: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour configurer la synchronisation automatique
function setupAutoSync() {
    log('⏰ === CONFIGURATION SYNCHRONISATION AUTOMATIQUE ===');
    
    try {
        // Créer un workflow GitHub Actions pour la synchronisation mensuelle
        const workflowContent = `name: 🔄 Sync tuya-light branch

on:
  schedule:
    - cron: '0 2 1 * *'  # Premier jour de chaque mois à 2h
  workflow_dispatch:

jobs:
  sync-tuya-light:
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: 🔄 Sync tuya-light branch
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          
          # Basculer vers tuya-light
          git checkout tuya-light
          
          # Récupérer les drivers tuya depuis master
          git checkout master -- drivers/tuya/
          
          # Commiter les changements
          git add drivers/tuya/
          git commit -m "🔄 Auto-sync tuya drivers from master" || echo "No changes to commit"
          
          # Pousser vers remote
          git push origin tuya-light
          
      - name: 📊 Report
        run: |
          echo "## 🔄 Tuya-light Sync Report" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### ✅ Synchronisation terminée" >> $GITHUB_STEP_SUMMARY
          echo "- Drivers tuya synchronisés depuis master" >> $GITHUB_STEP_SUMMARY
          echo "- Branche tuya-light mise à jour" >> $GITHUB_STEP_SUMMARY
          echo "- Synchronisation automatique configurée" >> $GITHUB_STEP_SUMMARY
`;
        
        const workflowDir = './.github/workflows';
        if (!fs.existsSync(workflowDir)) {
            fs.mkdirSync(workflowDir, { recursive: true });
        }
        
        fs.writeFileSync('./.github/workflows/sync-tuya-light.yml', workflowContent);
        log('✅ Workflow GitHub Actions créé');
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur configuration auto-sync: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction principale
function syncTuyaLightBranch() {
    log('🚀 === SYNCHRONISATION BRANCHE TUYA-LIGHT ===');
    
    const startTime = Date.now();
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        steps: {},
        summary: {}
    };
    
    try {
        // 1. Vérifier l'état actuel
        results.steps.checkState = checkCurrentState();
        
        // 2. Créer/vérifier la branche tuya-light
        results.steps.ensureBranch = ensureTuyaLightBranch();
        
        // 3. Synchroniser les drivers tuya
        results.steps.syncDrivers = syncTuyaDrivers();
        
        // 4. Commiter les changements
        results.steps.commit = commitChanges();
        
        // 5. Pousser vers le remote
        results.steps.push = pushToRemote();
        
        // 6. Retourner à master
        results.steps.returnMaster = returnToMaster();
        
        // 7. Configurer la synchronisation automatique
        results.steps.autoSync = setupAutoSync();
        
        // Calculer le résumé
        const duration = Date.now() - startTime;
        results.summary = {
            success: true,
            duration,
            syncedDrivers: results.steps.syncDrivers?.syncedDrivers || 0,
            autoSyncConfigured: results.steps.autoSync
        };
        
        // Rapport final
        log('📊 === RAPPORT FINAL SYNCHRONISATION ===');
        log(`Drivers synchronisés: ${results.summary.syncedDrivers}`);
        log(`Durée: ${duration}ms`);
        log(`Auto-sync configuré: ${results.summary.autoSyncConfigured ? '✅' : '❌'}`);
        
        // Sauvegarder les résultats
        const dataDir = path.dirname(CONFIG.syncDataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.syncDataFile, JSON.stringify(results, null, 2));
        
        log('✅ Synchronisation tuya-light terminée avec succès');
        
        return results;
        
    } catch (error) {
        log(`❌ ERREUR CRITIQUE SYNCHRONISATION: ${error.message}`, 'ERROR');
        results.summary = {
            success: false,
            error: error.message,
            duration: Date.now() - startTime
        };
        
        // Sauvegarder même en cas d'erreur
        const dataDir = path.dirname(CONFIG.syncDataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.syncDataFile, JSON.stringify(results, null, 2));
        
        throw error;
    }
}

// Exécution si appelé directement
if (require.main === module) {
    try {
        const results = syncTuyaLightBranch();
        log('✅ Synchronisation terminée avec succès', 'SUCCESS');
    } catch (error) {
        log(`❌ Synchronisation échouée: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { syncTuyaLightBranch }; 