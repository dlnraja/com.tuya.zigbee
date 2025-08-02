// mega-pipeline-clean.js
// Pipeline d'automatisation complet et optimisé pour Tuya Zigbee
// Version refactorisée et consolidée

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Import des modules centralisés
const { CompleteOptimizer } = require('./scripts/core/complete-optimizer.js');
const { ProjectReconstructor } = require('./scripts/core/project-reconstructor.js');
const { HomeyValidator } = require('./scripts/core/validator.js');
const { DriverManager } = require('./scripts/core/driver-manager.js');
const { AssetManager } = require('./scripts/core/asset-manager.js');
const { ProjectManager } = require('./scripts/core/project-manager.js');
const { DocumentationGenerator } = require('./scripts/core/documentation-generator.js');

const CONFIG = {
    version: '3.1.0',
    timestamp: new Date().toISOString(),
    appName: 'com.tuya.zigbee',
    sdkVersion: 3,
    maxDriversExpected: 5000,
    skipPublish: true, // ⚠️ JAMAIS de publication automatique
    skipVerified: true,
    enableAI: true,
    enableAutoFix: true,
    enableReports: true,
    enableDocumentation: true
};

function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
        'INFO': 'ℹ️',
        'SUCCESS': '✅',
        'WARN': '⚠️',
        'ERROR': '❌',
        'DEBUG': '🔍'
    };
    console.log(`[${timestamp}] [${level}] ${emoji[level] || ''} ${message}`);
}

function runStep(stepName, stepFunction) {
    return async () => {
        const startTime = Date.now();
        log(`🚀 Démarrage: ${stepName}`);
        
        try {
            const result = await stepFunction();
            const duration = Date.now() - startTime;
            
            if (result && result.success !== false) {
                log(`✅ ${stepName} terminé avec succès (${duration}ms)`, 'SUCCESS');
            } else {
                log(`⚠️ ${stepName} terminé avec des avertissements (${duration}ms)`, 'WARN');
            }
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            log(`❌ ${stepName} échoué: ${error.message} (${duration}ms)`, 'ERROR');
            return { success: false, error: error.message };
        }
    };
}

// 1. RECONSTRUCTION DU PROJET
async function reconstructProject() {
    log('🏗️ === RECONSTRUCTION DU PROJET ===');
    const reconstructor = new ProjectReconstructor();
    return await reconstructor.reconstructProject();
}

// 2. ANALYSE INITIALE
async function analyzeProject() {
    log('🔍 === ANALYSE INITIALE ===');
    const optimizer = new CompleteOptimizer();
    return await optimizer.analyzeCompleteHistory();
}

// 3. STABILISATION DU PROJET
async function stabilizeProject() {
    log('🛠️ === STABILISATION DU PROJET ===');
    const projectManager = new ProjectManager();
    return await projectManager.validateProjectStructure();
}

// 4. GESTION DES ASSETS
async function manageAssets() {
    log('🖼️ === GESTION DES ASSETS ===');
    const assetManager = new AssetManager();
    return await assetManager.generateAllAssets();
}

// 5. GESTION DES DRIVERS
async function manageDrivers() {
    log('🔧 === GESTION DES DRIVERS ===');
    const driverManager = new DriverManager();
    return await driverManager.scanDrivers();
}

// 6. ENRICHISSEMENT INTELLIGENT
async function enrichDrivers() {
    log('🧠 === ENRICHISSEMENT INTELLIGENT ===');
    const optimizer = new CompleteOptimizer();
    return await optimizer.optimizeCompleteProject();
}

// 7. VALIDATION COMPLÈTE
async function validateComplete() {
    log('✅ === VALIDATION COMPLÈTE ===');
    const validator = new HomeyValidator();
    return await validator.validateAll();
}

// 8. GÉNÉRATION DE DOCUMENTATION
async function generateDocumentation() {
    log('📚 === GÉNÉRATION DE DOCUMENTATION ===');
    // Utiliser le module documentation-generator directement
    const { DocumentationGenerator } = require('./scripts/core/documentation-generator.js');
    const docGenerator = new DocumentationGenerator();
    return await docGenerator.generateAllDocumentation();
}

// 9. GÉNÉRATION DE RAPPORTS
async function generateReports() {
    log('📊 === GÉNÉRATION DE RAPPORTS ===');
    const optimizer = new CompleteOptimizer();
    return await optimizer.generateOptimizationReport();
}

// 10. OPTIMISATION FINALE
async function finalOptimization() {
    log('🚀 === OPTIMISATION FINALE ===');
    const optimizer = new CompleteOptimizer();
    return await optimizer.optimizeCompleteProject();
}

// Fonction principale
async function main() {
    log('🎯 === DÉMARRAGE MEGA-PIPELINE COMPLET ===');
    log(`Version: ${CONFIG.version}`);
    log(`Timestamp: ${CONFIG.timestamp}`);
    log('⚠️ IMPORTANT: Pas de publication automatique - Validation uniquement');

    const results = {};
    
    results.reconstruction = await runStep('Reconstruction du projet', reconstructProject)();
    results.analysis = await runStep('Analyse initiale', analyzeProject)();
    results.stabilization = await runStep('Stabilisation du projet', stabilizeProject)();
    results.assets = await runStep('Gestion des assets', manageAssets)();
    results.drivers = await runStep('Gestion des drivers', manageDrivers)();
    results.enrichment = await runStep('Enrichissement intelligent', enrichDrivers)();
    results.validation = await runStep('Validation complète', validateComplete)();
    results.documentation = await runStep('Génération de documentation', generateDocumentation)();
    results.reports = await runStep('Génération de rapports', generateReports)();
    results.optimization = await runStep('Optimisation finale', finalOptimization)();

    // Résumé final
    log('📊 === RAPPORT FINAL MEGA PIPELINE ===');
    const totalSteps = Object.keys(results).length;
    const successfulSteps = Object.values(results).filter(r => r && r.success).length;
    const failedSteps = totalSteps - successfulSteps;
    
    log(`Étapes totales: ${totalSteps}`);
    log(`Étapes réussies: ${successfulSteps}`, successfulSteps === totalSteps ? 'SUCCESS' : 'WARN');
    log(`Étapes échouées: ${failedSteps}`, failedSteps === 0 ? 'SUCCESS' : 'ERROR');
    log(`Taux de succès: ${((successfulSteps / totalSteps) * 100).toFixed(1)}%`);
    
    if (successfulSteps === totalSteps) {
        log('🎉 Pipeline terminée avec succès!', 'SUCCESS');
        log('📦 Projet prêt pour validation Homey CLI', 'SUCCESS');
        log('⚠️ Rappel: Pas de publication automatique', 'WARN');
    } else {
        log('❌ Pipeline terminée avec des erreurs', 'ERROR');
    }
    
    return {
        success: successfulSteps === totalSteps,
        results: results,
        summary: {
            total: totalSteps,
            successful: successfulSteps,
            failed: failedSteps,
            successRate: (successfulSteps / totalSteps) * 100
        }
    };
}

// Exécution si appelé directement
if (require.main === module) {
    main().catch(error => {
        log(`❌ Erreur fatale dans le mega-pipeline: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = { main, CONFIG, log }; 