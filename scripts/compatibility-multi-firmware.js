#!/usr/bin/env node
/**
 * Script de compatibilité multi-firmwares Tuya + multi-box Homey
 * Version: 1.0.12-20250729-1405
 * Objectif: Gestion complète de la compatibilité firmware et matérielle
 * Spécificités: Détection automatique, fallback intelligent, adaptation dynamique
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1405',
    driversPath: './drivers',
    logFile: './logs/compatibility.log',
    backupPath: './backups/compatibility'
};

// Logging
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

// Base de données des firmwares Tuya connus
const TUYA_FIRMWARES = {
    // Firmwares officiels
    'official': {
        'TS0601': { capabilities: ['onoff', 'dim'], clusters: ['genOnOff', 'genLevelCtrl'] },
        'TS0602': { capabilities: ['onoff', 'measure_power'], clusters: ['genOnOff', 'genPowerCfg'] },
        'TS0603': { capabilities: ['onoff', 'measure_temperature'], clusters: ['genOnOff', 'msTemperatureMeasurement'] },
        'TS0604': { capabilities: ['onoff', 'measure_humidity'], clusters: ['genOnOff', 'msRelativeHumidity'] },
        'TS0605': { capabilities: ['alarm_motion'], clusters: ['ssIasZone'] },
        'TS0606': { capabilities: ['alarm_contact'], clusters: ['ssIasZone'] },
        'TS0607': { capabilities: ['windowcoverings_state'], clusters: ['genOnOff', 'genWindowCovering'] },
        'TS0608': { capabilities: ['measure_power', 'measure_current', 'measure_voltage'], clusters: ['genPowerCfg'] },
        'TS0609': { capabilities: ['onoff', 'measure_battery'], clusters: ['genOnOff', 'genPowerCfg'] },
        'TS0610': { capabilities: ['onoff', 'light_temperature'], clusters: ['genOnOff', 'lightingColorCtrl'] }
    },
    
    // Firmwares alternatifs/OTA
    'alternative': {
        'TS0601_OTA': { capabilities: ['onoff', 'dim', 'measure_power'], clusters: ['genOnOff', 'genLevelCtrl', 'genPowerCfg'] },
        'TS0602_PARTIAL': { capabilities: ['onoff'], clusters: ['genOnOff'], fallback: true },
        'TS0603_GENERIC': { capabilities: ['onoff', 'measure_temperature'], clusters: ['genOnOff', 'msTemperatureMeasurement'] },
        'TS0604_UNSTABLE': { capabilities: ['onoff'], clusters: ['genOnOff'], fallback: true },
        'TS0605_FRAGMENTED': { capabilities: ['alarm_motion'], clusters: ['ssIasZone'], fallback: true }
    },
    
    // Firmwares génériques/non documentés
    'generic': {
        'GENERIC_ONOFF': { capabilities: ['onoff'], clusters: ['genOnOff'], fallback: true },
        'GENERIC_SENSOR': { capabilities: ['measure_temperature'], clusters: ['msTemperatureMeasurement'], fallback: true },
        'GENERIC_POWER': { capabilities: ['measure_power'], clusters: ['genPowerCfg'], fallback: true },
        'UNKNOWN_FIRMWARE': { capabilities: ['onoff'], clusters: ['genOnOff'], fallback: true, unknown: true }
    }
};

// Compatibilité Homey par modèle
const HOMEY_COMPATIBILITY = {
    'homey_pro_2016': {
        minVersion: '1.0.0',
        capabilities: ['onoff', 'dim', 'measure_power', 'measure_temperature', 'measure_humidity', 'alarm_motion', 'alarm_contact'],
        clusters: ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'ssIasZone'],
        limitations: []
    },
    'homey_pro_2019': {
        minVersion: '2.0.0',
        capabilities: ['onoff', 'dim', 'measure_power', 'measure_current', 'measure_voltage', 'measure_temperature', 'measure_humidity', 'alarm_motion', 'alarm_contact', 'windowcoverings_state'],
        clusters: ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'ssIasZone', 'genWindowCovering'],
        limitations: []
    },
    'homey_pro_2023': {
        minVersion: '3.0.0',
        capabilities: ['onoff', 'dim', 'measure_power', 'measure_current', 'measure_voltage', 'measure_temperature', 'measure_humidity', 'alarm_motion', 'alarm_contact', 'windowcoverings_state', 'light_temperature', 'light_mode'],
        clusters: ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'ssIasZone', 'genWindowCovering', 'lightingColorCtrl'],
        limitations: []
    },
    'homey_bridge': {
        minVersion: '1.0.0',
        capabilities: ['onoff', 'dim', 'measure_power', 'measure_temperature', 'measure_humidity', 'alarm_motion', 'alarm_contact'],
        clusters: ['genOnOff', 'genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'ssIasZone'],
        limitations: ['Limited to basic capabilities', 'No advanced features']
    },
    'homey_cloud': {
        minVersion: '1.0.0',
        capabilities: ['onoff', 'dim', 'measure_power'],
        clusters: ['genOnOff', 'genLevelCtrl', 'genPowerCfg'],
        limitations: ['API limitations', 'No local control', 'Basic functionality only']
    }
};

// Détecter le firmware d'un appareil
function detectFirmware(deviceInfo) {
    const { model, manufacturer, productId, firmwareVersion } = deviceInfo;
    
    // Recherche exacte
    for (const [category, firmwares] of Object.entries(TUYA_FIRMWARES)) {
        for (const [firmware, info] of Object.entries(firmwares)) {
            if (firmwareVersion && firmwareVersion.includes(firmware)) {
                return { firmware, category, info, confidence: 'high' };
            }
        }
    }
    
    // Recherche par modèle
    if (model) {
        for (const [category, firmwares] of Object.entries(TUYA_FIRMWARES)) {
            for (const [firmware, info] of Object.entries(firmwares)) {
                if (model.toLowerCase().includes(firmware.toLowerCase())) {
                    return { firmware, category, info, confidence: 'medium' };
                }
            }
        }
    }
    
    // Recherche par fabricant
    if (manufacturer && manufacturer.toLowerCase().includes('tuya')) {
        // Heuristique basée sur le type d'appareil
        const deviceType = inferDeviceType(model, productId);
        const fallbackFirmware = getFallbackFirmware(deviceType);
        return { firmware: fallbackFirmware, category: 'generic', info: TUYA_FIRMWARES.generic[fallbackFirmware], confidence: 'low' };
    }
    
    // Fallback ultime
    return { firmware: 'UNKNOWN_FIRMWARE', category: 'generic', info: TUYA_FIRMWARES.generic.UNKNOWN_FIRMWARE, confidence: 'unknown' };
}

// Inférer le type d'appareil
function inferDeviceType(model, productId) {
    const modelLower = (model || '').toLowerCase();
    const productLower = (productId || '').toLowerCase();
    
    if (modelLower.includes('switch') || modelLower.includes('plug')) return 'switch';
    if (modelLower.includes('light') || modelLower.includes('bulb')) return 'light';
    if (modelLower.includes('sensor') || modelLower.includes('detector')) return 'sensor';
    if (modelLower.includes('curtain') || modelLower.includes('blind')) return 'curtain';
    if (modelLower.includes('fan')) return 'fan';
    if (modelLower.includes('thermostat')) return 'thermostat';
    
    return 'generic';
}

// Obtenir un firmware de fallback
function getFallbackFirmware(deviceType) {
    const fallbackMap = {
        'switch': 'GENERIC_ONOFF',
        'light': 'GENERIC_ONOFF',
        'sensor': 'GENERIC_SENSOR',
        'curtain': 'GENERIC_ONOFF',
        'fan': 'GENERIC_ONOFF',
        'thermostat': 'GENERIC_SENSOR',
        'generic': 'UNKNOWN_FIRMWARE'
    };
    
    return fallbackMap[deviceType] || 'UNKNOWN_FIRMWARE';
}

// Vérifier la compatibilité Homey
function checkHomeyCompatibility(firmwareInfo, homeyModel = 'homey_pro_2023') {
    const homeySpec = HOMEY_COMPATIBILITY[homeyModel];
    if (!homeySpec) {
        log(`Modèle Homey inconnu: ${homeyModel}`, 'ERROR');
        return { compatible: false, reason: 'Unknown Homey model' };
    }
    
    // Vérifier que firmwareInfo.info existe et a les propriétés nécessaires
    if (!firmwareInfo.info || !firmwareInfo.info.capabilities || !firmwareInfo.info.clusters) {
        log(`Informations firmware manquantes pour ${firmwareInfo.firmware}`, 'ERROR');
        return { compatible: false, reason: 'Missing firmware information' };
    }
    
    const compatibleCapabilities = firmwareInfo.info.capabilities.filter(cap => 
        homeySpec.capabilities.includes(cap));
    
    const compatibleClusters = firmwareInfo.info.clusters.filter(cluster => 
        homeySpec.clusters.includes(cluster));
    
    const compatibility = {
        homeyModel,
        compatible: compatibleCapabilities.length > 0,
        capabilities: {
            supported: compatibleCapabilities,
            unsupported: firmwareInfo.info.capabilities.filter(cap => !homeySpec.capabilities.includes(cap))
        },
        clusters: {
            supported: compatibleClusters,
            unsupported: firmwareInfo.info.clusters.filter(cluster => !homeySpec.clusters.includes(cluster))
        },
        limitations: homeySpec.limitations,
        fallback: firmwareInfo.info.fallback || false
    };
    
    return compatibility;
}

// Adapter un driver pour la compatibilité
function adaptDriverForCompatibility(driverPath, firmwareInfo, homeyCompatibility) {
    const composePath = path.join(driverPath, 'driver.compose.json');
    const devicePath = path.join(driverPath, 'device.js');
    
    if (!fs.existsSync(composePath)) {
        log(`Fichier compose.json non trouvé: ${composePath}`, 'ERROR');
        return false;
    }
    
    try {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Ajouter les métadonnées de compatibilité
        compose.platformCompatibility = {
            homeyModels: Object.keys(HOMEY_COMPATIBILITY),
            minHomeyVersion: HOMEY_COMPATIBILITY[homeyCompatibility.homeyModel].minVersion,
            firmware: {
                detected: firmwareInfo.firmware,
                category: firmwareInfo.category,
                confidence: firmwareInfo.confidence
            },
            compatibility: homeyCompatibility,
            fallbackBehavior: homeyCompatibility.fallback ? 'basic_onoff' : null,
            warnings: homeyCompatibility.limitations
        };
        
        // Adapter les capabilities selon la compatibilité
        if (homeyCompatibility.capabilities.unsupported.length > 0) {
            compose.capabilities = homeyCompatibility.capabilities.supported;
            
            if (compose.capabilities.length === 0) {
                // Fallback minimal
                compose.capabilities = ['onoff'];
                compose.fallbackMode = true;
            }
        }
        
        // Ajouter des métadonnées de firmware
        compose.firmwareMetadata = {
            detected: firmwareInfo.firmware,
            category: firmwareInfo.category,
            confidence: firmwareInfo.confidence,
            capabilities: firmwareInfo.info.capabilities,
            clusters: firmwareInfo.info.clusters,
            fallback: firmwareInfo.info.fallback || false,
            unknown: firmwareInfo.info.unknown || false
        };
        
        // Sauvegarder le driver adapté
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        
        // Adapter le code device.js si nécessaire
        if (fs.existsSync(devicePath)) {
            let deviceContent = fs.readFileSync(devicePath, 'utf8');
            
            // Ajouter des commentaires de compatibilité
            const compatibilityComment = `
    // Compatibilité multi-firmware et multi-box Homey
    // Firmware détecté: ${firmwareInfo.firmware} (${firmwareInfo.confidence})
    // Compatibilité: ${homeyCompatibility.compatible ? 'OK' : 'LIMITÉE'}
    // Capabilities supportées: ${homeyCompatibility.capabilities.supported.join(', ')}
    // Limitations: ${homeyCompatibility.limitations.join(', ')}`;
            
            deviceContent = deviceContent.replace(/class\s+\w+\s+extends\s+\w+\s*\{/, 
                `class ${path.basename(driverPath)} extends Homey.Device {${compatibilityComment}`);
            
            // Ajouter des méthodes de fallback si nécessaire
            if (homeyCompatibility.fallback) {
                const fallbackMethods = `
    // Méthodes de fallback pour firmware inconnu
    async onInit() {
        await super.onInit();
        this.log('Driver en mode fallback - compatibilité limitée');
        this.setWarning('Firmware non reconnu - fonctionnalités limitées');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        await super.onSettings({ oldSettings, newSettings, changedKeys });
        this.log('Paramètres mis à jour en mode fallback');
    }`;
                
                deviceContent = deviceContent.replace(/module\.exports.*/, `${fallbackMethods}

module.exports = ${path.basename(driverPath)};`);
            }
            
            fs.writeFileSync(devicePath, deviceContent);
        }
        
        log(`Driver adapté pour compatibilité: ${driverPath}`);
        return true;
        
    } catch (error) {
        log(`Erreur adaptation driver: ${error.message}`, 'ERROR');
        return false;
    }
}

