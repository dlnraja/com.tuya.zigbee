#!/usr/bin/env node

/**
 * Master Optimization Pipeline - Tuya Zigbee
 * Script maître pour exécuter toutes les optimisations identifiées
 *
 * @author dlnraja / [redacted-email]
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    logFile: "./logs/master-optimization-pipeline.log"
};

// Fonction de logging
function log(message, level = "INFO") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);

    const logDir = path.dirname(CONFIG.logFile);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(CONFIG.logFile, logMessage + "\n");
}

// Fonction pour exécuter un script
function executeScript(scriptPath, description) {
    log(`🚀 === EXÉCUTION: ${description} ===`);
    log(`📜 Script: ${scriptPath}`);

    try {
        const { execSync } = require('child_process');
        const result = execSync(`node ${scriptPath}`, { encoding: 'utf8' });
        log(`✅ ${description} terminé avec succès`);
        return { success: true, output: result };
    } catch (error) {
        log(`❌ Échec ${description}: ${error.message}`, "ERROR");
        return { success: false, error: error.message };
    }
}

// Fonction pour corriger les drivers invalides
function fixInvalidDrivers() {
    log("🔧 === ÉTAPE 1: CORRECTION DRIVERS INVALIDES ===");
    return executeScript('./scripts/fix-invalid-drivers.js', 'Correction drivers invalides');
}

// Fonction pour compléter les 657 drivers
function complete657Drivers() {
    log("🔧 === ÉTAPE 2: COMPLÉTION 657 DRIVERS ===");
    return executeScript('./scripts/complete-657-drivers.js', 'Complétion 657 drivers');
}

// Fonction pour optimiser l'IA pour nouveaux modèles
function optimizeAiModels() {
    log("🧠 === ÉTAPE 3: OPTIMISATION IA NOUVEAUX MODÈLES ===");
    return executeScript('./scripts/optimize-ai-models.js', 'Optimisation IA nouveaux modèles');
}

// Fonction pour corriger la génération CHANGELOG
function fixChangelogGeneration() {
    log("📝 === ÉTAPE 4: CORRECTION GÉNÉRATION CHANGELOG ===");
    return executeScript('./scripts/fix-changelog-generation.js', 'Correction génération CHANGELOG');
}

// Fonction pour valider la structure de tous les drivers
function validateAllDrivers() {
    log("🔍 === ÉTAPE 5: VALIDATION STRUCTURE TOUS LES DRIVERS ===");
    
    try {
        const { execSync } = require('child_process');
        
        // Scanner tous les drivers
        const driverFiles = fs.readdirSync('./drivers', { recursive: true })
            .filter(file => typeof file === 'string' && file.endsWith('driver.compose.json'));
        
        log(`📊 Drivers à valider: ${driverFiles.length}`);
        
        let validCount = 0;
        let invalidCount = 0;
        
        for (const driverFile of driverFiles) {
            const driverPath = path.join('./drivers', driverFile);
            try {
                const content = fs.readFileSync(driverPath, 'utf8');
                JSON.parse(content);
                validCount++;
            } catch (error) {
                invalidCount++;
                log(`❌ Driver invalide: ${driverPath} - ${error.message}`, "ERROR");
            }
        }
        
        log(`📊 Résultats validation:`);
        log(`✅ Drivers valides: ${validCount}`);
        log(`❌ Drivers invalides: ${invalidCount}`);
        log(`📈 Taux de succès: ${((validCount / (validCount + invalidCount)) * 100).toFixed(1)}%`);
        
        return {
            success: invalidCount === 0,
            total: driverFiles.length,
            valid: validCount,
            invalid: invalidCount
        };
    } catch (error) {
        log(`❌ Erreur validation drivers: ${error.message}`, "ERROR");
        return { success: false, error: error.message };
    }
}

// Fonction pour générer la documentation complète
function generateCompleteDocumentation() {
    log("📚 === ÉTAPE 6: GÉNÉRATION DOCUMENTATION COMPLÈTE ===");
    
    try {
        // Exécuter le script de génération de docs
        const result = executeScript('./scripts/generate-docs.js', 'Génération documentation');
        
        // Vérifier que les fichiers de documentation existent
        const requiredDocs = ['README.md', 'CHANGELOG.md', 'DRIVER_MATRIX.md'];
        const existingDocs = [];
        
        for (const doc of requiredDocs) {
            if (fs.existsSync(doc)) {
                existingDocs.push(doc);
                log(`✅ ${doc} présent`);
            } else {
                log(`❌ ${doc} manquant`, "ERROR");
            }
        }
        
        const success = existingDocs.length === requiredDocs.length;
        log(`📊 Documentation générée: ${existingDocs.length}/${requiredDocs.length}`);
        
        return { success, existingDocs, requiredDocs };
    } catch (error) {
        log(`❌ Erreur génération documentation: ${error.message}`, "ERROR");
        return { success: false, error: error.message };
    }
}

// Fonction pour exécuter la mega pipeline finale
function executeMegaPipeline() {
    log("🚀 === ÉTAPE 7: EXÉCUTION MEGA PIPELINE FINALE ===");
    return executeScript('./mega-pipeline.js', 'Mega Pipeline finale');
}

// Fonction pour générer un rapport final
function generateFinalReport(results) {
    log("📊 === GÉNÉRATION RAPPORT FINAL ===");

    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        summary: {
            totalSteps: 7,
            successfulSteps: Object.values(results).filter(r => r.success).length,
            failedSteps: Object.values(results).filter(r => !r.success).length,
            successRate: (Object.values(results).filter(r => r.success).length / 7) * 100
        },
        results: results,
        recommendations: []
    };

    // Générer des recommandations basées sur les résultats
    if (!results.fixInvalidDrivers.success) {
        report.recommendations.push("Revoir manuellement les drivers invalides");
    }
    if (!results.complete657Drivers.success) {
        report.recommendations.push("Compléter manuellement les drivers restants");
    }
    if (!results.optimizeAiModels.success) {
        report.recommendations.push("Optimiser manuellement l'IA locale");
    }
    if (!results.fixChangelogGeneration.success) {
        report.recommendations.push("Corriger manuellement la génération CHANGELOG");
    }
    if (!results.validateAllDrivers.success) {
        report.recommendations.push("Valider manuellement la structure des drivers");
    }
    if (!results.generateCompleteDocumentation.success) {
        report.recommendations.push("Générer manuellement la documentation");
    }
    if (!results.executeMegaPipeline.success) {
        report.recommendations.push("Exécuter manuellement la mega pipeline");
    }

    try {
        const reportPath = "./reports/master-optimization-pipeline-report.json";
        const reportDir = path.dirname(reportPath);

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log("✅ Rapport final généré");
        log(`📊 Fichier: ${reportPath}`);

        return true;
    } catch (error) {
        log(`❌ Erreur génération rapport: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE MASTER OPTIMIZATION PIPELINE ===");
    log("🎯 Objectif: Traiter toutes les identifications et suggestions");

    const startTime = Date.now();
    const results = {};

    try {
        // ÉTAPE 1: Correction drivers invalides
        results.fixInvalidDrivers = fixInvalidDrivers();

        // ÉTAPE 2: Complétion 657 drivers
        results.complete657Drivers = complete657Drivers();

        // ÉTAPE 3: Optimisation IA nouveaux modèles
        results.optimizeAiModels = optimizeAiModels();

        // ÉTAPE 4: Correction génération CHANGELOG
        results.fixChangelogGeneration = fixChangelogGeneration();

        // ÉTAPE 5: Validation structure tous les drivers
        results.validateAllDrivers = validateAllDrivers();

        // ÉTAPE 6: Génération documentation complète
        results.generateCompleteDocumentation = generateCompleteDocumentation();

        // ÉTAPE 7: Exécution mega pipeline finale
        results.executeMegaPipeline = executeMegaPipeline();

        // Génération rapport final
        const reportGenerated = generateFinalReport(results);

        const endTime = Date.now();
        const duration = endTime - startTime;

        const successfulSteps = Object.values(results).filter(r => r.success).length;
        const successRate = (successfulSteps / 7) * 100;

        log("🎉 === MASTER OPTIMIZATION PIPELINE TERMINÉE ===");
        log(`📊 Résultats: ${successfulSteps}/7 étapes réussies`);
        log(`📈 Taux de succès: ${successRate.toFixed(1)}%`);
        log(`⏱️ Durée totale: ${duration}ms`);

        if (successRate >= 80) {
            log("✅ Pipeline terminée avec succès majeur");
            process.exit(0);
        } else if (successRate >= 50) {
            log("⚠️ Pipeline terminée avec succès partiel");
            process.exit(0);
        } else {
            log("❌ Pipeline terminée avec échec", "ERROR");
            process.exit(1);
        }

    } catch (error) {
        log(`❌ Erreur critique: ${error.message}`, "ERROR");
        process.exit(1);
    }
}

// Exécution
if (require.main === module) {
    main();
}

module.exports = {
    masterOptimizationPipeline: main,
    fixInvalidDrivers,
    complete657Drivers,
    optimizeAiModels,
    fixChangelogGeneration,
    validateAllDrivers,
    generateCompleteDocumentation,
    executeMegaPipeline,
    generateFinalReport
}; 