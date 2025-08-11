'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();

// Fonction utilitaire pour exécuter des commandes
function tryRun(cmd, args) {
    try {
        console.log(`[tryRun] ${cmd} ${args.join(' ')}`);
        const result = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' });
        return result.status === 0;
    } catch (error) {
        console.error(`[tryRun] Erreur: ${error.message}`);
        return false;
    }
}

// Configuration des variables d'environnement
const ENV = {
    DO_MIGRATE: process.env.DO_MIGRATE !== '0',
    SKIP_NPM: process.env.SKIP_NPM === '1',
    SKIP_VALIDATE: process.env.SKIP_VALIDATE === '1',
    SKIP_RUN: process.env.SKIP_RUN === '1',
    SKIP_GIT_PUSH: process.env.SKIP_GIT_PUSH === '1',
    PERSIST_TMP: process.env.PERSIST_TMP !== '0',
    CLEAN_TMP: process.env.CLEAN_TMP === '1',
    KEEP_BACKUP: process.env.KEEP_BACKUP !== '0',
    CI: process.env.CI === '1',
    NODE_ENV: process.env.NODE_ENV || 'development',
    GIT_USER: process.env.GIT_USER || 'dlnraja',
    GIT_EMAIL: process.env.GIT_EMAIL || 'dylan.rajasekaram@gmail.com'
};

// Configuration des étapes du mega script
const MEGA_STEPS = {
    // Étapes de persistance et organisation
    normalize_backup: {
        name: 'Normalisation des Backups',
        description: 'Organisation et normalisation des fichiers de backup',
        script: 'scripts/normalize-backup.js',
        timeout: 60000,
        enabled: true
    },
    
    restore_tmp_sources: {
        name: 'Restauration des Sources Temporaires',
        description: 'Restauration du dossier .tmp_tuya_zip_work depuis les backups',
        script: 'scripts/sources/local/restore-tmp-sources.js',
        timeout: 300000,
        enabled: true
    },
    
    ingest_tuya_zips: {
        name: 'Ingestion des ZIPs Tuya',
        description: 'Extraction et analyse des archives ZIP Tuya',
        script: 'scripts/ingest-tuya-zips.js',
        timeout: 600000,
        enabled: true
    },
    
    // Étapes de migration et réorganisation
    migrate_meshdriver: {
        name: 'Migration Meshdriver vers Zigbeedriver',
        description: 'Conversion des dépendances et code meshdriver vers zigbeedriver',
        script: 'scripts/migrate-meshdriver-to-zigbeedriver.js',
        timeout: 120000,
        enabled: ENV.DO_MIGRATE
    },
    
    reorganize_drivers: {
        name: 'Réorganisation des Drivers',
        description: 'Réorganisation complète selon la structure domain/category/vendor/model',
        script: 'scripts/reorganize-drivers.js',
        timeout: 180000,
        enabled: true
    },
    
    // Étapes d'enrichissement des sources
    sources_extraction: {
        name: 'Extraction des Sources',
        description: 'Extraction complète depuis GitHub, forums et bases locales',
        script: 'scripts/sources/sources-orchestrator.js',
        timeout: 600000, // 10 minutes
        enabled: true
    },
    
    // Étapes de génération d'assets
    assets_generation: {
        name: 'Génération des Assets',
        description: 'Création des icônes SVG et PNG manquantes',
        script: 'scripts/assets-generate.js',
        timeout: 120000,
        enabled: true
    },
    
    small_png_generation: {
        name: 'Génération des PNG Small',
        description: 'Création des images PNG small pour les drivers',
        script: 'scripts/create-small-png.js',
        timeout: 180000,
        enabled: true
    },
    
    // Étapes finales
    reindex_drivers: {
        name: 'Réindexation des Drivers',
        description: 'Mise à jour de l\'index des drivers',
        script: 'scripts/reindex-drivers.js',
        timeout: 60000,
        enabled: true
    },
    
    update_readme: {
        name: 'Mise à jour du README',
        description: 'Mise à jour du README avec les nouvelles informations',
        script: 'scripts/update-readme.js',
        timeout: 30000,
        enabled: true
    },
    
    // Étapes de validation et test
    npm_install: {
        name: 'Installation NPM',
        description: 'Installation des dépendances NPM',
        command: 'npm install',
        timeout: 300000, // 5 minutes
        enabled: !ENV.SKIP_NPM
    },
    
    homey_validate: {
        name: 'Validation Homey',
        description: 'Validation de l\'application Homey',
        command: 'homey app validate',
        timeout: 180000,
        enabled: !ENV.SKIP_VALIDATE
    },
    
    homey_run: {
        name: 'Test Homey',
        description: 'Test de lancement de l\'application Homey',
        command: 'homey app run',
        timeout: 60000,
        enabled: !ENV.SKIP_RUN
    }
};

