#!/usr/bin/env node

/**
 * 🤖 Smart Enrich Drivers - Enrichissement Intelligent sans OpenAI
 * 
 * Système d'enrichissement multi-méthode avec fallback local
 * Utilise dictionnaires Tuya, heuristiques, clusters, forums
 * Fonctionne sans clé API OpenAI
 * 
 * @author dlnraja / dylan.rajasekaram+homey@gmail.com
 * @version 1.0.12-20250729-1700
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
    version: '1.0.12-20250729-1700',
    resultsFile: './data/smart-enrich-drivers.json',
    logFile: './logs/smart-enrich-drivers.log',
    inferenceDB: './data/tuya-inference-db.json',
    clusterMap: './data/cluster-map.json',
    forumCache: './data/forum-capability-map.json'
};

// Base de données d'inférence Tuya
const TUYA_INFERENCE_DB = {
    // Modèles TS000X
    "TS0001": {
        capabilities: ["onoff"],
        clusters: {
            input: ["genOnOff"],
            output: []
        },
        endpoints: { "1": { clusters: { input: ["genOnOff"], output: [] } } }
    },
    "TS0002": {
        capabilities: ["onoff", "dim"],
        clusters: {
            input: ["genOnOff", "genLevelCtrl"],
            output: []
        },
        endpoints: { "1": { clusters: { input: ["genOnOff", "genLevelCtrl"], output: [] } } }
    },
    "TS0003": {
        capabilities: ["onoff", "measure_power"],
        clusters: {
            input: ["genOnOff", "haElectricalMeasurement"],
            output: []
        },
        endpoints: { "1": { clusters: { input: ["genOnOff", "haElectricalMeasurement"], output: [] } } }
    },
    "TS0004": {
        capabilities: ["onoff", "measure_power", "meter_power"],
        clusters: {
            input: ["genOnOff", "haElectricalMeasurement", "seMetering"],
            output: []
        },
        endpoints: { "1": { clusters: { input: ["genOnOff", "haElectricalMeasurement", "seMetering"], output: [] } } }
    },
    "TS0601": {
        capabilities: ["onoff", "dim", "light_temperature"],
        clusters: {
            input: ["genOnOff", "genLevelCtrl", "lightingColorCtrl"],
            output: []
        },
        endpoints: { "1": { clusters: { input: ["genOnOff", "genLevelCtrl", "lightingColorCtrl"], output: [] } } }
    },
    "TS0602": {
        capabilities: ["measure_temperature", "measure_humidity"],
        clusters: {
            input: ["msTemperatureMeasurement", "msRelativeHumidity"],
            output: []
        },
        endpoints: { "1": { clusters: { input: ["msTemperatureMeasurement", "msRelativeHumidity"], output: [] } } }
    },
    "TS0603": {
        capabilities: ["alarm_motion", "alarm_contact"],
        clusters: {
            input: ["ssIasZone"],
            output: []
        },
        endpoints: { "1": { clusters: { input: ["ssIasZone"], output: [] } } }
    }
};

// Mapping des clusters par type d'appareil
const CLUSTER_MAP = {
    light: {
        capabilities: ["onoff", "dim", "light_hue", "light_saturation"],
        clusters: ["genOnOff", "genLevelCtrl", "lightingColorCtrl"]
    },
    switch: {
        capabilities: ["onoff", "measure_power"],
        clusters: ["genOnOff", "haElectricalMeasurement"]
    },
    sensor: {
        capabilities: ["measure_temperature", "measure_humidity", "measure_pressure"],
        clusters: ["msTemperatureMeasurement", "msRelativeHumidity", "msPressureMeasurement"]
    },
    motion: {
        capabilities: ["alarm_motion"],
        clusters: ["ssIasZone"]
    },
    contact: {
        capabilities: ["alarm_contact"],
        clusters: ["ssIasZone"]
    },
    thermostat: {
        capabilities: ["measure_temperature", "target_temperature"],
        clusters: ["msTemperatureMeasurement", "hvacThermostat"]
    }
};

/**
 * Log avec timestamp et couleurs
 */
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const colors = {
        INFO: '\x1b[36m',    // Cyan
        SUCCESS: '\x1b[32m', // Green
        WARN: '\x1b[33m',    // Yellow
        ERROR: '\x1b[31m'    // Red
    };
    
    const color = colors[level] || colors.INFO;
    const reset = '\x1b[0m';
    
    console.log(`${color}[${timestamp}] [${level}]${reset} ${message}`);
    
    // Log dans fichier
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    fs.appendFileSync(CONFIG.logFile, logEntry);
}