// Analyser tous les drivers pour la compatibilité
async function analyzeAllDriversCompatibility() {
    log('=== ANALYSE COMPATIBILITÉ MULTI-FIRMWARE + MULTI-BOX HOMEY ===');
    
    if (!fs.existsSync(CONFIG.driversPath)) {
        log(`Dossier drivers non trouvé: ${CONFIG.driversPath}`, 'ERROR');
        return;
    }
    
    const drivers = [];
    const tuyaPath = path.join(CONFIG.driversPath, 'tuya');
    const zigbeePath = path.join(CONFIG.driversPath, 'zigbee');
    
    // Collecter tous les drivers
    for (const protocolPath of [tuyaPath, zigbeePath]) {
        if (fs.existsSync(protocolPath)) {
            const categories = fs.readdirSync(protocolPath, { withFileTypes: true })
                .filter(dirent => dirent.isDirectory())
                .map(dirent => dirent.name);
            
            for (const category of categories) {
                const categoryPath = path.join(protocolPath, category);
                const categoryDrivers = fs.readdirSync(categoryPath, { withFileTypes: true })
                    .filter(dirent => dirent.isDirectory())
                    .map(dirent => path.join(categoryPath, dirent.name));
                
                drivers.push(...categoryDrivers);
            }
        }
    }
    
    log(`Drivers à analyser: ${drivers.length}`);
    
    const results = {
        analyzed: 0,
        adapted: 0,
        errors: 0,
        firmwareStats: {},
        compatibilityStats: {}
    };
    
    for (const driverPath of drivers) {
        try {
            const driverName = path.basename(driverPath);
            log(`Analyse compatibilité: ${driverName}`);
            
            // Simuler les informations d'appareil (en réalité, ceci viendrait du device)
            const deviceInfo = {
                model: driverName,
                manufacturer: 'Tuya',
                productId: `PROD_${driverName.toUpperCase()}`,
                firmwareVersion: inferFirmwareFromDriver(driverPath)
            };
            
            // Détecter le firmware
            const firmwareInfo = detectFirmware(deviceInfo);
            
            // Vérifier la compatibilité pour tous les modèles Homey
            const homeyModels = Object.keys(HOMEY_COMPATIBILITY);
            const compatibilityResults = {};
            
            for (const homeyModel of homeyModels) {
                const compatibility = checkHomeyCompatibility(firmwareInfo, homeyModel);
                compatibilityResults[homeyModel] = compatibility;
            }
            
            // Adapter le driver pour la compatibilité maximale
            const bestCompatibility = findBestCompatibility(compatibilityResults);
            const adapted = adaptDriverForCompatibility(driverPath, firmwareInfo, bestCompatibility);
            
            // Statistiques
            results.analyzed++;
            if (adapted) results.adapted++;
            
            // Compter les firmwares
            if (!results.firmwareStats[firmwareInfo.category]) {
                results.firmwareStats[firmwareInfo.category] = 0;
            }
            results.firmwareStats[firmwareInfo.category]++;
            
            // Compter les compatibilités
            const compatibilityLevel = bestCompatibility.compatible ? 'full' : 'limited';
            if (!results.compatibilityStats[compatibilityLevel]) {
                results.compatibilityStats[compatibilityLevel] = 0;
            }
            results.compatibilityStats[compatibilityLevel]++;
            
            log(`✓ ${driverName}: ${firmwareInfo.firmware} (${firmwareInfo.confidence}) - Compatible: ${bestCompatibility.compatible ? 'OK' : 'LIMITÉ'}`);
            
        } catch (error) {
            log(`Erreur analyse ${driverPath}: ${error.message}`, 'ERROR');
            results.errors++;
        }
    }
    
    // Rapport final
    log('=== RÉSULTATS ANALYSE COMPATIBILITÉ ===');
    log(`Drivers analysés: ${results.analyzed}`);
    log(`Drivers adaptés: ${results.adapted}`);
    log(`Erreurs: ${results.errors}`);
    
    log('Statistiques firmwares:');
    for (const [category, count] of Object.entries(results.firmwareStats)) {
        log(`- ${category}: ${count}`);
    }
    
    log('Statistiques compatibilité:');
    for (const [level, count] of Object.entries(results.compatibilityStats)) {
        log(`- ${level}: ${count}`);
    }
    
    // Sauvegarder le rapport
    const reportPath = './logs/compatibility-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    log(`Rapport sauvegardé: ${reportPath}`);
    
    return results;
}

