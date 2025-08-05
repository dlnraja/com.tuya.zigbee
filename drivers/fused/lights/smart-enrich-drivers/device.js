// core/smart-enrich-drivers.js
// Module d'enrichissement intelligent local pour Tuya Zigbee
// Fonctionne sans clé API, utilise base de données locale et heuristiques

const fs = require('fs');
const path = require('path');
const { DriverManager } = require('./driver-manager.js');

class SmartEnrichDrivers {
    constructor() {
        this.driverManager = new DriverManager();
        this.dataDir = 'data';
        this.cacheDir = '.cache';
        
        // Base de données d'inférence locale
        this.tuyaInferenceDB = this.loadTuyaInferenceDB();
        this.clusterMap = this.loadClusterMap();
        this.forumCapabilityMap = this.loadForumCapabilityMap();
        
        // Heuristiques basées sur les patterns connus
        this.heuristics = {
            modelIdPatterns: {
                'TS0601': {
                    capabilities: ['onoff'],
                    clusters: ['genOnOff'],
                    fallback: true
                },
                'TS0001': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    fallback: true
                },
                'TS0002': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    fallback: true
                },
                'TS0003': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    fallback: true
                },
                'TS0004': {
                    capabilities: ['onoff', 'dim', 'light_temperature'],
                    clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
                    fallback: true
                }
            },
            manufacturerPatterns: {
                '_TZ3000': {
                    capabilities: ['onoff'],
                    clusters: ['genOnOff'],
                    fallback: true
                },
                '_TZ3210': {
                    capabilities: ['onoff', 'dim', 'light_temperature'],
                    clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
                    fallback: true
                },
                '_TZ3400': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    fallback: true
                },
                '_TZ3500': {
                    capabilities: ['measure_temperature', 'measure_humidity'],
                    clusters: ['msTemperatureMeasurement', 'msRelativeHumidity'],
                    fallback: true
                }
            },
            capabilityMapping: {
                'switch': ['onoff'],
                'dimmer': ['onoff', 'dim'],
                'light': ['onoff', 'dim', 'light_temperature', 'light_mode'],
                'plug': ['onoff', 'measure_power', 'measure_current', 'measure_voltage'],
                'sensor': ['measure_temperature', 'measure_humidity'],
                'curtain': ['windowcoverings_state', 'windowcoverings_set'],
                'thermostat': ['measure_temperature', 'target_temperature', 'thermostat_mode'],
                'valve': ['onoff', 'measure_temperature'],
                'fan': ['onoff', 'dim'],
                'garage': ['garagedoor_closed', 'garagedoor_state'],
                'smoke': ['alarm_smoke', 'measure_temperature'],
                'water': ['alarm_water', 'measure_temperature'],
                'motion': ['alarm_motion', 'measure_temperature', 'measure_humidity'],
                'door': ['alarm_contact', 'measure_temperature'],
                'presence': ['alarm_presence', 'measure_temperature'],
                'scene': ['button'],
                'remote': ['button']
            }
        };
    }

    // Charger la base de données d'inférence Tuya
    loadTuyaInferenceDB() {
        const dbPath = path.join(this.dataDir, 'tuya-inference-db.json');
        
        if (fs.existsSync(dbPath)) {
            try {
                return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            } catch (error) {
                log(`Erreur chargement tuya-inference-db.json: ${error.message}`, 'ERROR');
            }
        }
        
        // Créer une base de données par défaut
        const defaultDB = {
            modelIdMapping: {
                'TS0601': {
                    capabilities: ['onoff'],
                    clusters: ['genOnOff'],
                    manufacturerName: '_TZ3000_generic',
                    fallback: true
                },
                'TS0001': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    manufacturerName: '_TZ3000_dimmer',
                    fallback: true
                },
                'TS0002': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    manufacturerName: '_TZ3000_dimmer',
                    fallback: true
                },
                'TS0003': {
                    capabilities: ['onoff', 'dim'],
                    clusters: ['genOnOff', 'genLevelCtrl'],
                    manufacturerName: '_TZ3000_dimmer',
                    fallback: true
                },
                'TS0004': {
                    capabilities: ['onoff', 'dim', 'light_temperature'],
                    clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
                    manufacturerName: '_TZ3000_light',
                    fallback: true
                }
            },
            manufacturerMapping: {
                '_TZ3000_light': {
                    capabilities: ['onoff', 'dim', 'light_temperature'],
                    clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
                    deviceClass: 'light'
                },
                '_TZ3000_switch': {
                    capabilities: ['onoff'],
                    clusters: ['genOnOff'],
                    deviceClass: 'device'
                },
                '_TZ3000_sensor': {
                    capabilities: ['measure_temperature', 'measure_humidity'],
                    clusters: ['msTemperatureMeasurement', 'msRelativeHumidity'],
                    deviceClass: 'sensor'
                },
                '_TZ3000_plug': {
                    capabilities: ['onoff', 'measure_power'],
                    clusters: ['genOnOff', 'haElectricalMeasurement'],
                    deviceClass: 'device'
                }
            }
        };
        
        // Créer le dossier data s'il n'existe pas
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        
        fs.writeFileSync(dbPath, JSON.stringify(defaultDB, null, 2));
        return defaultDB;
    }

    // Charger la carte des clusters
    loadClusterMap() {
        const clusterPath = path.join(this.dataDir, 'cluster-map.json');
        
        if (fs.existsSync(clusterPath)) {
            try {
                return JSON.parse(fs.readFileSync(clusterPath, 'utf8'));
            } catch (error) {
                log(`Erreur chargement cluster-map.json: ${error.message}`, 'ERROR');
            }
        }
        
        // Créer une carte des clusters par défaut
        const defaultClusterMap = {
            clusters: {
                'genOnOff': {
                    frequency: 0.95,
                    capabilities: ['onoff'],
                    description: 'Basic on/off control'
                },
                'genLevelCtrl': {
                    frequency: 0.70,
                    capabilities: ['dim'],
                    description: 'Dimming control'
                },
                'msTemperatureMeasurement': {
                    frequency: 0.40,
                    capabilities: ['measure_temperature'],
                    description: 'Temperature measurement'
                },
                'msRelativeHumidity': {
                    frequency: 0.35,
                    capabilities: ['measure_humidity'],
                    description: 'Humidity measurement'
                },
                'haElectricalMeasurement': {
                    frequency: 0.25,
                    capabilities: ['measure_power', 'measure_current', 'measure_voltage'],
                    description: 'Electrical measurements'
                },
                'lightingColorCtrl': {
                    frequency: 0.20,
                    capabilities: ['light_temperature', 'light_mode'],
                    description: 'Color and temperature control'
                }
            }
        };
        
        fs.writeFileSync(clusterPath, JSON.stringify(defaultClusterMap, null, 2));
        return defaultClusterMap;
    }

    // Charger la carte des capabilities du forum
    loadForumCapabilityMap() {
        const forumPath = path.join(this.cacheDir, 'forum-capability-map.json');
        
        if (fs.existsSync(forumPath)) {
            try {
                return JSON.parse(fs.readFileSync(forumPath, 'utf8'));
            } catch (error) {
                log(`Erreur chargement forum-capability-map.json: ${error.message}`, 'ERROR');
            }
        }
        
        // Créer une carte par défaut basée sur les discussions du forum
        const defaultForumMap = {
            sources: [
                'https://community.homey.app/t/app-pro-tuya-zigbee-app/26439',
                'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352'
            ],
            devices: {
                'TS0601_switch': {
                    capabilities: ['onoff'],
                    source: 'forum',
                    verified: true
                },
                'TS0601_dimmer': {
                    capabilities: ['onoff', 'dim'],
                    source: 'forum',
                    verified: true
                },
                'TS0601_light': {
                    capabilities: ['onoff', 'dim', 'light_temperature'],
                    source: 'forum',
                    verified: true
                },
                'TS0601_sensor': {
                    capabilities: ['measure_temperature', 'measure_humidity'],
                    source: 'forum',
                    verified: true
                }
            }
        };
        
        // Créer le dossier cache s'il n'existe pas
        if (!fs.existsSync(this.cacheDir)) {
            fs.mkdirSync(this.cacheDir, { recursive: true });
        }
        
        fs.writeFileSync(forumPath, JSON.stringify(defaultForumMap, null, 2));
        return defaultForumMap;
    }

    // Enrichir un driver avec l'IA locale
    async enrichDriver(driverPath) {
        try {
            const composePath = path.join(driverPath, 'driver.compose.json');
            if (!fs.existsSync(composePath)) {
                return { success: false, error: 'driver.compose.json manquant' };
            }

            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            let enriched = false;
            let enrichmentSource = 'none';

            // 1. Enrichissement basé sur la base de données d'inférence
            if (compose.zigbee?.modelId) {
                const modelId = compose.zigbee.modelId;
                const manufacturerName = compose.zigbee.manufacturerName || '_TZ3000_generic';
                
                // Chercher dans la base de données d'inférence
                const inference = this.tuyaInferenceDB.modelIdMapping[modelId] || 
                                this.tuyaInferenceDB.manufacturerMapping[manufacturerName];
                
                if (inference) {
                    if (!compose.capabilities || compose.capabilities.length === 0) {
                        compose.capabilities = inference.capabilities;
                        enriched = true;
                        enrichmentSource = 'inference_db';
                    }
                    
                    if (!compose.zigbee.endpoints) {
                        compose.zigbee.endpoints = this.generateEndpointsFromInference(inference);
                        enriched = true;
                        enrichmentSource = 'inference_db';
                    }
                }
            }

            // 2. Enrichissement basé sur les heuristiques
            if (!enriched && compose.zigbee?.modelId) {
                const modelId = compose.zigbee.modelId;
                const manufacturerName = compose.zigbee.manufacturerName || '_TZ3000_generic';
                
                const heuristic = this.heuristics.modelIdPatterns[modelId] || 
                                this.heuristics.manufacturerPatterns[manufacturerName.split('_')[0]];
                
                if (heuristic) {
                    if (!compose.capabilities || compose.capabilities.length === 0) {
                        compose.capabilities = heuristic.capabilities;
                        enriched = true;
                        enrichmentSource = 'heuristics';
                    }
                    
                    if (!compose.zigbee.endpoints) {
                        compose.zigbee.endpoints = this.generateEndpointsFromHeuristic(heuristic);
                        enriched = true;
                        enrichmentSource = 'heuristics';
                    }
                }
            }

            // 3. Enrichissement basé sur le forum
            if (!enriched && compose.zigbee?.modelId) {
                const modelId = compose.zigbee.modelId;
                const manufacturerName = compose.zigbee.manufacturerName || '_TZ3000_generic';
                
                const forumDevice = this.forumCapabilityMap.devices[`${modelId}_${manufacturerName.split('_')[2] || 'generic'}`];
                
                if (forumDevice && forumDevice.verified) {
                    if (!compose.capabilities || compose.capabilities.length === 0) {
                        compose.capabilities = forumDevice.capabilities;
                        enriched = true;
                        enrichmentSource = 'forum';
                    }
                }
            }

            // 4. Fallback sécurisé
            if (!compose.capabilities || compose.capabilities.length === 0) {
                compose.capabilities = ['onoff'];
                enriched = true;
                enrichmentSource = 'fallback';
            }

            // 5. Amélioration des images
            if (!compose.images || !compose.images.small || !compose.images.large) {
                compose.images = {
                    small: '/assets/icon-small.png',
                    large: '/assets/icon-large.png'
                };
                enriched = true;
            }

            // Sauvegarder les améliorations
            if (enriched) {
                fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
            }

            return { 
                success: true, 
                enriched, 
                source: enrichmentSource,
                capabilities: compose.capabilities
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Générer les endpoints basés sur l'inférence
    generateEndpointsFromInference(inference) {
        return {
            '1': {
                clusters: {
                    input: ['genBasic', 'genIdentify', ...inference.clusters],
                    output: ['genIdentify']
                }
            }
        };
    }

    // Générer les endpoints basés sur les heuristiques
    generateEndpointsFromHeuristic(heuristic) {
        return {
            '1': {
                clusters: {
                    input: ['genBasic', 'genIdentify', ...heuristic.clusters],
                    output: ['genIdentify']
                }
            }
        };
    }

    // Enrichir tous les drivers
    async enrichAllDrivers() {
        log('🧠 === ENRICHISSEMENT INTELLIGENT LOCAL ===');
        
        const drivers = this.driverManager.scanDrivers();
        let enrichedCount = 0;
        let errorCount = 0;
        const sources = {
            inference_db: 0,
            heuristics: 0,
            forum: 0,
            fallback: 0
        };
        
        for (const driver of drivers) {
            try {
                const result = await this.enrichDriver(driver.path);
                if (result.success && result.enriched) {
                    log(`✅ Driver enrichi: ${driver.path} (source: ${result.source})`);
                    enrichedCount++;
                    sources[result.source]++;
                } else if (!result.success) {
                    log(`❌ Erreur enrichissement ${driver.path}: ${result.error}`, 'ERROR');
                    errorCount++;
                }
            } catch (error) {
                log(`❌ Erreur enrichissement ${driver.path}: ${error.message}`, 'ERROR');
                errorCount++;
            }
        }
        
        log(`📊 Enrichissement terminé: ${enrichedCount} drivers enrichis, ${errorCount} erreurs`);
        log(`📈 Sources: ${JSON.stringify(sources)}`);
        
        return {
            success: errorCount === 0,
            enriched: enrichedCount,
            errors: errorCount,
            total: drivers.length,
            sources
        };
    }

    // Mettre à jour la base de données d'inférence
    updateInferenceDB(newData) {
        try {
            // Fusionner avec les données existantes
            Object.assign(this.tuyaInferenceDB.modelIdMapping, newData.modelIdMapping || {});
            Object.assign(this.tuyaInferenceDB.manufacturerMapping, newData.manufacturerMapping || {});
            
            // Sauvegarder
            const dbPath = path.join(this.dataDir, 'tuya-inference-db.json');
            fs.writeFileSync(dbPath, JSON.stringify(this.tuyaInferenceDB, null, 2));
            
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Fonction utilitaire pour les logs
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const emoji = {
        'INFO': 'ℹ️',
        'SUCCESS': '✅',
        'WARN': '⚠️',
        'ERROR': '❌'
    };
    console.log(`[${timestamp}] [${level}] ${emoji[level] || ''} ${message}`);
}

// Export pour utilisation dans d'autres scripts
module.exports = { SmartEnrichDrivers, log };

// Exécution directe si appelé directement
if (require.main === module) {
    const enricher = new SmartEnrichDrivers();
    enricher.enrichAllDrivers().then(result => {
        log(`🎉 Enrichissement terminé: ${result.enriched} drivers enrichis`, 'SUCCESS');
        process.exit(result.success ? 0 : 1);
    }).catch(error => {
        log(`❌ Erreur fatale: ${error.message}`, 'ERROR');
        process.exit(1);
    });
} 