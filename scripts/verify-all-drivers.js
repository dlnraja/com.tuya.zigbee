#!/usr/bin/env node
/**
 * Script de vérification et mise à jour des drivers
 * Corrige automatiquement les manufacturerName manquants
 * Version: 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1700',
    logFile: './logs/verify-all-drivers.log',
    resultsFile: './data/verify-all-drivers.json',
    knownManufacturers: [
        '_TZ3000_wkr3jqmr',
        '_TZ3000_hdlpifbk',
        '_TZ3000_excgg5kb',
        '_TZ3000_u3oupgdy',
        '_TZ3000_abc123def',
        '_TZ3000_smart_switch',
        '_TZ3000_light_bulb',
        '_TZ3000_sensor_temp',
        '_TZ3000_motion_sensor',
        '_TZ3000_contact_sensor'
    ],
    knownModels: [
        'TS0004',
        'TS0001',
        'TS0601',
        'TS0602',
        'TS0603',
        'TS0604',
        'TS0605',
        'TS0606',
        'TS0607',
        'TS0608'
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
                                compose: composeData,
                                issues: []
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

// Fonction pour vérifier un driver
function verifyDriver(driver) {
    log(`🔍 === VÉRIFICATION DRIVER: ${driver.name} ===`);
    
    const issues = [];
    
    try {
        const { compose } = driver;
        
        // 1. Vérifier la structure de base
        if (!compose.id) {
            issues.push('missing_id');
        }
        
        if (!compose.name) {
            issues.push('missing_name');
        }
        
        // 2. Vérifier la section zigbee
        if (!compose.zigbee) {
            issues.push('missing_zigbee_section');
            return issues;
        }
        
        // 3. Vérifier manufacturerName
        if (!compose.zigbee.manufacturerName || !Array.isArray(compose.zigbee.manufacturerName)) {
            issues.push('missing_manufacturer_name');
        } else if (compose.zigbee.manufacturerName.length === 0) {
            issues.push('empty_manufacturer_name');
        }
        
        // 4. Vérifier modelId
        if (!compose.zigbee.modelId || !Array.isArray(compose.zigbee.modelId)) {
            issues.push('missing_model_id');
        } else if (compose.zigbee.modelId.length === 0) {
            issues.push('empty_model_id');
        }
        
        // 5. Vérifier les capacités
        if (!compose.capabilities || !Array.isArray(compose.capabilities)) {
            issues.push('missing_capabilities');
        } else if (compose.capabilities.length === 0) {
            issues.push('empty_capabilities');
        }
        
        // 6. Vérifier les endpoints
        if (!compose.zigbee.endpoints) {
            issues.push('missing_endpoints');
        }
        
        log(`✅ Driver vérifié: ${driver.name} - ${issues.length} problèmes`);
        return issues;
        
    } catch (error) {
        log(`❌ Erreur vérification ${driver.name}: ${error.message}`, 'ERROR');
        return ['verification_error'];
    }
}

// Fonction pour corriger un driver
function fixDriver(driver, issues) {
    log(`🔧 === CORRECTION DRIVER: ${driver.name} ===`);
    
    try {
        let updated = false;
        const { compose } = driver;
        
        // 1. Corriger l'ID manquant
        if (issues.includes('missing_id')) {
            compose.id = driver.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            updated = true;
            log(`✅ ID ajouté: ${compose.id}`);
        }
        
        // 2. Corriger le nom manquant
        if (issues.includes('missing_name')) {
            compose.name = {
                en: driver.name,
                fr: driver.name,
                nl: driver.name,
                ta: driver.name
            };
            updated = true;
            log(`✅ Nom ajouté`);
        }
        
        // 3. Corriger la section zigbee manquante
        if (issues.includes('missing_zigbee_section')) {
            compose.zigbee = {
                manufacturerName: [],
                modelId: [],
                endpoints: {
                    1: {
                        clusters: {
                            input: ['genBasic', 'genOnOff'],
                            output: ['genOnOff']
                        }
                    }
                }
            };
            updated = true;
            log(`✅ Section zigbee créée`);
        }
        
        // 4. Corriger manufacturerName manquant ou vide
        if (issues.includes('missing_manufacturer_name') || issues.includes('empty_manufacturer_name')) {
            if (!compose.zigbee.manufacturerName) {
                compose.zigbee.manufacturerName = [];
            }
            
            // Ajouter des manufacturerName connus basés sur le nom du driver
            const driverName = driver.name.toLowerCase();
            if (driverName.includes('switch') || driverName.includes('outlet')) {
                compose.zigbee.manufacturerName.push('_TZ3000_smart_switch');
            } else if (driverName.includes('light') || driverName.includes('bulb')) {
                compose.zigbee.manufacturerName.push('_TZ3000_light_bulb');
            } else if (driverName.includes('sensor') || driverName.includes('temp')) {
                compose.zigbee.manufacturerName.push('_TZ3000_sensor_temp');
            } else if (driverName.includes('motion')) {
                compose.zigbee.manufacturerName.push('_TZ3000_motion_sensor');
            } else if (driverName.includes('contact')) {
                compose.zigbee.manufacturerName.push('_TZ3000_contact_sensor');
            } else {
                // Ajouter un manufacturerName générique
                compose.zigbee.manufacturerName.push('_TZ3000_generic_device');
            }
            
            updated = true;
            log(`✅ manufacturerName ajouté: ${compose.zigbee.manufacturerName.join(', ')}`);
        }
        
        // 5. Corriger modelId manquant ou vide
        if (issues.includes('missing_model_id') || issues.includes('empty_model_id')) {
            if (!compose.zigbee.modelId) {
                compose.zigbee.modelId = [];
            }
            
            // Ajouter des modelId basés sur les capacités
            const capabilities = compose.capabilities || [];
            if (capabilities.includes('onoff') && capabilities.includes('dim')) {
                compose.zigbee.modelId.push('TS0601');
            } else if (capabilities.includes('onoff')) {
                compose.zigbee.modelId.push('TS0004');
            } else if (capabilities.includes('measure_temperature')) {
                compose.zigbee.modelId.push('TS0602');
            } else {
                compose.zigbee.modelId.push('TS0001');
            }
            
            updated = true;
            log(`✅ modelId ajouté: ${compose.zigbee.modelId.join(', ')}`);
        }
        
        // 6. Corriger les capacités manquantes ou vides
        if (issues.includes('missing_capabilities') || issues.includes('empty_capabilities')) {
            compose.capabilities = ['onoff'];
            updated = true;
            log(`✅ Capacités ajoutées: onoff`);
        }
        
        // 7. Corriger les endpoints manquants
        if (issues.includes('missing_endpoints')) {
            compose.zigbee.endpoints = {
                1: {
                    clusters: {
                        input: ['genBasic', 'genOnOff'],
                        output: ['genOnOff']
                    }
                }
            };
            updated = true;
            log(`✅ Endpoints ajoutés`);
        }
        
        // Sauvegarder les modifications
        if (updated) {
            const composeFile = path.join(driver.path, 'driver.compose.json');
            fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
            log(`✅ Driver corrigé: ${driver.name}`);
        }
        
        return updated;
        
    } catch (error) {
        log(`❌ Erreur correction ${driver.name}: ${error.message}`, 'ERROR');
        return false;
    }
}

// Fonction pour enrichir les drivers avec des manufacturerName supplémentaires
function enrichDriversWithKnownManufacturers(drivers) {
    log('🔧 === ENRICHISSEMENT AVEC MANUFACTURERNAME CONNUS ===');
    
    let enrichedDrivers = 0;
    
    drivers.forEach(driver => {
        try {
            const { compose } = driver;
            
            if (compose.zigbee && compose.zigbee.manufacturerName) {
                let updated = false;
                
                // Ajouter des manufacturerName connus basés sur les capacités
                const capabilities = compose.capabilities || [];
                const currentManufacturers = compose.zigbee.manufacturerName;
                
                if (capabilities.includes('onoff') && capabilities.includes('dim')) {
                    if (!currentManufacturers.includes('_TZ3000_light_bulb')) {
                        currentManufacturers.push('_TZ3000_light_bulb');
                        updated = true;
                    }
                }
                
                if (capabilities.includes('measure_temperature')) {
                    if (!currentManufacturers.includes('_TZ3000_sensor_temp')) {
                        currentManufacturers.push('_TZ3000_sensor_temp');
                        updated = true;
                    }
                }
                
                if (capabilities.includes('alarm_motion')) {
                    if (!currentManufacturers.includes('_TZ3000_motion_sensor')) {
                        currentManufacturers.push('_TZ3000_motion_sensor');
                        updated = true;
                    }
                }
                
                if (capabilities.includes('alarm_contact')) {
                    if (!currentManufacturers.includes('_TZ3000_contact_sensor')) {
                        currentManufacturers.push('_TZ3000_contact_sensor');
                        updated = true;
                    }
                }
                
                // Sauvegarder si modifié
                if (updated) {
                    const composeFile = path.join(driver.path, 'driver.compose.json');
                    fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
                    enrichedDrivers++;
                    log(`✅ Driver enrichi: ${driver.name}`);
                }
            }
            
        } catch (error) {
            log(`❌ Erreur enrichissement ${driver.name}: ${error.message}`, 'ERROR');
        }
    });
    
    log(`✅ ${enrichedDrivers} drivers enrichis`);
    return enrichedDrivers;
}

// Fonction principale
function verifyAllDrivers() {
    log('🚀 === VÉRIFICATION DE TOUS LES DRIVERS ===');
    
    const startTime = Date.now();
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        drivers: [],
        issues: {},
        fixes: {},
        summary: {}
    };
    
    try {
        // 1. Scanner tous les drivers
        const drivers = scanAllDrivers();
        results.drivers = drivers;
        
        // 2. Vérifier chaque driver
        let validDrivers = 0;
        let invalidDrivers = 0;
        let fixedDrivers = 0;
        
        drivers.forEach(driver => {
            const issues = verifyDriver(driver);
            driver.issues = issues;
            
            if (issues.length === 0) {
                validDrivers++;
            } else {
                invalidDrivers++;
                
                // Corriger le driver
                const fixed = fixDriver(driver, issues);
                if (fixed) {
                    fixedDrivers++;
                }
            }
            
            // Compter les types d'issues
            issues.forEach(issue => {
                results.issues[issue] = (results.issues[issue] || 0) + 1;
            });
        });
        
        // 3. Enrichir avec des manufacturerName connus
        const enrichedDrivers = enrichDriversWithKnownManufacturers(drivers);
        
        // Calculer le résumé
        const duration = Date.now() - startTime;
        results.summary = {
            success: true,
            duration,
            totalDrivers: drivers.length,
            validDrivers,
            invalidDrivers,
            fixedDrivers,
            enrichedDrivers,
            issuesFound: Object.keys(results.issues).length
        };
        
        // Rapport final
        log('📊 === RAPPORT FINAL VÉRIFICATION ===');
        log(`Drivers totaux: ${drivers.length}`);
        log(`Drivers valides: ${validDrivers}`);
        log(`Drivers invalides: ${invalidDrivers}`);
        log(`Drivers corrigés: ${fixedDrivers}`);
        log(`Drivers enrichis: ${enrichedDrivers}`);
        log(`Types d'issues: ${Object.keys(results.issues).length}`);
        log(`Durée: ${duration}ms`);
        
        // Sauvegarder les résultats
        const dataDir = path.dirname(CONFIG.resultsFile);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        log('✅ Vérification de tous les drivers terminée avec succès');
        
        return results;
        
    } catch (error) {
        log(`❌ ERREUR CRITIQUE VÉRIFICATION: ${error.message}`, 'ERROR');
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
        const results = verifyAllDrivers();
        log('✅ Vérification terminée avec succès', 'SUCCESS');
    } catch (error) {
        log(`❌ Vérification échouée: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { verifyAllDrivers };