// Fonction pour exécuter une étape
async function executeStep(stepKey, stepConfig) {
    console.log(`\n🚀 === ${stepConfig.name} ===`);
    console.log(`📝 ${stepConfig.description}`);
    console.log(`⏱️ Timeout: ${stepConfig.timeout}ms`);
    
    const startTime = Date.now();
    
    try {
        let result;
        
        if (stepConfig.script) {
            // Exécuter un script Node.js
            result = spawnSync('node', [stepConfig.script], {
                shell: true,
                stdio: 'inherit',
                cwd: ROOT,
                timeout: stepConfig.timeout
            });
            
            if (result.status !== 0) {
                throw new Error(`Script terminé avec le code ${result.status}`);
            }
            
        } else if (stepConfig.command) {
            // Exécuter une commande système
            result = spawnSync(stepConfig.command, {
                shell: true,
                stdio: 'inherit',
                cwd: ROOT,
                timeout: stepConfig.timeout
            });
            
            if (result.status !== 0) {
                throw new Error(`Commande terminée avec le code ${result.status}`);
            }
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`✅ ${stepConfig.name} terminé avec succès en ${duration}ms`);
        
        return {
            step: stepKey,
            name: stepConfig.name,
            success: true,
            duration: duration,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        console.log(`❌ ${stepConfig.name} échoué après ${duration}ms:`, error.message);
        
        return {
            step: stepKey,
            name: stepConfig.name,
            success: false,
            error: error.message,
            duration: duration,
            timestamp: new Date().toISOString()
        };
    }
}

// Fonction pour exécuter toutes les étapes
async function executeAllSteps() {
    console.log('🎯 === MEGA SCRIPT COMPLET - EXTRACTION ET ENRICHISSEMENT DES SOURCES ===');
    console.log(`📅 Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`);
    console.log(`🔧 Configuration: DO_MIGRATE=${ENV.DO_MIGRATE}, SKIP_NPM=${ENV.SKIP_NPM}, SKIP_VALIDATE=${ENV.SKIP_VALIDATE}`);
    
    const results = {};
    const startTime = Date.now();
    
    for (const [stepKey, stepConfig] of Object.entries(MEGA_STEPS)) {
        if (stepConfig.enabled) {
            results[stepKey] = await executeStep(stepKey, stepConfig);
            
            // Pause entre les étapes
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log(`⏭️ ${stepConfig.name} désactivé`);
        }
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    return {
        results,
        summary: {
            totalSteps: Object.keys(results).length,
            successfulSteps: Object.values(results).filter(r => r.success).length,
            failedSteps: Object.values(results).filter(r => !r.success).length,
            totalDuration: totalDuration
        },
        timestamp: new Date().toISOString()
    };
}

// Fonction pour effectuer les opérations Git
function performGitOperations() {
    if (ENV.SKIP_GIT_PUSH) {
        console.log('⏭️ Push Git désactivé');
        return;
    }
    
    console.log('\n🔀 === Opérations Git ===');
    
    try {
        // Configurer Git
        spawnSync('git', ['config', 'user.name', ENV.GIT_USER], { shell: true, stdio: 'inherit' });
        spawnSync('git', ['config', 'user.email', ENV.GIT_EMAIL], { shell: true, stdio: 'inherit' });
        
        // Ajouter tous les fichiers
        console.log('📁 Ajout des fichiers...');
        spawnSync('git', ['add', '.'], { shell: true, stdio: 'inherit' });
        
        // Commit
        const commitMessage = `🚀 Mega Sources Complete - ${new Date().toISOString()}

📊 Extraction et enrichissement complet des sources:
- GitHub scraping et forum analysis
- Backup analysis et parsing des drivers
- Enrichissement IA et réorganisation
- Génération d'assets et validation

🔄 Sources: GitHub, Forums, Backups, Drivers
🎯 Enrichissement: IA, Parsing, Scraping
📁 Organisation: Structure domain/category/vendor/model
✅ Validation: Homey app et métadonnées

📅 Date: ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}
🔧 Mode: ${ENV.NODE_ENV}
🚀 Version: Mega Sources Complete`;
        
        console.log('💾 Commit des changements...');
        spawnSync('git', ['commit', '-m', commitMessage], { shell: true, stdio: 'inherit' });
        
        // Push
        console.log('🚀 Push vers le repository...');
        spawnSync('git', ['push'], { shell: true, stdio: 'inherit' });
        
        console.log('✅ Opérations Git terminées avec succès');
        
    } catch (error) {
        console.error('❌ Erreur lors des opérations Git:', error);
    }
}

// Fonction pour générer le rapport final
function generateFinalReport(executionResults) {
    console.log('\n📊 === Rapport Final ===');
    
    const report = {
        execution: executionResults,
        environment: ENV,
        timestamp: new Date().toISOString(),
        summary: {
            totalSteps: executionResults.summary.totalSteps,
            successfulSteps: executionResults.summary.successfulSteps,
            failedSteps: executionResults.summary.failedSteps,
            totalDuration: executionResults.summary.totalDuration,
            successRate: `${((executionResults.summary.successfulSteps / executionResults.summary.totalSteps) * 100).toFixed(1)}%`
        }
    };
    
    // Sauvegarder le rapport
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(ROOT, `MEGA_SOURCES_REPORT_${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Rapport final sauvegardé: ${reportPath}`);
    
    return report;
}

// Fonction principale
async function main() {
    try {
        console.log('🎯 Démarrage du Mega Script Sources Complete...');
        
        // MODE PROGRESSIF: semis Z2M par lots, puis enrich/reorg/verify et push.
        if (process.env.PROGRESSIVE === '1') {
            console.log('[mega] progressive mode: Z2M seed batch -> enrich -> reorg -> verify -> assets -> reindex -> dashboard -> push');
            // 1) seed
            tryRun('node',['scripts/sources/z2m-seed.js']);
            // 2) pipeline léger
            tryRun('node',['scripts/enrich-drivers.js','--apply']);
            tryRun('node',['scripts/reorganize-drivers.js']);
            tryRun('node',['scripts/verify-coherence-and-enrich.js']);
            tryRun('node',['scripts/assets-generate.js']);
            tryRun('node',['scripts/create-small-png.js']);
            tryRun('node',['scripts/reindex-drivers.js']);
            tryRun('node',['scripts/dashboard-generator.js']);
            // 3) push
            tryRun('node',['scripts/git-commit-push.js','"build: progressive batch (z2m→enrich→reorg→verify→assets→reindex→dashboard)"']);
            console.log('[mega] progressive batch done.');
            process.exit(0);
        }
        
        // Exécuter toutes les étapes
        const executionResults = await executeAllSteps();
        
        // Générer le rapport final
        const finalReport = generateFinalReport(executionResults);
        
        // Effectuer les opérations Git
        performGitOperations();
        
        // Afficher le résumé final
        console.log('\n🎉 === MEGA SCRIPT TERMINÉ AVEC SUCCÈS ===');
        console.log(`📊 Résumé final:`);
        console.log(`  🔄 Étapes totales: ${finalReport.summary.totalSteps}`);
        console.log(`  ✅ Étapes réussies: ${finalReport.summary.successfulSteps}`);
        console.log(`  ❌ Étapes échouées: ${finalReport.summary.failedSteps}`);
        console.log(`  🎯 Taux de succès: ${finalReport.summary.successRate}`);
        console.log(`  ⏱️ Durée totale: ${finalReport.summary.totalDuration}ms`);
        console.log(`  📄 Rapport: MEGA_SOURCES_REPORT_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
        
        console.log('\n🚀 Projet enrichi et organisé avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur critique dans le Mega Script:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { executeAllSteps, executeStep, performGitOperations };