/**
 * Devine les capacités depuis la base de données Tuya
 */
function guessCapabilitiesFromDatabase(device) {
    log(`🔍 Devinage depuis DB Tuya: ${device.modelId || 'unknown'}`);
    
    try {
        const modelId = device.modelId || 'TS0004'; // Fallback par défaut
        const manufacturerName = device.manufacturerName || '_TZ3000_generic';
        
        // Recherche exacte dans la DB
        if (TUYA_INFERENCE_DB[modelId]) {
            const result = TUYA_INFERENCE_DB[modelId];
            log(`✅ Match exact trouvé pour ${modelId}`);
            return {
                ...result,
                confidence: 0.95,
                source: 'tuya_database_exact'
            };
        }
        
        // Recherche par pattern manufacturerName
        const manufacturerPattern = manufacturerName.replace(/[0-9]/g, '');
        for (const [key, value] of Object.entries(TUYA_INFERENCE_DB)) {
            if (manufacturerName.includes(key) || key.includes(manufacturerPattern)) {
                log(`✅ Match pattern trouvé: ${manufacturerName} → ${key}`);
                return {
                    ...value,
                    confidence: 0.85,
                    source: 'tuya_database_pattern'
                };
            }
        }
        
        return null;
        
    } catch (error) {
        log(`❌ Erreur devinage DB: ${error.message}`, 'ERROR');
        return null;
    }
}

/**
 * Devine les capacités depuis les clusters
 */
function guessFromClusters(device) {
    log(`🔍 Devinage depuis clusters: ${device.modelId || 'unknown'}`);
    
    try {
        const modelId = device.modelId || 'TS0004';
        const clusters = device.clusters || [];
        
        // Analyse des clusters pour deviner le type
        let deviceType = 'generic';
        let capabilities = ['onoff'];
        
        if (clusters.includes('genLevelCtrl') || clusters.includes('lightingColorCtrl')) {
            deviceType = 'light';
            capabilities = CLUSTER_MAP.light.capabilities;
        } else if (clusters.includes('haElectricalMeasurement') || clusters.includes('seMetering')) {
            deviceType = 'switch';
            capabilities = CLUSTER_MAP.switch.capabilities;
        } else if (clusters.includes('msTemperatureMeasurement') || clusters.includes('msRelativeHumidity')) {
            deviceType = 'sensor';
            capabilities = CLUSTER_MAP.sensor.capabilities;
        } else if (clusters.includes('ssIasZone')) {
            if (modelId.includes('motion') || modelId.includes('pir')) {
                deviceType = 'motion';
                capabilities = CLUSTER_MAP.motion.capabilities;
            } else {
                deviceType = 'contact';
                capabilities = CLUSTER_MAP.contact.capabilities;
            }
        }
        
        const clusterConfig = CLUSTER_MAP[deviceType] || CLUSTER_MAP.light;
        
        return {
            capabilities: capabilities,
            clusters: clusterConfig.clusters,
            deviceType: deviceType,
            confidence: 0.75,
            source: 'cluster_analysis'
        };
        
    } catch (error) {
        log(`❌ Erreur devinage clusters: ${error.message}`, 'ERROR');
        return null;
    }
}

/**
 * Devine les capacités depuis les données forum
 */
function guessFromForumData(device) {
    log(`🔍 Devinage depuis forum: ${device.modelId || 'unknown'}`);
    
    try {
        // Charger le cache forum
        let forumCache = {};
        if (fs.existsSync(CONFIG.forumCache)) {
            forumCache = JSON.parse(fs.readFileSync(CONFIG.forumCache, 'utf8'));
        }
        
        const modelId = device.modelId || 'TS0004';
        const manufacturerName = device.manufacturerName || '_TZ3000_generic';
        
        // Recherche dans le cache forum
        const forumMatch = forumCache[modelId] || forumCache[manufacturerName];
        if (forumMatch) {
            log(`✅ Match forum trouvé pour ${modelId}`);
            return {
                capabilities: forumMatch.capabilities || ['onoff'],
                clusters: forumMatch.clusters || ['genOnOff'],
                confidence: 0.80,
                source: 'forum_cache'
            };
        }
        
        return null;
        
    } catch (error) {
        log(`❌ Erreur devinage forum: ${error.message}`, 'ERROR');
        return null;
    }
}

