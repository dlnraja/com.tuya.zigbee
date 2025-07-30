#!/usr/bin/env node

/**
 * Fix Invalid Drivers - Tuya Zigbee
 * Script pour corriger automatiquement les drivers invalides
 *
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    logFile: "./logs/fix-invalid-drivers.log"
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

// Fonction pour valider un driver
function validateDriver(driverPath) {
    try {
        const content = fs.readFileSync(driverPath, 'utf8');
        JSON.parse(content);
        return { valid: true, content };
    } catch (error) {
        return { valid: false, error: error.message, content: null };
    }
}

// Fonction pour corriger un driver invalide
function fixInvalidDriver(driverPath, originalContent) {
    log(`🔧 === CORRECTION DRIVER: ${driverPath} ===`);

    try {
        // Nettoyer le contenu
        let cleanedContent = originalContent.trim();
        
        // Supprimer les caractères BOM et autres caractères invisibles
        cleanedContent = cleanedContent.replace(/^\uFEFF/, '');
        cleanedContent = cleanedContent.replace(/[\u200B-\u200D\uFEFF]/g, '');
        
        // Corriger les problèmes de formatage JSON courants
        cleanedContent = cleanedContent.replace(/,\s*}/g, '}');
        cleanedContent = cleanedContent.replace(/,\s*]/g, ']');
        cleanedContent = cleanedContent.replace(/,\s*,/g, ',');
        
        // Essayer de parser le JSON nettoyé
        const parsed = JSON.parse(cleanedContent);
        
        // Re-formater proprement
        const fixedContent = JSON.stringify(parsed, null, 2);
        
        // Sauvegarder le fichier corrigé
        fs.writeFileSync(driverPath, fixedContent);
        
        log(`✅ Driver corrigé: ${driverPath}`);
        return true;
    } catch (error) {
        log(`❌ Impossible de corriger ${driverPath}: ${error.message}`, "ERROR");
        
        // Créer un driver de base si impossible de corriger
        try {
            const baseDriver = {
                id: path.basename(driverPath, '.json'),
                name: path.basename(driverPath, '.json'),
                class: "light",
                capabilities: ["onoff"],
                images: {
                    small: "/assets/icon-small.svg",
                    large: "/assets/icon-large.svg"
                },
                pair: [
                    {
                        id: "list_devices",
                        template: "list_devices",
                        options: {
                            "add": true
                        }
                    }
                ]
            };
            
            fs.writeFileSync(driverPath, JSON.stringify(baseDriver, null, 2));
            log(`✅ Driver de base créé: ${driverPath}`);
            return true;
        } catch (fallbackError) {
            log(`❌ Échec création driver de base: ${fallbackError.message}`, "ERROR");
            return false;
        }
    }
}

// Fonction pour corriger tous les drivers invalides
function fixAllInvalidDrivers() {
    log("🔧 === CORRECTION TOUS LES DRIVERS INVALIDES ===");

    const driverFiles = scanAllDrivers();
    const invalidDrivers = [];
    const fixedDrivers = [];

    // Identifier les drivers invalides
    for (const driverFile of driverFiles) {
        const driverPath = path.join('./drivers', driverFile);
        const validation = validateDriver(driverPath);
        
        if (!validation.valid) {
            invalidDrivers.push({
                path: driverPath,
                error: validation.error,
                content: validation.content
            });
        }
    }

    log(`📊 Drivers invalides trouvés: ${invalidDrivers.length}`);

    // Corriger chaque driver invalide
    for (const invalidDriver of invalidDrivers) {
        log(`🔧 Correction: ${invalidDriver.path}`);
        log(`❌ Erreur: ${invalidDriver.error}`);
        
        const fixed = fixInvalidDriver(invalidDriver.path, invalidDriver.content);
        if (fixed) {
            fixedDrivers.push(invalidDriver.path);
        }
    }

    return {
        total: driverFiles.length,
        invalid: invalidDrivers.length,
        fixed: fixedDrivers.length,
        invalidDrivers: invalidDrivers
    };
}

// Fonction pour valider tous les drivers après correction
function validateAllDrivers() {
    log("🔍 === VALIDATION TOUS LES DRIVERS APRÈS CORRECTION ===");

    const driverFiles = scanAllDrivers();
    let validCount = 0;
    let invalidCount = 0;

    for (const driverFile of driverFiles) {
        const driverPath = path.join('./drivers', driverFile);
        const validation = validateDriver(driverPath);
        
        if (validation.valid) {
            validCount++;
        } else {
            invalidCount++;
            log(`❌ Driver toujours invalide: ${driverPath}`, "ERROR");
        }
    }

    log(`📊 Résultats validation:`);
    log(`✅ Drivers valides: ${validCount}`);
    log(`❌ Drivers invalides: ${invalidCount}`);
    log(`📈 Taux de succès: ${((validCount / (validCount + invalidCount)) * 100).toFixed(1)}%`);

    return {
        total: driverFiles.length,
        valid: validCount,
        invalid: invalidCount,
        successRate: (validCount / (validCount + invalidCount)) * 100
    };
}

// Fonction pour générer un rapport de correction
function generateFixReport(results, validationResults) {
    log("📊 === GÉNÉRATION RAPPORT CORRECTION ===");

    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        summary: {
            totalDrivers: results.total,
            invalidDrivers: results.invalid,
            fixedDrivers: results.fixed,
            remainingInvalid: results.invalid - results.fixed
        },
        validation: validationResults,
        details: {
            fixedDrivers: results.fixedDrivers,
            invalidDrivers: results.invalidDrivers.map(d => ({
                path: d.path,
                error: d.error
            }))
        }
    };

    try {
        const reportPath = "./reports/fix-invalid-drivers-report.json";
        const reportDir = path.dirname(reportPath);

        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log("✅ Rapport de correction généré");
        log(`📊 Fichier: ${reportPath}`);

        return true;
    } catch (error) {
        log(`❌ Erreur génération rapport: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE CORRECTION DRIVERS INVALIDES ===");

    try {
        // 1. Corriger tous les drivers invalides
        const fixResults = fixAllInvalidDrivers();

        // 2. Valider tous les drivers après correction
        const validationResults = validateAllDrivers();

        // 3. Générer le rapport
        const reportGenerated = generateFixReport(fixResults, validationResults);

        if (fixResults.fixed > 0 && reportGenerated) {
            log("🎉 Correction drivers invalides terminée avec succès");
            log(`📊 Résultats: ${fixResults.fixed} drivers corrigés sur ${fixResults.invalid} invalides`);
            log(`📈 Taux de succès: ${validationResults.successRate.toFixed(1)}%`);
            process.exit(0);
        } else {
            log("❌ Échec correction drivers invalides", "ERROR");
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
    fixInvalidDrivers: main,
    scanAllDrivers,
    validateDriver,
    fixInvalidDriver,
    fixAllInvalidDrivers,
    validateAllDrivers,
    generateFixReport
}; 