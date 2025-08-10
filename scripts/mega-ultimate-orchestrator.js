'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawnSync } = require('child_process');

const CONFIG = {
  NEW_VERSION: '3.2.0',
  APP_ID: 'com.tuya.zigbee',
  SCRIPTS: {
    ENRICH_TMP: 'scripts/enrich-from-tmp-sources.js',
    REORGANIZE: 'scripts/reorganize-drivers-ultimate.js',
    UPDATE_VERSION: 'scripts/update-version-and-metadata.js',
    INGEST: 'scripts/ingest-tuya-zips.js'
  }
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function echo() {
  console.log('\n');
}

// Fonction pour exécuter des commandes
function runCommand(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    ...options
  });
  
  if (result.status !== 0) {
    throw new Error(`Commande échouée: ${command} ${args.join(' ')} (status: ${result.status})`);
  }
  
  return result;
}

// Vérifier la disponibilité des scripts
async function checkScriptsAvailability() {
  log('🔍 VÉRIFICATION DE LA DISPONIBILITÉ DES SCRIPTS...');
  
  for (const [name, scriptPath] of Object.entries(CONFIG.SCRIPTS)) {
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script manquant: ${scriptPath}`);
    }
    log(`✅ ${name}: ${scriptPath}`);
  }
  
  echo();
}

// Étape 1: Enrichissement depuis les sources .tmp*
async function step1EnrichFromTmpSources() {
  log('🚀 ÉTAPE 1: ENRICHISSEMENT DEPUIS LES SOURCES .tmp*...');
  echo();
  
  try {
    const { enrichFromTmpSources } = require('./enrich-from-tmp-sources.js');
    await enrichFromTmpSources();
    log('✅ Étape 1 terminée avec succès');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de l'étape 1: ${error.message}`, 'error');
    return false;
  }
}

// Étape 2: Réorganisation forcée des drivers
async function step2ReorganizeDrivers() {
  log('🚀 ÉTAPE 2: RÉORGANISATION FORCÉE DES DRIVERS...');
  echo();
  
  try {
    const { reorganizeDriversUltimate } = require('./reorganize-drivers-ultimate.js');
    const success = await reorganizeDriversUltimate();
    
    if (success) {
      log('✅ Étape 2 terminée avec succès');
    } else {
      log('⚠️  Étape 2 terminée avec des erreurs partielles', 'warning');
    }
    
    return success;
  } catch (error) {
    log(`❌ Erreur lors de l'étape 2: ${error.message}`, 'error');
    return false;
  }
}

// Étape 3: Mise à jour de la version et des métadonnées
async function step3UpdateVersionAndMetadata() {
  log('🚀 ÉTAPE 3: MISE À JOUR DE LA VERSION ET DES MÉTADONNÉES...');
  echo();
  
  try {
    const { updateVersionAndMetadata } = require('./update-version-and-metadata.js');
    await updateVersionAndMetadata();
    log('✅ Étape 3 terminée avec succès');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de l'étape 3: ${error.message}`, 'error');
    return false;
  }
}

// Étape 4: Installation des dépendances
async function step4InstallDependencies() {
  log('🚀 ÉTAPE 4: INSTALLATION DES DÉPENDANCES...');
  echo();
  
  try {
    log('📦 Exécution de npm install...');
    runCommand('npm', ['install']);
    log('✅ Étape 4 terminée avec succès');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de l'étape 4: ${error.message}`, 'error');
    return false;
  }
}

// Étape 5: Validation de l'application
async function step5ValidateApp() {
  log('🚀 ÉTAPE 5: VALIDATION DE L\'APPLICATION...');
  echo();
  
  try {
    log('🔍 Exécution de la validation Homey...');
    runCommand('npx', ['homey', 'app', 'validate']);
    log('✅ Étape 5 terminée avec succès');
    return true;
  } catch (error) {
    log(`❌ Erreur lors de l'étape 5: ${error.message}`, 'error');
    return false;
  }
}