/**
 * Devine les capacités depuis le modèle générique
 */
function guessFromGenericModel(device) {
    log(`🔍 Devinage modèle générique: ${device.modelId || 'unknown'}`);
    
    try {
        const modelId = device.modelId || 'TS0004';
        const manufacturerName = device.manufacturerName || '_TZ3000_generic';
        
        // Analyse heuristique basée sur le nom
        const name = (manufacturerName + modelId).toLowerCase();
        
        if (name.includes('light') || name.includes('bulb') || name.includes('lamp')) {
            return {
                capabilities: ['onoff', 'dim'],
                clusters: ['genOnOff', 'genLevelCtrl'],
                deviceType: 'light',
                confidence: 0.70,
                source: 'generic_model_light'
            };
        } else if (name.includes('switch') || name.includes('plug') || name.includes('outlet')) {
            return {
                capabilities: ['onoff', 'measure_power'],
                clusters: ['genOnOff', 'haElectricalMeasurement'],
                deviceType: 'switch',
                confidence: 0.70,
                source: 'generic_model_switch'
            };
        } else if (name.includes('sensor') || name.includes('temp') || name.includes('humidity')) {
            return {
                capabilities: ['measure_temperature', 'measure_humidity'],
                clusters: ['msTemperatureMeasurement', 'msRelativeHumidity'],
                deviceType: 'sensor',
                confidence: 0.70,
                source: 'generic_model_sensor'
            };
        } else if (name.includes('motion') || name.includes('pir')) {
            return {
                capabilities: ['alarm_motion'],
                clusters: ['ssIasZone'],
                deviceType: 'motion',
                confidence: 0.70,
                source: 'generic_model_motion'
            };
        }
        
        return null;
        
    } catch (error) {
        log(`❌ Erreur devinage générique: ${error.message}`, 'ERROR');
        return null;
    }
}

/**
 * Fallback avec capacités basiques
 */
function fallbackOnBasicCapabilities(device) {
    log(`🔧 Fallback basique pour: ${device.modelId || 'unknown'}`);
    
    return {
        capabilities: ['onoff'],
        clusters: ['genOnOff'],
        deviceType: 'generic',
        confidence: 0.50,
        source: 'fallback_basic',
        warning: 'Capabilities guessed with low confidence'
    };
}

/**
 * Applique l'enrichissement à un driver
 */
function applyEnrichmentToDriver(driverPath, enrichment) {
    try {
        const composePath = path.join(driverPath, 'driver.compose.json');
        
        if (!fs.existsSync(composePath)) {
            log(`⚠️ driver.compose.json non trouvé: ${composePath}`, 'WARN');
            return false;
        }
        
        const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        
        // Mettre à jour les capacités
        if (enrichment.capabilities && enrichment.capabilities.length > 0) {
            composeData.capabilities = enrichment.capabilities;
            log(`✅ Capacités mises à jour: ${enrichment.capabilities.join(', ')}`);
        }
        
        // Mettre à jour les clusters Zigbee
        if (enrichment.clusters && enrichment.clusters.length > 0) {
            if (!composeData.zigbee) composeData.zigbee = {};
            if (!composeData.zigbee.endpoints) composeData.zigbee.endpoints = {};
            if (!composeData.zigbee.endpoints['1']) composeData.zigbee.endpoints['1'] = {};
            if (!composeData.zigbee.endpoints['1'].clusters) composeData.zigbee.endpoints['1'].clusters = {};
            
            composeData.zigbee.endpoints['1'].clusters.input = enrichment.clusters;
            log(`✅ Clusters mis à jour: ${enrichment.clusters.join(', ')}`);
        }
        
        // Ajouter les métadonnées d'enrichissement
        if (!composeData.metadata) composeData.metadata = {};
        composeData.metadata.enrichment = {
            source: enrichment.source,
            confidence: enrichment.confidence,
            timestamp: new Date().toISOString(),
            deviceType: enrichment.deviceType || 'generic'
        };
        
        if (enrichment.warning) {
            composeData.metadata.enrichment.warning = enrichment.warning;
        }
        
        // Sauvegarder
        fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
        log(`✅ Driver enrichi: ${driverPath}`);
        
        return true;
        
    } catch (error) {
        log(`❌ Erreur enrichissement driver: ${error.message}`, 'ERROR');
        return false;
    }
}

