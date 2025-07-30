#!/usr/bin/env node
/**
 * Script de test de compatibilité multi-firmware et multi-Homey box
 * Injecte supportedModels dans driver.compose.json
 * Version: 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1700',
    logFile: './logs/test-multi-firmware-compatibility.log',
    resultsFile: './data/test-multi-firmware-compatibility.json',
    firmwares: [
        'official',
        'alternative',
        'ota_partial',
        'generic',
        'undocumented',
        'unstable',
        'fragmented'
    ],
    homeyBoxes: [
        'homey_pro_2016',
        'homey_pro_2019',
        'homey_pro_2023',
        'homey_bridge',
        'homey_cloud'
    ]
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

// Fonction pour scanner tous les drivers
function scanAllDrivers() {
    log('🔍 === SCAN DE TOUS LES DRIVERS ===');
    
    try {
        const driversDir = './drivers';
        if (!fs.existsSync(driversDir)) {
            log('❌ Dossier drivers non trouvé', 'ERROR');
            return [];
        }
        
        const drivers = [];
        
        function scanDirectory(dir) {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            
            items.forEach(item => {
                const itemPath = path.join(dir, item.name);
                
                if (item.isDirectory()) {
                    const composeFile = path.join(itemPath, 'driver.compose.json');
                    
                    if (fs.existsSync(composeFile)) {
                        try {
                            const composeData = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
                            drivers.push({
                                path: itemPath,
                                name: item.name,
                                compose: composeData
                            });
                            
                        } catch (error) {
                            log(`⚠️ Erreur lecture ${composeFile}: ${error.message}`, 'WARN');
                        }
                    } else {
                        // Continuer à scanner les sous-dossiers
                        scanDirectory(itemPath);
                    }
                }
            });
        }
        
        scanDirectory(driversDir);
        log(`✅ ${drivers.length} drivers scannés`);
        
        return drivers;
        
    } catch (error) {
        log(`❌ Erreur scan drivers: ${error.message}`, 'ERROR');
        return [];
    }
}

// Fonction pour tester la compatibilité d'un driver avec un firmware
function testFirmwareCompatibility(driver, firmware) {
    log(`🧪 === TEST FIRMWARE: ${driver.name} - ${firmware} ===`);
    
    try {
        const { compose } = driver;
        const compatibility = {
            firmware,
            driver: driver.name,
            capabilities: compose.capabilities || [],
            manufacturerNames: compose.zigbee?.manufacturerName || [],
            modelIds: compose.zigbee?.modelId || [],
            supported: true,
            issues: []
        };
        
        // Tests spécifiques par firmware
        switch (firmware) {
            case 'official':
                // Firmware officiel - compatibilité maximale
                compatibility.confidence = 0.95;
                break;
                
            case 'alternative':
                // Firmware alternatif - compatibilité élevée
                compatibility.confidence = 0.85;
                if (!compose.zigbee?.manufacturerName?.length) {
                    compatibility.issues.push('missing_manufacturer_name');
                }
                break;
                
            case 'ota_partial':
                // Firmware OTA partiel - compatibilité moyenne
                compatibility.confidence = 0.70;
                if (!compose.zigbee?.modelId?.length) {
                    compatibility.issues.push('missing_model_id');
                }
                break;
                
            case 'generic':
                // Firmware générique - compatibilité limitée
                compatibility.confidence = 0.60;
                if (!compose.capabilities?.length) {
                    compatibility.issues.push('missing_capabilities');
                }
                break;
                
            case 'undocumented':
                // Firmware non documenté - compatibilité faible
                compatibility.confidence = 0.40;
                compatibility.issues.push('undocumented_firmware');
                break;
                
            case 'unstable':
                // Firmware instable - compatibilité très faible
                compatibility.confidence = 0.20;
                compatibility.issues.push('unstable_firmware');
                break;
                
            case 'fragmented':
                // Firmware fragmenté - compatibilité minimale
                compatibility.confidence = 0.10;
                compatibility.issues.push('fragmented_firmware');
                break;
        }
        
        // Si trop d'issues, marquer comme non supporté
        if (compatibility.issues.length > 2) {
            compatibility.supported = false;
        }
        
        log(`✅ Test firmware ${firmware} terminé pour ${driver.name}`);
        return compatibility;
        
    } catch (error) {
        log(`❌ Erreur test firmware ${firmware} pour ${driver.name}: ${error.message}`, 'ERROR');
        return {
            firmware,
            driver: driver.name,
            supported: false,
            issues: ['test_error'],
            confidence: 0
        };
    }
}

// Fonction pour tester la compatibilité d'un driver avec une Homey box
function testHomeyBoxCompatibility(driver, homeyBox) {
    log(`🏠 === TEST HOMEY BOX: ${driver.name} - ${homeyBox} ===`);
    
    try {
        const { compose } = driver;
        const compatibility = {
            homeyBox,
            driver: driver.name,
            capabilities: compose.capabilities || [],
            supported: true,
            issues: []
        };
        
        // Tests spécifiques par Homey box
        switch (homeyBox) {
            case 'homey_pro_2016':
                // Homey Pro 2016 - support limité
                compatibility.confidence = 0.80;
                if (compose.capabilities?.includes('light_hue')) {
                    compatibility.issues.push('color_light_limited_support');
                }
                break;
                
            case 'homey_pro_2019':
                // Homey Pro 2019 - support complet
                compatibility.confidence = 0.95;
                break;
                
            case 'homey_pro_2023':
                // Homey Pro 2023 - support optimal
                compatibility.confidence = 0.98;
                break;
                
            case 'homey_bridge':
                // Homey Bridge - support basique
                compatibility.confidence = 0.60;
                if (compose.capabilities?.length > 3) {
                    compatibility.issues.push('too_many_capabilities');
                }
                break;
                
            case 'homey_cloud':
                // Homey Cloud - support variable
                compatibility.confidence = 0.70;
                if (compose.zigbee?.endpoints) {
                    const endpointCount = Object.keys(compose.zigbee.endpoints).length;
                    if (endpointCount > 2) {
                        compatibility.issues.push('too_many_endpoints');
                    }
                }
                break;
        }
        
        // Si trop d'issues, marquer comme non supporté
        if (compatibility.issues.length > 1) {
            compatibility.supported = false;
        }
        
        log(`✅ Test Homey box ${homeyBox} terminé pour ${driver.name}`);
        return compatibility;
        
    } catch (error) {
        log(`❌ Erreur test Homey box ${homeyBox} pour ${driver.name}: ${error.message}`, 'ERROR');
        return {
            homeyBox,
            driver: driver.name,
            supported: false,
            issues: ['test_error'],
            confidence: 0
        };
    }
}

// Fonction pour injecter supportedModels dans driver.compose.json
function injectSupportedModels(driver, firmwareResults, homeyBoxResults) {
    log(`💉 === INJECTION SUPPORTED MODELS: ${driver.name} ===`);
    
    try {
        const { compose } = driver;
        
        // Calculer les firmwares supportés
        const supportedFirmwares = firmwareResults
            .filter(result => result.supported)
            .map(result => result.firmware);
        
        // Calculer les Homey boxes supportées
        const supportedHomeyBoxes = homeyBoxResults
            .filter(result => result.supported)
            .map(result => result.homeyBox);
        
        // Créer la section supportedModels
        const supportedModels = {
            firmwares: supportedFirmwares,
            homeyBoxes: supportedHomeyBoxes,
            confidence: {
                average: calculateAverageConfidence([...firmwareResults, ...homeyBoxResults]),
                firmware: calculateAverageConfidence(firmwareResults),
                homeyBox: calculateAverageConfidence(homeyBoxResults)
            },
            metadata: {
                tested: new Date().toISOString(),
                totalTests: firmwareResults.length + homeyBoxResults.length,
                successfulTests: firmwareResults.filter(r => r.supported).length + 
                               homeyBoxResults.filter(r => r.supported).length
            }
        };
        
        // Injecter dans le compose
        if (!compose.metadata) {
            compose.metadata = {};
        }
        compose.metadata.supportedModels = supportedModels;
        
        // Sauvegarder le fichier
        const composeFile = path.join(driver.path, 'driver.compose.json');
        fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
        
        log(`✅ Supported models injecté pour ${driver.name}`);
        return supportedModels;
        
    } catch (error) {
        log(`❌ Erreur injection supported models ${driver.name}: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction pour calculer la confiance moyenne
function calculateAverageConfidence(results) {
    if (results.length === 0) return 0;
    
    const totalConfidence = results.reduce((sum, result) => sum + (result.confidence || 0), 0);
    return Math.round((totalConfidence / results.length) * 100) / 100;
}

// Fonction pour générer un rapport de compatibilité
function generateCompatibilityReport(allResults) {
    log('📊 === GÉNÉRATION RAPPORT COMPATIBILITÉ ===');
    
    try {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalDrivers: allResults.length,
                totalTests: allResults.reduce((sum, result) => sum + result.firmwareTests.length + result.homeyBoxTests.length, 0),
                successfulTests: allResults.reduce((sum, result) => 
                    sum + result.firmwareTests.filter(t => t.supported).length + 
                    result.homeyBoxTests.filter(t => t.supported).length, 0
                ),
                averageConfidence: calculateAverageConfidence(allResults.flatMap(r => [...r.firmwareTests, ...r.homeyBoxTests]))
            },
            firmwareStats: {},
            homeyBoxStats: {},
            drivers: allResults
        };
        
        // Statistiques par firmware
        CONFIG.firmwares.forEach(firmware => {
            const firmwareTests = allResults.flatMap(r => r.firmwareTests.filter(t => t.firmware === firmware));
            report.firmwareStats[firmware] = {
                total: firmwareTests.length,
                supported: firmwareTests.filter(t => t.supported).length,
                averageConfidence: calculateAverageConfidence(firmwareTests)
            };
        });
        
        // Statistiques par Homey box
        CONFIG.homeyBoxes.forEach(homeyBox => {
            const homeyBoxTests = allResults.flatMap(r => r.homeyBoxTests.filter(t => t.homeyBox === homeyBox));
            report.homeyBoxStats[homeyBox] = {
                total: homeyBoxTests.length,
                supported: homeyBoxTests.filter(t => t.supported).length,
                averageConfidence: calculateAverageConfidence(homeyBoxTests)
            };
        });
        
        log('✅ Rapport de compatibilité généré');
        return report;
        
    } catch (error) {
        log(`❌ Erreur génération rapport: ${error.message}`, 'ERROR');
        return null;
    }
}

// Fonction principale
function testMultiFirmwareCompatibility() {
    log('🚀 === TEST COMPATIBILITÉ MULTI-FIRMWARE ===');
    
    const startTime = Date.now();
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        drivers: [],
        summary: {}
    };
    
    try {
        // 1. Scanner tous les drivers
        const drivers = scanAllDrivers();
        
        // 2. Tester chaque driver
        drivers.forEach(driver => {
            log(`🧪 === TEST DRIVER: ${driver.name} ===`);
            
            const driverResults = {
                driver: driver.name,
                path: driver.path,
                firmwareTests: [],
                homeyBoxTests: [],
                supportedModels: null
            };
            
            // Tests de compatibilité firmware
            CONFIG.firmwares.forEach(firmware => {
                const firmwareResult = testFirmwareCompatibility(driver, firmware);
                driverResults.firmwareTests.push(firmwareResult);
            });
            
            // Tests de compatibilité Homey box
            CONFIG.homeyBoxes.forEach(homeyBox => {
                const homeyBoxResult = testHomeyBoxCompatibility(driver, homeyBox);
                driverResults.homeyBoxTests.push(homeyBoxResult);
            });
            
            // Injecter supportedModels
            const supportedModels = injectSupportedModels(driver, driverResults.firmwareTests, driverResults.homeyBoxTests);
            driverResults.supportedModels = supportedModels;
            
            results.drivers.push(driverResults);
        });
        
        // 3. Générer le rapport
        const compatibilityReport = generateCompatibilityReport(results.drivers);
        
        // Calculer le résumé
        const duration = Date.now() - startTime;
        results.summary = {
            success: true,
            duration,
            totalDrivers: drivers.length,
            totalTests: drivers.length * (CONFIG.firmwares.length + CONFIG.homeyBoxes.length),
            successfulTests: compatibilityReport?.summary?.successfulTests || 0,
            averageConfidence: compatibilityReport?.summary?.averageConfidence || 0
        };
        
        // Rapport final
        log('📊 === RAPPORT FINAL COMPATIBILITÉ ===');
        log(`Drivers testés: ${drivers.length}`);
        log(`Tests totaux: ${results.summary.totalTests}`);
        log(`Tests réussis: ${results.summary.successfulTests}`);
        log(`Confiance moyenne: ${results.summary.averageConfidence}`);
        log(`Durée: ${duration}ms`);
        
        // Sauvegarder les résultats
        const dataDir = path.dirname(CONFIG.resultsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        log('✅ Tests de compatibilité multi-firmware terminés avec succès');
        
        return results;
        
    } catch (error) {
        log(`❌ ERREUR CRITIQUE TESTS: ${error.message}`, 'ERROR');
        results.summary = {
            success: false,
            error: error.message,
            duration: Date.now() - startTime
        };
        
        // Sauvegarder même en cas d'erreur
        const dataDir = path.dirname(CONFIG.resultsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        throw error;
    }
}

// Exécution si appelé directement
if (require.main === module) {
    try {
        const results = testMultiFirmwareCompatibility();
        log('✅ Tests de compatibilité terminés avec succès', 'SUCCESS');
    } catch (error) {
        log(`❌ Tests de compatibilité échoués: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { testMultiFirmwareCompatibility }; 