// Inférer le firmware à partir du driver
function inferFirmwareFromDriver(driverPath) {
    const devicePath = path.join(driverPath, 'device.js');
    const composePath = path.join(driverPath, 'driver.compose.json');
    
    if (fs.existsSync(composePath)) {
        try {
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            const capabilities = compose.capabilities || [];
            
            // Heuristique basée sur les capabilities
            if (capabilities.includes('measure_power') && capabilities.includes('measure_current')) {
                return 'TS0608';
            } else if (capabilities.includes('measure_power')) {
                return 'TS0602';
            } else if (capabilities.includes('measure_temperature')) {
                return 'TS0603';
            } else if (capabilities.includes('measure_humidity')) {
                return 'TS0604';
            } else if (capabilities.includes('alarm_motion')) {
                return 'TS0605';
            } else if (capabilities.includes('alarm_contact')) {
                return 'TS0606';
            } else if (capabilities.includes('windowcoverings_state')) {
                return 'TS0607';
            } else if (capabilities.includes('measure_battery')) {
                return 'TS0609';
            } else if (capabilities.includes('light_temperature')) {
                return 'TS0610';
            } else if (capabilities.includes('dim')) {
                return 'TS0601';
            } else {
                return 'GENERIC_ONOFF';
            }
        } catch (error) {
            return 'UNKNOWN_FIRMWARE';
        }
    }
    
    return 'UNKNOWN_FIRMWARE';
}

// Trouver la meilleure compatibilité
function findBestCompatibility(compatibilityResults) {
    // Priorité: Homey Pro 2023 > Homey Pro 2019 > Homey Pro 2016 > Bridge > Cloud
    const priority = ['homey_pro_2023', 'homey_pro_2019', 'homey_pro_2016', 'homey_bridge', 'homey_cloud'];
    
    for (const model of priority) {
        if (compatibilityResults[model] && compatibilityResults[model].compatible) {
            return compatibilityResults[model];
        }
    }
    
    // Retourner le premier disponible si aucun n'est compatible
    return Object.values(compatibilityResults)[0] || compatibilityResults['homey_cloud'];
}

// Point d'entrée
if (require.main === module) {
    analyzeAllDriversCompatibility().catch(error => {
        log(`Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
}

module.exports = {
    detectFirmware,
    checkHomeyCompatibility,
    adaptDriverForCompatibility,
    analyzeAllDriversCompatibility,
    TUYA_FIRMWARES,
    HOMEY_COMPATIBILITY
};