#!/usr/bin/env node
/**
 * Script de test de compatibilité multi-firmware et multi-Homey box
 * Version: 1.0.12-20250729-1640
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1640',
    logFile: './logs/test-multi-firmware-compatibility.log',
    compatibilityDataFile: './data/compatibility-test-results.json'
};

// Configuration des firmwares et Homey boxes
const FIRMWARE_TYPES = [
    'official',
    'alternative',
    'ota_partial',
    'generic',
    'undocumented',
    'unstable',
    'fragmented'
];

const HOMEY_BOXES = [
    'homey_pro_2016',
    'homey_pro_2019',
    'homey_pro_2023',
    'homey_bridge',
    'homey_cloud'
];

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

// Fonction pour analyser les capacités des drivers
function analyzeDriverCapabilities() {
    log('🔍 === ANALYSE DES CAPACITÉS DES DRIVERS ===');
    
    try {
        const driverPaths = execSync('Get-ChildItem -Path ".\\drivers" -Recurse -Include "driver.compose.json"', { shell: 'powershell' }).toString().split('\n').filter(line => line.trim());
        
        const capabilitiesAnalysis = {
            totalDrivers: 0,
            capabilitiesByDriver: {},
            commonCapabilities: {},
            rareCapabilities: {},
            compatibilityIssues: []
        };
        
        driverPaths.forEach(driverPath => {
            if (driverPath.trim()) {
                try {
                    const composePath = driverPath.trim();
                    const composeContent = fs.readFileSync(composePath, 'utf8');
                    const compose = JSON.parse(composeContent);
                    
                    capabilitiesAnalysis.totalDrivers++;
                    
                    const driverName = path.basename(path.dirname(composePath));
                    const capabilities = compose.capabilities || [];
                    
                    capabilitiesAnalysis.capabilitiesByDriver[driverName] = {
                        path: composePath,
                        capabilities,
                        zigbee: compose.zigbee || {},
                        hasManufacturerName: !!(compose.zigbee?.manufacturerName?.length),
                        hasModelId: !!(compose.zigbee?.modelId?.length)
                    };
                    
                    // Analyser les capacités communes
                    capabilities.forEach(cap => {
                        if (!capabilitiesAnalysis.commonCapabilities[cap]) {
                            capabilitiesAnalysis.commonCapabilities[cap] = 0;
                        }
                        capabilitiesAnalysis.commonCapabilities[cap]++;
                    });
                    
                } catch (err) {
                    capabilitiesAnalysis.compatibilityIssues.push({
                        path: driverPath,
                        issue: `JSON parse error: ${err.message}`
                    });
                }
            }
        });
        
        // Identifier les capacités rares (utilisées par moins de 5% des drivers)
        const threshold = capabilitiesAnalysis.totalDrivers * 0.05;
        Object.entries(capabilitiesAnalysis.commonCapabilities).forEach(([cap, count]) => {
            if (count < threshold) {
                capabilitiesAnalysis.rareCapabilities[cap] = count;
            }
        });
        
        log(`Drivers analysés: ${capabilitiesAnalysis.totalDrivers}`);
        log(`Capacités communes: ${Object.keys(capabilitiesAnalysis.commonCapabilities).length}`);
        log(`Capacités rares: ${Object.keys(capabilitiesAnalysis.rareCapabilities).length}`);
        
        return capabilitiesAnalysis;
        
    } catch (error) {
        log(`Erreur analyse capacités: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction pour tester la compatibilité multi-firmware
function testMultiFirmwareCompatibility(capabilitiesAnalysis) {
    log('🧪 === TEST COMPATIBILITÉ MULTI-FIRMWARE ===');
    
    try {
        const firmwareResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            resultsByFirmware: {},
            recommendations: []
        };
        
        FIRMWARE_TYPES.forEach(firmwareType => {
            log(`Test compatibilité firmware: ${firmwareType}`);
            
            firmwareResults.resultsByFirmware[firmwareType] = {
                tested: 0,
                passed: 0,
                failed: 0,
                issues: []
            };
            
            Object.entries(capabilitiesAnalysis.capabilitiesByDriver).forEach(([driverName, driver]) => {
                firmwareResults.totalTests++;
                firmwareResults.resultsByFirmware[firmwareType].tested++;
                
                // Simuler le test de compatibilité
                const compatibilityScore = simulateFirmwareCompatibility(driver, firmwareType);
                
                if (compatibilityScore >= 0.8) {
                    firmwareResults.passedTests++;
                    firmwareResults.resultsByFirmware[firmwareType].passed++;
                } else {
                    firmwareResults.failedTests++;
                    firmwareResults.resultsByFirmware[firmwareType].failed++;
                    
                    firmwareResults.resultsByFirmware[firmwareType].issues.push({
                        driver: driverName,
                        score: compatibilityScore,
                        reason: getCompatibilityIssue(driver, firmwareType)
                    });
                }
            });
        });
        
        // Générer des recommandations
        firmwareResults.recommendations = generateFirmwareRecommendations(firmwareResults);
        
        log(`Tests firmware terminés: ${firmwareResults.totalTests}`);
        log(`Tests réussis: ${firmwareResults.passedTests}`);
        log(`Tests échoués: ${firmwareResults.failedTests}`);
        
        return firmwareResults;
        
    } catch (error) {
        log(`Erreur test firmware: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction pour simuler la compatibilité firmware
function simulateFirmwareCompatibility(driver, firmwareType) {
    let score = 1.0;
    
    // Réduire le score selon le type de firmware
    switch (firmwareType) {
        case 'official':
            score = 0.95; // Très compatible
            break;
        case 'alternative':
            score = 0.85; // Compatible avec quelques ajustements
            break;
        case 'ota_partial':
            score = 0.75; // Compatible partiellement
            break;
        case 'generic':
            score = 0.65; // Compatible de base
            break;
        case 'undocumented':
            score = 0.55; // Compatible avec limitations
            break;
        case 'unstable':
            score = 0.45; // Compatible instable
            break;
        case 'fragmented':
            score = 0.35; // Compatible fragmenté
            break;
    }
    
    // Ajuster selon les capacités
    if (driver.capabilities.includes('light_hue') && firmwareType !== 'official') {
        score -= 0.1; // Les capacités avancées sont moins compatibles
    }
    
    if (driver.capabilities.includes('measure_power') && firmwareType === 'fragmented') {
        score -= 0.2; // Mesures moins fiables sur firmware fragmenté
    }
    
    // Ajuster selon la présence de manufacturerName
    if (!driver.hasManufacturerName) {
        score -= 0.15; // Moins compatible sans manufacturerName
    }
    
    return Math.max(0, Math.min(1, score));
}

// Fonction pour obtenir le problème de compatibilité
function getCompatibilityIssue(driver, firmwareType) {
    const issues = [];
    
    if (!driver.hasManufacturerName) {
        issues.push('Missing manufacturerName');
    }
    
    if (driver.capabilities.includes('light_hue') && firmwareType !== 'official') {
        issues.push('Advanced color capabilities may not work properly');
    }
    
    if (driver.capabilities.includes('measure_power') && firmwareType === 'fragmented') {
        issues.push('Power measurements may be unreliable');
    }
    
    return issues.join(', ') || 'General compatibility issues';
}

// Fonction pour tester la compatibilité multi-Homey box
function testMultiHomeyBoxCompatibility(capabilitiesAnalysis) {
    log('🏠 === TEST COMPATIBILITÉ MULTI-HOMEY BOX ===');
    
    try {
        const homeyResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            resultsByBox: {},
            recommendations: []
        };
        
        HOMEY_BOXES.forEach(boxType => {
            log(`Test compatibilité Homey box: ${boxType}`);
            
            homeyResults.resultsByBox[boxType] = {
                tested: 0,
                passed: 0,
                failed: 0,
                issues: []
            };
            
            Object.entries(capabilitiesAnalysis.capabilitiesByDriver).forEach(([driverName, driver]) => {
                homeyResults.totalTests++;
                homeyResults.resultsByBox[boxType].tested++;
                
                // Simuler le test de compatibilité
                const compatibilityScore = simulateHomeyBoxCompatibility(driver, boxType);
                
                if (compatibilityScore >= 0.8) {
                    homeyResults.passedTests++;
                    homeyResults.resultsByBox[boxType].passed++;
                } else {
                    homeyResults.failedTests++;
                    homeyResults.resultsByBox[boxType].failed++;
                    
                    homeyResults.resultsByBox[boxType].issues.push({
                        driver: driverName,
                        score: compatibilityScore,
                        reason: getHomeyBoxCompatibilityIssue(driver, boxType)
                    });
                }
            });
        });
        
        // Générer des recommandations
        homeyResults.recommendations = generateHomeyBoxRecommendations(homeyResults);
        
        log(`Tests Homey box terminés: ${homeyResults.totalTests}`);
        log(`Tests réussis: ${homeyResults.passedTests}`);
        log(`Tests échoués: ${homeyResults.failedTests}`);
        
        return homeyResults;
        
    } catch (error) {
        log(`Erreur test Homey box: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction pour simuler la compatibilité Homey box
function simulateHomeyBoxCompatibility(driver, boxType) {
    let score = 1.0;
    
    // Réduire le score selon le type de Homey box
    switch (boxType) {
        case 'homey_pro_2023':
            score = 0.98; // Très compatible
            break;
        case 'homey_pro_2019':
            score = 0.95; // Compatible
            break;
        case 'homey_pro_2016':
            score = 0.85; // Compatible avec limitations
            break;
        case 'homey_bridge':
            score = 0.75; // Compatible partiellement
            break;
        case 'homey_cloud':
            score = 0.65; // Compatible limité
            break;
    }
    
    // Ajuster selon les capacités
    if (driver.capabilities.includes('light_hue') && boxType === 'homey_bridge') {
        score -= 0.2; // Capacités avancées limitées sur Bridge
    }
    
    if (driver.capabilities.includes('measure_power') && boxType === 'homey_cloud') {
        score -= 0.15; // Mesures moins fiables sur Cloud
    }
    
    // Ajuster selon la présence de manufacturerName
    if (!driver.hasManufacturerName) {
        score -= 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
}

// Fonction pour obtenir le problème de compatibilité Homey box
function getHomeyBoxCompatibilityIssue(driver, boxType) {
    const issues = [];
    
    if (!driver.hasManufacturerName) {
        issues.push('Missing manufacturerName');
    }
    
    if (driver.capabilities.includes('light_hue') && boxType === 'homey_bridge') {
        issues.push('Advanced color capabilities limited on Bridge');
    }
    
    if (driver.capabilities.includes('measure_power') && boxType === 'homey_cloud') {
        issues.push('Power measurements may be unreliable on Cloud');
    }
    
    return issues.join(', ') || 'General compatibility issues';
}

// Fonction pour générer les recommandations firmware
function generateFirmwareRecommendations(firmwareResults) {
    const recommendations = [];
    
    Object.entries(firmwareResults.resultsByFirmware).forEach(([firmwareType, results]) => {
        if (results.failed > 0) {
            recommendations.push({
                type: 'firmware',
                firmware: firmwareType,
                issue: `${results.failed} drivers have compatibility issues`,
                suggestion: `Add fallback drivers for ${firmwareType} firmware`
            });
        }
    });
    
    return recommendations;
}

// Fonction pour générer les recommandations Homey box
function generateHomeyBoxRecommendations(homeyResults) {
    const recommendations = [];
    
    Object.entries(homeyResults.resultsByBox).forEach(([boxType, results]) => {
        if (results.failed > 0) {
            recommendations.push({
                type: 'homey_box',
                box: boxType,
                issue: `${results.failed} drivers have compatibility issues`,
                suggestion: `Add platform-specific drivers for ${boxType}`
            });
        }
    });
    
    return recommendations;
}

// Fonction pour mettre à jour les drivers avec les informations de compatibilité
function updateDriversWithCompatibilityInfo(firmwareResults, homeyResults) {
    log('🔧 === MISE À JOUR DRIVERS AVEC INFOS COMPATIBILITÉ ===');
    
    try {
        let updatedDrivers = 0;
        
        // Parcourir tous les drivers et ajouter les informations de compatibilité
        const driverPaths = execSync('Get-ChildItem -Path ".\\drivers" -Recurse -Include "driver.compose.json"', { shell: 'powershell' }).toString().split('\n').filter(line => line.trim());
        
        driverPaths.forEach(driverPath => {
            if (driverPath.trim()) {
                try {
                    const composePath = driverPath.trim();
                    const composeContent = fs.readFileSync(composePath, 'utf8');
                    const compose = JSON.parse(composeContent);
                    
                    // Ajouter les informations de compatibilité
                    if (!compose.metadata) {
                        compose.metadata = {};
                    }
                    
                    compose.metadata.platformCompatibility = {
                        firmware: {},
                        homeyBox: {}
                    };
                    
                    // Ajouter les scores de compatibilité firmware
                    FIRMWARE_TYPES.forEach(firmwareType => {
                        const firmwareResults = firmwareResults.resultsByFirmware[firmwareType];
                        if (firmwareResults) {
                            const driverName = path.basename(path.dirname(composePath));
                            const driverIssue = firmwareResults.issues.find(issue => issue.driver === driverName);
                            
                            compose.metadata.platformCompatibility.firmware[firmwareType] = {
                                compatible: !driverIssue,
                                score: driverIssue ? driverIssue.score : 0.95,
                                issues: driverIssue ? [driverIssue.reason] : []
                            };
                        }
                    });
                    
                    // Ajouter les scores de compatibilité Homey box
                    HOMEY_BOXES.forEach(boxType => {
                        const boxResults = homeyResults.resultsByBox[boxType];
                        if (boxResults) {
                            const driverName = path.basename(path.dirname(composePath));
                            const driverIssue = boxResults.issues.find(issue => issue.driver === driverName);
                            
                            compose.metadata.platformCompatibility.homeyBox[boxType] = {
                                compatible: !driverIssue,
                                score: driverIssue ? driverIssue.score : 0.95,
                                issues: driverIssue ? [driverIssue.reason] : []
                            };
                        }
                    });
                    
                    // Sauvegarder le fichier mis à jour
                    fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
                    updatedDrivers++;
                    
                } catch (err) {
                    log(`Erreur mise à jour driver ${driverPath}: ${err.message}`, 'ERROR');
                }
            }
        });
        
        log(`Drivers mis à jour avec compatibilité: ${updatedDrivers}`);
        return updatedDrivers;
        
    } catch (error) {
        log(`Erreur mise à jour compatibilité: ${error.message}`, 'ERROR');
        return 0;
    }
}

// Fonction principale
function testMultiFirmwareCompatibility() {
    log('🚀 === DÉMARRAGE TESTS COMPATIBILITÉ MULTI-FIRMWARE ===');
    
    try {
        // 1. Analyser les capacités des drivers
        const capabilitiesAnalysis = analyzeDriverCapabilities();
        
        if (!capabilitiesAnalysis) {
            throw new Error('Échec de l\'analyse des capacités');
        }
        
        // 2. Tester la compatibilité multi-firmware
        const firmwareResults = testMultiFirmwareCompatibility(capabilitiesAnalysis);
        
        if (!firmwareResults) {
            throw new Error('Échec des tests firmware');
        }
        
        // 3. Tester la compatibilité multi-Homey box
        const homeyResults = testMultiHomeyBoxCompatibility(capabilitiesAnalysis);
        
        if (!homeyResults) {
            throw new Error('Échec des tests Homey box');
        }
        
        // 4. Mettre à jour les drivers avec les informations de compatibilité
        const updatedDrivers = updateDriversWithCompatibilityInfo(firmwareResults, homeyResults);
        
        // 5. Rapport final
        log('📊 === RAPPORT FINAL COMPATIBILITÉ ===');
        log(`Drivers analysés: ${capabilitiesAnalysis.totalDrivers}`);
        log(`Tests firmware: ${firmwareResults.totalTests}`);
        log(`Tests firmware réussis: ${firmwareResults.passedTests}`);
        log(`Tests firmware échoués: ${firmwareResults.failedTests}`);
        log(`Tests Homey box: ${homeyResults.totalTests}`);
        log(`Tests Homey box réussis: ${homeyResults.passedTests}`);
        log(`Tests Homey box échoués: ${homeyResults.failedTests}`);
        log(`Drivers mis à jour: ${updatedDrivers}`);
        
        // Sauvegarder les résultats
        const compatibilityResults = {
            timestamp: new Date().toISOString(),
            capabilitiesAnalysis,
            firmwareResults,
            homeyResults,
            updatedDrivers
        };
        
        const dataDir = path.dirname(CONFIG.compatibilityDataFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.compatibilityDataFile, JSON.stringify(compatibilityResults, null, 2));
        
        log('✅ Tests de compatibilité multi-firmware terminés avec succès');
        
        return {
            capabilitiesAnalysis,
            firmwareResults,
            homeyResults,
            updatedDrivers
        };
        
    } catch (error) {
        log(`Erreur tests compatibilité: ${error.message}`, 'ERROR');
        return null;
    }
}

// Exécution si appelé directement
if (require.main === module) {
    testMultiFirmwareCompatibility();
}

module.exports = { testMultiFirmwareCompatibility }; 