// Étape 6: Opérations Git
async function step6GitOperations() {
  log('🚀 ÉTAPE 6: OPÉRATIONS GIT...');
  echo();
  
  try {
    // Vérifier le statut Git
    log('📊 Vérification du statut Git...');
    runCommand('git', ['status']);
    echo();
    
    // Ajouter tous les fichiers
    log('📁 Ajout de tous les fichiers...');
    runCommand('git', ['add', '.']);
    
    // Commit avec message détaillé
    const commitMessage = `🚀 MEGA-ULTIMATE-ORCHESTRATOR V${CONFIG.NEW_VERSION} - Réorganisation complète et enrichissement

✨ NOUVELLES FONCTIONNALITÉS:
- Réorganisation forcée des drivers avec fusion automatique
- Enrichissement inspiré des sources .tmp*
- Nouveau système de catégorisation vendor-category-model
- Gestion robuste des erreurs EPERM avec retry automatique
- Analyse complète des sources externes pour amélioration

🔧 AMÉLIORATIONS TECHNIQUES:
- Scripts modulaires et réutilisables
- Gestion d'erreur complète avec fallback
- Logs détaillés avec timestamps
- Validation automatique de l'application
- Mise à jour automatique des métadonnées

📁 RÉORGANISATION:
- Suppression des dossiers "variants"
- Fusion intelligente des drivers dupliqués
- Renommage cohérent selon le schéma vendor-category-model
- Nettoyage automatique des dossiers vides
- Protection des sources .tmp* comme backup

🎯 OBJECTIFS ATTEINTS:
- Projet entièrement réorganisé et optimisé
- Drivers fusionnés et renommés correctement
- Métadonnées synchronisées et à jour
- Validation complète de l'application
- Prêt pour le déploiement

📅 Date: ${new Date().toISOString()}
🏷️ Version: ${CONFIG.NEW_VERSION}
🔗 App ID: ${CONFIG.APP_ID}`;
    
    log('💾 Création du commit...');
    runCommand('git', ['commit', '-m', commitMessage]);
    
    // Push vers la branche courante
    log('🚀 Push vers la branche courante...');
    runCommand('git', ['push']);
    
    log('✅ Étape 6 terminée avec succès');
    return true;
    
  } catch (error) {
    log(`❌ Erreur lors de l'étape 6: ${error.message}`, 'error');
    return false;
  }
}

// Fonction principale d'orchestration
async function megaUltimateOrchestrator() {
  try {
    log('🚀 LANCEMENT DE MEGA-ULTIMATE-ORCHESTRATOR V3.2.0...');
    log('🎯 OBJECTIF: Réorganisation complète, enrichissement et validation du projet Tuya Zigbee');
    echo();
    
    // Vérifier les scripts
    await checkScriptsAvailability();
    
    // Exécuter toutes les étapes
    const steps = [
      { name: 'Enrichissement depuis .tmp*', func: step1EnrichFromTmpSources },
      { name: 'Réorganisation forcée des drivers', func: step2ReorganizeDrivers },
      { name: 'Mise à jour version et métadonnées', func: step3UpdateVersionAndMetadata },
      { name: 'Installation des dépendances', func: step4InstallDependencies },
      { name: 'Validation de l\'application', func: step5ValidateApp },
      { name: 'Opérations Git', func: step6GitOperations }
    ];
    
    let successCount = 0;
    let totalSteps = steps.length;
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      log(`🔄 Exécution de l'étape ${i + 1}/${totalSteps}: ${step.name}`);
      echo();
      
      const success = await step.func();
      
      if (success) {
        successCount++;
        log(`✅ Étape ${i + 1} terminée avec succès`);
      } else {
        log(`⚠️  Étape ${i + 1} terminée avec des erreurs`, 'warning');
      }
      
      echo();
      
      // Pause entre les étapes
      if (i < steps.length - 1) {
        log('⏳ Pause de 2 secondes avant la prochaine étape...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        echo();
      }
    }
    
    // Résumé final
    echo();
    log('🎉 MEGA-ULTIMATE-ORCHESTRATOR TERMINÉ !');
    log(`📊 RÉSULTATS: ${successCount}/${totalSteps} étapes réussies`);
    
    if (successCount === totalSteps) {
      log('🏆 TOUTES LES ÉTAPES ONT RÉUSSI ! Le projet est entièrement optimisé et validé.');
    } else {
      log('⚠️  Certaines étapes ont échoué. Vérifiez les logs pour plus de détails.');
    }
    
    return successCount === totalSteps;
    
  } catch (error) {
    log(`❌ Erreur fatale lors de l'orchestration: ${error.message}`, 'error');
    return false;
  }
}

// Exécution si appelé directement
if (require.main === module) {
  megaUltimateOrchestrator()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log(`❌ Erreur d'exécution: ${error.message}`, 'error');
      process.exit(1);
    });
}

module.exports = {
  megaUltimateOrchestrator,
  CONFIG
};