/**
 * Enrichissement intelligent multi-méthode
 */
function smartEnrichDrivers() {
    log('🤖 === ENRICHISSEMENT INTELLIGENT DRIVERS ===', 'INFO');
    
    const results = {
        timestamp: new Date().toISOString(),
        version: CONFIG.version,
        driversScanned: 0,
        driversEnriched: 0,
        enrichmentsBySource: {},
        errors: 0,
        duration: 0
    };
    
    const startTime = Date.now();
    
    try {
        // Scanner tous les drivers
        const driversPath = './drivers';
        if (!fs.existsSync(driversPath)) {
            log('⚠️ Dossier drivers non trouvé', 'WARN');
            return results;
        }
        
        const driverFolders = fs.readdirSync(driversPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        
        results.driversScanned = driverFolders.length;
        log(`🔍 Scan de ${driverFolders.length} drivers`);
        
        driverFolders.forEach(folder => {
            try {
                const driverPath = path.join(driversPath, folder);
                const composePath = path.join(driverPath, 'driver.compose.json');
                
                if (!fs.existsSync(composePath)) {
                    return; // Ignorer les drivers sans compose
                }
                
                const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                
                // Extraire les données du device
                const device = {
                    modelId: composeData.zigbee?.modelId?.[0] || 'TS0004',
                    manufacturerName: composeData.zigbee?.manufacturerName?.[0] || '_TZ3000_generic',
                    clusters: composeData.zigbee?.endpoints?.['1']?.clusters?.input || []
                };
                
                // Essayer les différentes méthodes d'enrichissement
                let enrichment = null;
                
                // 1. Base de données Tuya
                enrichment = guessCapabilitiesFromDatabase(device);
                
                // 2. Analyse des clusters
                if (!enrichment) {
                    enrichment = guessFromClusters(device);
                }
                
                // 3. Données forum
                if (!enrichment) {
                    enrichment = guessFromForumData(device);
                }
                
                // 4. Modèle générique
                if (!enrichment) {
                    enrichment = guessFromGenericModel(device);
                }
                
                // 5. Fallback basique
                if (!enrichment) {
                    enrichment = fallbackOnBasicCapabilities(device);
                }
                
                // Appliquer l'enrichissement
                if (enrichment) {
                    const success = applyEnrichmentToDriver(driverPath, enrichment);
                    if (success) {
                        results.driversEnriched++;
                        
                        // Compter par source
                        const source = enrichment.source;
                        if (!results.enrichmentsBySource[source]) {
                            results.enrichmentsBySource[source] = 0;
                        }
                        results.enrichmentsBySource[source]++;
                    }
                }
                
            } catch (error) {
                log(`❌ Erreur traitement driver ${folder}: ${error.message}`, 'ERROR');
                results.errors++;
            }
        });
        
        results.duration = Date.now() - startTime;
        
        // Sauvegarder les résultats
        fs.writeFileSync(CONFIG.resultsFile, JSON.stringify(results, null, 2));
        
        log(`✅ Enrichissement terminé: ${results.driversEnriched}/${results.driversScanned} drivers enrichis`, 'SUCCESS');
        
    } catch (error) {
        log(`❌ Erreur enrichissement: ${error.message}`, 'ERROR');
        results.errors++;
    }
    
    return results;
}

// Exécution si appelé directement
if (require.main === module) {
    try {
        const results = smartEnrichDrivers();
        log('✅ Enrichissement intelligent terminé avec succès', 'SUCCESS');
        process.exit(0);
    } catch (error) {
        log(`❌ Enrichissement intelligent échoué: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

module.exports = { smartEnrichDrivers }; 