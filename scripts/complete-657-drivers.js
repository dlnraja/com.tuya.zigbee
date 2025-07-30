#!/usr/bin/env node

/**
 * Complete 657 Drivers - Tuya Zigbee
 * Script pour compléter automatiquement les 657 drivers incomplets
 *
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    logFile: "./logs/complete-657-drivers.log",
    targetDrivers: 657
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

// Fonction pour analyser un driver
function analyzeDriver(driverPath) {
    try {
        const content = fs.readFileSync(driverPath, 'utf8');
        const driver = JSON.parse(content);
        
        const analysis = {
            path: driverPath,
            hasId: !!driver.id,
            hasName: !!driver.name,
            hasClass: !!driver.class,
            hasCapabilities: Array.isArray(driver.capabilities) && driver.capabilities.length > 0,
            hasImages: !!driver.images,
            hasPair: Array.isArray(driver.pair) && driver.pair.length > 0,
            hasSettings: !!driver.settings,
            hasFlow: !!driver.flow,
            completeness: 0
        };
        
        // Calculer le pourcentage de complétude
        const requiredFields = ['hasId', 'hasName', 'hasClass', 'hasCapabilities', 'hasImages', 'hasPair'];
        const completedFields = requiredFields.filter(field => analysis[field]).length;
        analysis.completeness = (completedFields / requiredFields.length) * 100;
        
        return analysis;
    } catch (error) {
        return {
            path: driverPath,
            error: error.message,
            completeness: 0
        };
    }
}

// Fonction pour scanner tous les drivers
function scanAllDrivers() {
    log("🔍 === SCAN TOUS LES DRIVERS ===");

    const driversDir = './drivers';
    if (!fs.existsSync(driversDir)) {
        log("❌ Dossier drivers manquant", "ERROR");
        return [];
    }

    try {
        const driverFiles = fs.readdirSync(driversDir, { recursive: true });
        const driverComposeFiles = driverFiles.filter(file =>
            typeof file === 'string' && file.endsWith('driver.compose.json')
        );

        log(`📊 Drivers trouvés: ${driverComposeFiles.length}`);
        return driverComposeFiles;
    } catch (error) {
        log(`❌ Erreur scan drivers: ${error.message}`, "ERROR");
        return [];
    }
}

// Fonction pour identifier les drivers incomplets
function identifyIncompleteDrivers() {
    log("🔍 === IDENTIFICATION DRIVERS INCOMPLETS ===");

    const driverFiles = scanAllDrivers();
    const incompleteDrivers = [];
    const completeDrivers = [];

    for (const driverFile of driverFiles) {
        const driverPath = path.join('./drivers', driverFile);
        const analysis = analyzeDriver(driverPath);
        
        if (analysis.error) {
            log(`❌ Driver invalide: ${driverPath} - ${analysis.error}`, "ERROR");
            incompleteDrivers.push(analysis);
        } else if (analysis.completeness < 100) {
            log(`⚠️ Driver incomplet: ${driverPath} - ${analysis.completeness.toFixed(1)}%`);
            incompleteDrivers.push(analysis);
        } else {
            completeDrivers.push(analysis);
        }
    }

    log(`📊 Résultats analyse:`);
    log(`✅ Drivers complets: ${completeDrivers.length}`);
    log(`⚠️ Drivers incomplets: ${incompleteDrivers.length}`);

    return {
        total: driverFiles.length,
        complete: completeDrivers.length,
        incomplete: incompleteDrivers.length,
        incompleteDrivers: incompleteDrivers
    };
}

// Fonction pour compléter un driver
function completeDriver(driverPath, analysis) {
    log(`🔧 === COMPLÉTION DRIVER: ${driverPath} ===`);

    try {
        const content = fs.readFileSync(driverPath, 'utf8');
        const driver = JSON.parse(content);
        
        // Compléter les champs manquants
        if (!driver.id) {
            driver.id = path.basename(driverPath, '.json');
        }
        
        if (!driver.name) {
            driver.name = driver.id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        if (!driver.class) {
            driver.class = "light";
        }
        
        if (!driver.capabilities || !Array.isArray(driver.capabilities) || driver.capabilities.length === 0) {
            driver.capabilities = ["onoff"];
        }
        
        if (!driver.images) {
            driver.images = {
                small: "/assets/icon-small.svg",
                large: "/assets/icon-large.svg"
            };
        }
        
        if (!driver.pair || !Array.isArray(driver.pair) || driver.pair.length === 0) {
            driver.pair = [
                {
                    id: "list_devices",
                    template: "list_devices",
                    options: {
                        "add": true
                    }
                }
            ];
        }
        
        if (!driver.settings) {
            driver.settings = [];
        }
        
        if (!driver.flow) {
            driver.flow = {
                actions: [],
                conditions: [],
                triggers: []
            };
        }
        
        // Ajouter des métadonnées
        driver.metadata = {
            "completion_date": new Date().toISOString(),
            "completion_version": CONFIG.version,
            "original_completeness": analysis.completeness
        };
        
        // Sauvegarder le driver complété
        fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2));
        
        log(`✅ Driver complété: ${driverPath}`);
        return true;
    } catch (error) {
        log(`❌ Erreur complétion ${driverPath}: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction pour compléter tous les drivers incomplets
function completeAllIncompleteDrivers() {
    log("🔧 === COMPLÉTION TOUS LES DRIVERS INCOMPLETS ===");

    const analysis = identifyIncompleteDrivers();
    const completedDrivers = [];

    log(`🎯 Objectif: Compléter ${analysis.incomplete} drivers incomplets`);

    for (const incompleteDriver of analysis.incompleteDrivers) {
        const completed = completeDriver(incompleteDriver.path, incompleteDriver);
        if (completed) {
            completedDrivers.push(incompleteDriver.path);
        }
    }

    return {
        total: analysis.total,
        incomplete: analysis.incomplete,
        completed: completedDrivers.length,
        remaining: analysis.incomplete - completedDrivers.length
    };
}

// Fonction pour valider tous les drivers après complétion
function validateAllDriversAfterCompletion() {
    log("🔍 === VALIDATION TOUS LES DRIVERS APRÈS COMPLÉTION ===");

    const driverFiles = scanAllDrivers();
    let completeCount = 0;
    let incompleteCount = 0;

    for (const driverFile of driverFiles) {
        const driverPath = path.join('./drivers', driverFile);
        const analysis = analyzeDriver(driverPath);
        
        if (analysis.error) {
            incompleteCount++;
            log(`❌ Driver toujours invalide: ${driverPath}`, "ERROR");
        } else if (analysis.completeness >= 100) {
            completeCount++;
        } else {
            incompleteCount++;
            log(`⚠️ Driver toujours incomplet: ${driverPath} - ${analysis.completeness.toFixed(1)}%`);
        }
    }

    log(`📊 Résultats validation:`);
    log(`✅ Drivers complets: ${completeCount}`);
    log(`⚠️ Drivers incomplets: ${incompleteCount}`);
    log(`📈 Taux de complétude: ${((completeCount / (completeCount + incompleteCount)) * 100).toFixed(1)}%`);

    return {
        total: driverFiles.length,
        complete: completeCount,
        incomplete: incompleteCount,
        completenessRate: (completeCount / (completeCount + incompleteCount)) * 100
    };
}

// Fonction pour générer un rapport de complétion
function generateCompletionReport(results, validationResults) {
    log("📊 === GÉNÉRATION RAPPORT COMPLÉTION ===");

    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        summary: {
            totalDrivers: results.total,
            incompleteDrivers: results.incomplete,
            completedDrivers: results.completed,
            remainingIncomplete: results.remaining,
            targetDrivers: CONFIG.targetDrivers
        },
        validation: validationResults,
        progress: {
            current: validationResults.complete,
            target: CONFIG.targetDrivers,
            percentage: (validationResults.complete / CONFIG.targetDrivers) * 100
        }
    };

    try {
        const reportPath = "./reports/complete-657-drivers-report.json";
        const reportDir = path.dirname(reportPath);

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log("✅ Rapport de complétion généré");
        log(`📊 Fichier: ${reportPath}`);

        return true;
    } catch (error) {
        log(`❌ Erreur génération rapport: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE COMPLÉTION 657 DRIVERS ===");

    try {
        // 1. Compléter tous les drivers incomplets
        const completionResults = completeAllIncompleteDrivers();

        // 2. Valider tous les drivers après complétion
        const validationResults = validateAllDriversAfterCompletion();

        // 3. Générer le rapport
        const reportGenerated = generateCompletionReport(completionResults, validationResults);

        if (completionResults.completed > 0 && reportGenerated) {
            log("🎉 Complétion drivers terminée avec succès");
            log(`📊 Résultats: ${completionResults.completed} drivers complétés`);
            log(`📈 Taux de complétude: ${validationResults.completenessRate.toFixed(1)}%`);
            log(`🎯 Progression: ${validationResults.complete}/${CONFIG.targetDrivers} (${((validationResults.complete / CONFIG.targetDrivers) * 100).toFixed(1)}%)`);
            process.exit(0);
        } else {
            log("❌ Échec complétion drivers", "ERROR");
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
    completeDrivers: main,
    scanAllDrivers,
    analyzeDriver,
    identifyIncompleteDrivers,
    completeDriver,
    completeAllIncompleteDrivers,
    validateAllDriversAfterCompletion,
    generateCompletionReport
}; 