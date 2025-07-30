#!/usr/bin/env node

/**
 * Test CLI Installation - Tuya Zigbee
 * Script pour tester l'installation CLI sans Homey CLI
 * 
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    version: "1.0.12-20250729-1700",
    logFile: "./logs/test-cli-installation.log"
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

// Fonction pour tester la structure de l'app
function testAppStructure() {
    log("🔍 === TEST STRUCTURE APP ===");
    
    const requiredFiles = [
        'app.json',
        'package.json',
        'app.js',
        'drivers/',
        'assets/',
        'locales/'
    ];
    
    let allPresent = true;
    const results = {};
    
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            log(`✅ ${file} présent`);
            results[file] = true;
        } else {
            log(`❌ ${file} manquant`, "ERROR");
            results[file] = false;
            allPresent = false;
        }
    }
    
    if (allPresent) {
        log("✅ Tous les fichiers requis présents");
    } else {
        log("❌ Fichiers requis manquants", "ERROR");
    }
    
    return { success: allPresent, results };
}

// Fonction pour tester la validation JSON
function testJsonValidation() {
    log("🔍 === TEST VALIDATION JSON ===");
    
    const jsonFiles = ['app.json', 'package.json'];
    let allValid = true;
    const results = {};
    
    for (const file of jsonFiles) {
        if (fs.existsSync(file)) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                JSON.parse(content);
                log(`✅ ${file} JSON valide`);
                results[file] = true;
            } catch (error) {
                log(`❌ ${file} JSON invalide: ${error.message}`, "ERROR");
                results[file] = false;
                allValid = false;
            }
        } else {
            log(`❌ ${file} manquant`, "ERROR");
            results[file] = false;
            allValid = false;
        }
    }
    
    if (allValid) {
        log("✅ Tous les fichiers JSON valides");
    } else {
        log("❌ Fichiers JSON invalides", "ERROR");
    }
    
    return { success: allValid, results };
}

// Fonction pour tester les permissions
function testPermissions() {
    log("🔍 === TEST PERMISSIONS ===");
    
    try {
        const appData = JSON.parse(fs.readFileSync('./app.json', 'utf8'));
        
        if (appData.permissions && Array.isArray(appData.permissions)) {
            log(`✅ Permissions présentes: ${appData.permissions.length}`);
            log(`📋 Permissions: ${appData.permissions.join(', ')}`);
            return { success: true, permissions: appData.permissions };
        } else {
            log("❌ Permissions manquantes ou invalides", "ERROR");
            return { success: false, permissions: [] };
        }
    } catch (error) {
        log(`❌ Erreur test permissions: ${error.message}`, "ERROR");
        return { success: false, permissions: [] };
    }
}

// Fonction pour tester la compatibilité Node.js
function testNodeCompatibility() {
    log("🔍 === TEST COMPATIBILITÉ NODE.JS ===");
    
    const nodeVersion = process.version;
    const requiredVersion = '14.0.0';
    
    log(`📋 Version Node.js: ${nodeVersion}`);
    log(`📋 Version requise: ${requiredVersion}`);
    
    // Extraction de la version numérique
    const versionMatch = nodeVersion.match(/v(\d+\.\d+\.\d+)/);
    if (versionMatch) {
        const currentVersion = versionMatch[1];
        const currentParts = currentVersion.split('.').map(Number);
        const requiredParts = requiredVersion.split('.').map(Number);
        
        let compatible = true;
        for (let i = 0; i < Math.min(currentParts.length, requiredParts.length); i++) {
            if (currentParts[i] < requiredParts[i]) {
                compatible = false;
                break;
            } else if (currentParts[i] > requiredParts[i]) {
                break;
            }
        }
        
        if (compatible) {
            log("✅ Version Node.js compatible");
            return { success: true, version: currentVersion };
        } else {
            log("❌ Version Node.js incompatible", "ERROR");
            return { success: false, version: currentVersion };
        }
    } else {
        log("❌ Impossible de déterminer la version Node.js", "ERROR");
        return { success: false, version: 'unknown' };
    }
}

// Fonction pour tester les drivers
function testDrivers() {
    log("🔍 === TEST DRIVERS ===");
    
    const driversDir = './drivers';
    if (!fs.existsSync(driversDir)) {
        log("❌ Dossier drivers manquant", "ERROR");
        return { success: false, count: 0 };
    }
    
    try {
        const driverFiles = fs.readdirSync(driversDir, { recursive: true });
        const driverComposeFiles = driverFiles.filter(file => 
            typeof file === 'string' && file.endsWith('driver.compose.json')
        );
        
        log(`📊 Drivers trouvés: ${driverComposeFiles.length}`);
        
        let validDrivers = 0;
        for (const driverFile of driverComposeFiles) {
            try {
                const driverPath = path.join(driversDir, driverFile);
                const driverContent = fs.readFileSync(driverPath, 'utf8');
                JSON.parse(driverContent);
                validDrivers++;
                log(`✅ ${driverFile} valide`);
            } catch (error) {
                log(`❌ ${driverFile} invalide: ${error.message}`, "ERROR");
            }
        }
        
        if (validDrivers > 0) {
            log(`✅ ${validDrivers} drivers valides`);
            return { success: true, count: validDrivers };
        } else {
            log("❌ Aucun driver valide", "ERROR");
            return { success: false, count: 0 };
        }
    } catch (error) {
        log(`❌ Erreur test drivers: ${error.message}`, "ERROR");
        return { success: false, count: 0 };
    }
}

// Fonction pour simuler l'installation CLI
function simulateCliInstallation() {
    log("🧪 === SIMULATION INSTALLATION CLI ===");
    
    const tests = [
        testAppStructure(),
        testJsonValidation(),
        testPermissions(),
        testNodeCompatibility(),
        testDrivers()
    ];
    
    const results = {
        appStructure: tests[0],
        jsonValidation: tests[1],
        permissions: tests[2],
        nodeCompatibility: tests[3],
        drivers: tests[4]
    };
    
    const allSuccess = tests.every(test => test.success);
    
    if (allSuccess) {
        log("🎉 Simulation installation CLI réussie");
        log("✅ Tous les tests passés - App prête pour installation CLI");
    } else {
        log("❌ Simulation installation CLI échouée", "ERROR");
        log("⚠️ Problèmes détectés - Correction nécessaire");
    }
    
    return { success: allSuccess, results };
}

// Fonction pour générer un rapport de test
function generateTestReport(results) {
    log("📊 === GÉNÉRATION RAPPORT TEST ===");
    
    const report = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        summary: {
            totalTests: 5,
            passedTests: Object.values(results).filter(r => r.success).length,
            failedTests: Object.values(results).filter(r => !r.success).length
        },
        details: results,
        recommendations: []
    };
    
    // Générer des recommandations basées sur les résultats
    if (!results.appStructure.success) {
        report.recommendations.push("Corriger la structure de l'app - fichiers manquants");
    }
    if (!results.jsonValidation.success) {
        report.recommendations.push("Corriger les fichiers JSON invalides");
    }
    if (!results.permissions.success) {
        report.recommendations.push("Ajouter les permissions requises dans app.json");
    }
    if (!results.nodeCompatibility.success) {
        report.recommendations.push("Mettre à jour Node.js vers la version requise");
    }
    if (!results.drivers.success) {
        report.recommendations.push("Corriger les drivers invalides");
    }
    
    try {
        const reportPath = "./reports/cli-installation-test.json";
        const reportDir = path.dirname(reportPath);
        
        if (!fs.existsSync(reportDir)) {
            fs.mkdirSync(reportDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        log("✅ Rapport de test généré");
        log(`📊 Fichier: ${reportPath}`);
        
        return true;
    } catch (error) {
        log(`❌ Erreur génération rapport: ${error.message}`, "ERROR");
        return false;
    }
}

// Fonction principale
function main() {
    log("🚀 === DÉMARRAGE TEST INSTALLATION CLI ===");
    
    try {
        // 1. Simuler l'installation CLI
        const testResults = simulateCliInstallation();
        
        // 2. Générer le rapport
        const reportGenerated = generateTestReport(testResults.results);
        
        if (testResults.success && reportGenerated) {
            log("🎉 Test installation CLI terminé avec succès");
            log(`📊 Résultats: ${testResults.results.appStructure.count || 0} fichiers, ${testResults.results.drivers.count || 0} drivers`);
            process.exit(0);
        } else {
            log("❌ Échec test installation CLI", "ERROR");
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
    testCliInstallation: main,
    testAppStructure,
    testJsonValidation,
    testPermissions,
    testNodeCompatibility,
    testDrivers,
    simulateCliInstallation,
    generateTestReport
}; 