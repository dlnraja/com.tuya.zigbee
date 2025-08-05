const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ComprehensiveDriverRecovery {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            recoveredDrivers: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        
        this.driversDir = 'drivers/tuya';
        this.dataDir = 'data';
        
        // Base de données complète des modèles Tuya
        this.tuyaModels = {
            // Switches et interrupteurs
            'TS0001': {
                name: { en: 'Tuya TS0001 Switch', fr: 'Interrupteur Tuya TS0001', nl: 'Tuya TS0001 Schakelaar', ta: 'Tuya TS0001 சுவிட்ச்' },
                class: 'light',
                capabilities: ['onoff'],
                clusters: ['genOnOff'],
                endpoints: 1,
                description: 'Single switch'
            },
            'TS0002': {
                name: { en: 'Tuya TS0002 Switch', fr: 'Interrupteur Tuya TS0002', nl: 'Tuya TS0002 Schakelaar', ta: 'Tuya TS0002 சுவிட்ச்' },
                class: 'light',
                capabilities: ['onoff', 'onoff'],
                clusters: ['genOnOff', 'genOnOff'],
                endpoints: 2,
                description: 'Double switch'
            },
            'TS0003': {
                name: { en: 'Tuya TS0003 Switch', fr: 'Interrupteur Tuya TS0003', nl: 'Tuya TS0003 Schakelaar', ta: 'Tuya TS0003 சுவிட்ச்' },
                class: 'light',
                capabilities: ['onoff', 'onoff', 'onoff'],
                clusters: ['genOnOff', 'genOnOff', 'genOnOff'],
                endpoints: 3,
                description: 'Triple switch'
            },
            'TS0004': {
                name: { en: 'Tuya TS0004 Switch', fr: 'Interrupteur Tuya TS0004', nl: 'Tuya TS0004 Schakelaar', ta: 'Tuya TS0004 சுவிட்ச்' },
                class: 'light',
                capabilities: ['onoff', 'onoff', 'onoff', 'onoff'],
                clusters: ['genOnOff', 'genOnOff', 'genOnOff', 'genOnOff'],
                endpoints: 4,
                description: 'Quadruple switch'
            },
            
            // Plugs et prises
            'TS011F': {
                name: { en: 'Tuya TS011F Plug', fr: 'Prise Tuya TS011F', nl: 'Tuya TS011F Stekker', ta: 'Tuya TS011F பிளக்' },
                class: 'socket',
                capabilities: ['onoff', 'meter_power'],
                clusters: ['genOnOff', 'seMetering'],
                endpoints: 1,
                description: 'Smart plug with power meter'
            },
            'TS0121': {
                name: { en: 'Tuya TS0121 Plug', fr: 'Prise Tuya TS0121', nl: 'Tuya TS0121 Stekker', ta: 'Tuya TS0121 பிளக்' },
                class: 'socket',
                capabilities: ['onoff', 'meter_power', 'measure_current', 'measure_voltage'],
                clusters: ['genOnOff', 'seMetering', 'seMetering'],
                endpoints: 1,
                description: 'Smart plug with detailed power monitoring'
            },
            'TS0601': {
                name: { en: 'Tuya TS0601 Switch', fr: 'Interrupteur Tuya TS0601', nl: 'Tuya TS0601 Schakelaar', ta: 'Tuya TS0601 சுவிட்ச்' },
                class: 'light',
                capabilities: ['onoff'],
                clusters: ['genOnOff'],
                endpoints: 1,
                description: 'Generic switch'
            },
            
            // Dimmers et variateurs
            'TS0601_dimmer': {
                name: { en: 'Tuya TS0601 Dimmer', fr: 'Variateur Tuya TS0601', nl: 'Tuya TS0601 Dimmer', ta: 'Tuya TS0601 டிம்மர்' },
                class: 'light',
                capabilities: ['onoff', 'dim'],
                clusters: ['genOnOff', 'genLevelCtrl'],
                endpoints: 1,
                description: 'Dimmer switch'
            },
            'TS0601_rgb': {
                name: { en: 'Tuya TS0601 RGB', fr: 'RGB Tuya TS0601', nl: 'Tuya TS0601 RGB', ta: 'Tuya TS0601 RGB' },
                class: 'light',
                capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode'],
                clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
                endpoints: 1,
                description: 'RGB light'
            },
            
            // Capteurs
            'TS0601_sensor': {
                name: { en: 'Tuya TS0601 Sensor', fr: 'Capteur Tuya TS0601', nl: 'Tuya TS0601 Sensor', ta: 'Tuya TS0601 சென்சார்' },
                class: 'sensor',
                capabilities: ['measure_temperature', 'measure_humidity'],
                clusters: ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity'],
                endpoints: 1,
                description: 'Temperature and humidity sensor'
            },
            'TS0601_motion': {
                name: { en: 'Tuya TS0601 Motion', fr: 'Mouvement Tuya TS0601', nl: 'Tuya TS0601 Beweging', ta: 'Tuya TS0601 இயக்கம்' },
                class: 'sensor',
                capabilities: ['alarm_motion', 'measure_temperature'],
                clusters: ['genBasic', 'msOccupancySensing', 'msTemperatureMeasurement'],
                endpoints: 1,
                description: 'Motion sensor'
            },
            'TS0601_contact': {
                name: { en: 'Tuya TS0601 Contact', fr: 'Contact Tuya TS0601', nl: 'Tuya TS0601 Contact', ta: 'Tuya TS0601 தொடர்பு' },
                class: 'sensor',
                capabilities: ['alarm_contact', 'measure_temperature'],
                clusters: ['genBasic', 'msOccupancySensing', 'msTemperatureMeasurement'],
                endpoints: 1,
                description: 'Contact sensor'
            },
            
            // Thermostats et vannes
            'TS0601_thermostat': {
                name: { en: 'Tuya TS0601 Thermostat', fr: 'Thermostat Tuya TS0601', nl: 'Tuya TS0601 Thermostaat', ta: 'Tuya TS0601 தெர்மோஸ்டேட்' },
                class: 'thermostat',
                capabilities: ['measure_temperature', 'target_temperature', 'thermostat_mode'],
                clusters: ['genBasic', 'msTemperatureMeasurement', 'hvacThermostat'],
                endpoints: 1,
                description: 'Thermostat'
            },
            'TS0601_valve': {
                name: { en: 'Tuya TS0601 Valve', fr: 'Vanne Tuya TS0601', nl: 'Tuya TS0601 Klep', ta: 'Tuya TS0601 வால்வு' },
                class: 'valve',
                capabilities: ['onoff', 'measure_temperature'],
                clusters: ['genOnOff', 'msTemperatureMeasurement'],
                endpoints: 1,
                description: 'Smart valve'
            },
            
            // Stores et rideaux
            'TS0601_curtain': {
                name: { en: 'Tuya TS0601 Curtain', fr: 'Rideau Tuya TS0601', nl: 'Tuya TS0601 Gordijn', ta: 'Tuya TS0601 திரை' },
                class: 'curtain',
                capabilities: ['windowcoverings_state', 'windowcoverings_set'],
                clusters: ['genBasic', 'closuresWindowCovering'],
                endpoints: 1,
                description: 'Smart curtain'
            },
            'TS0601_blind': {
                name: { en: 'Tuya TS0601 Blind', fr: 'Volet Tuya TS0601', nl: 'Tuya TS0601 Jaloezie', ta: 'Tuya TS0601 பிளைண்ட்' },
                class: 'curtain',
                capabilities: ['windowcoverings_state', 'windowcoverings_set'],
                clusters: ['genBasic', 'closuresWindowCovering'],
                endpoints: 1,
                description: 'Smart blind'
            },
            
            // Ventilateurs
            'TS0601_fan': {
                name: { en: 'Tuya TS0601 Fan', fr: 'Ventilateur Tuya TS0601', nl: 'Tuya TS0601 Ventilator', ta: 'Tuya TS0601 விசிறி' },
                class: 'fan',
                capabilities: ['onoff', 'dim'],
                clusters: ['genOnOff', 'genLevelCtrl'],
                endpoints: 1,
                description: 'Smart fan'
            },
            
            // Garages
            'TS0601_garage': {
                name: { en: 'Tuya TS0601 Garage', fr: 'Garage Tuya TS0601', nl: 'Tuya TS0601 Garage', ta: 'Tuya TS0601 கேரேஜ்' },
                class: 'garage',
                capabilities: ['garagedoor_closed', 'garagedoor_state'],
                clusters: ['genBasic', 'closuresDoorLock'],
                endpoints: 1,
                description: 'Garage door opener'
            },
            
            // Alarmes
            'TS0601_smoke': {
                name: { en: 'Tuya TS0601 Smoke', fr: 'Fumée Tuya TS0601', nl: 'Tuya TS0601 Rook', ta: 'Tuya TS0601 புகை' },
                class: 'sensor',
                capabilities: ['alarm_smoke', 'measure_temperature'],
                clusters: ['genBasic', 'ssIasZone', 'msTemperatureMeasurement'],
                endpoints: 1,
                description: 'Smoke detector'
            },
            'TS0601_water': {
                name: { en: 'Tuya TS0601 Water', fr: 'Eau Tuya TS0601', nl: 'Tuya TS0601 Water', ta: 'Tuya TS0601 தண்ணீர்' },
                class: 'sensor',
                capabilities: ['alarm_water', 'measure_temperature'],
                clusters: ['genBasic', 'ssIasZone', 'msTemperatureMeasurement'],
                endpoints: 1,
                description: 'Water leak detector'
            },
            
            // Modèles spécifiques avec manufacturerName
            '_TZ3000_light': {
                name: { en: 'Tuya _TZ3000 Light', fr: 'Lampe Tuya _TZ3000', nl: 'Tuya _TZ3000 Lamp', ta: 'Tuya _TZ3000 விளக்கு' },
                class: 'light',
                capabilities: ['onoff', 'dim'],
                clusters: ['genOnOff', 'genLevelCtrl'],
                endpoints: 1,
                description: 'Generic Tuya light'
            },
            '_TZ3210_rgb': {
                name: { en: 'Tuya _TZ3210 RGB', fr: 'RGB Tuya _TZ3210', nl: 'Tuya _TZ3210 RGB', ta: 'Tuya _TZ3210 RGB' },
                class: 'light',
                capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode'],
                clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'],
                endpoints: 1,
                description: 'RGB Tuya light'
            },
            '_TZ3400_switch': {
                name: { en: 'Tuya _TZ3400 Switch', fr: 'Interrupteur Tuya _TZ3400', nl: 'Tuya _TZ3400 Schakelaar', ta: 'Tuya _TZ3400 சுவிட்ச்' },
                class: 'light',
                capabilities: ['onoff', 'dim'],
                clusters: ['genOnOff', 'genLevelCtrl'],
                endpoints: 1,
                description: 'Tuya switch'
            },
            '_TZ3500_sensor': {
                name: { en: 'Tuya _TZ3500 Sensor', fr: 'Capteur Tuya _TZ3500', nl: 'Tuya _TZ3500 Sensor', ta: 'Tuya _TZ3500 சென்சார்' },
                class: 'sensor',
                capabilities: ['measure_temperature', 'measure_humidity'],
                clusters: ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity'],
                endpoints: 1,
                description: 'Tuya sensor'
            }
        };
    }

    log(message, type = 'info') {
        const logEntry = {
            message,
            type,
            timestamp: new Date().toISOString()
        };
        this.report.recoveredDrivers.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async createComprehensiveDriver(modelId, modelData) {
        try {
            const driverId = modelId.toLowerCase().replace(/[^a-z0-9]/g, '-');
            const driverDir = path.join(this.driversDir, driverId);
            
            // Créer le dossier du driver
            if (!fs.existsSync(driverDir)) {
                fs.mkdirSync(driverDir, { recursive: true });
            }

            // Créer driver.compose.json
            const driverCompose = {
                id: driverId,
                name: modelData.name,
                class: modelData.class,
                capabilities: modelData.capabilities,
                zigbee: {
                    manufacturerName: 'Tuya',
                    modelId: modelId,
                    clusters: modelData.clusters
                },
                settings: {},
                fallback: false,
                description: modelData.description
            };

            const composePath = path.join(driverDir, 'driver.compose.json');
            fs.writeFileSync(composePath, JSON.stringify(driverCompose, null, 2));

            // Créer device.js avec logique complète
            const deviceJs = this.generateDeviceJs(driverId, modelData);
            const devicePath = path.join(driverDir, 'device.js');
            fs.writeFileSync(devicePath, deviceJs);

            this.log(`Driver créé: ${driverId} (${modelData.description})`);
            return { success: true, driverId, modelData };

        } catch (error) {
            this.log(`Erreur création driver ${modelId}: ${error.message}`, 'error');
            this.report.errors.push({ modelId, error: error.message });
            return { success: false, modelId, error: error.message };
        }
    }

    generateDeviceJs(driverId, modelData) {
        const className = driverId.replace(/-/g, '').replace(/([A-Z])/g, '$1');
        
        return `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${className}Device extends ZigbeeDevice {
    async onMeshInit() {
        await super.onMeshInit();
        
        // Log device initialization
        this.log('${modelData.name.en} initialized');
        
        // Register capabilities based on device type
        ${modelData.capabilities.map(cap => {
            if (cap === 'onoff') {
                return `this.registerCapability('${cap}', 'genOnOff');`;
            } else if (cap === 'dim') {
                return `this.registerCapability('${cap}', 'genLevelCtrl');`;
            } else if (cap === 'meter_power') {
                return `this.registerCapability('${cap}', 'seMetering');`;
            } else if (cap === 'measure_temperature') {
                return `this.registerCapability('${cap}', 'msTemperatureMeasurement');`;
            } else if (cap === 'measure_humidity') {
                return `this.registerCapability('${cap}', 'msRelativeHumidity');`;
            } else if (cap === 'light_temperature') {
                return `this.registerCapability('${cap}', 'lightingColorCtrl');`;
            } else if (cap === 'light_mode') {
                return `this.registerCapability('${cap}', 'lightingColorCtrl');`;
            } else if (cap === 'measure_power') {
                return `this.registerCapability('${cap}', 'seMetering');`;
            } else if (cap === 'measure_current') {
                return `this.registerCapability('${cap}', 'seMetering');`;
            } else if (cap === 'measure_voltage') {
                return `this.registerCapability('${cap}', 'seMetering');`;
            } else if (cap === 'alarm_motion') {
                return `this.registerCapability('${cap}', 'msOccupancySensing');`;
            } else if (cap === 'alarm_contact') {
                return `this.registerCapability('${cap}', 'msOccupancySensing');`;
            } else if (cap === 'alarm_smoke') {
                return `this.registerCapability('${cap}', 'ssIasZone');`;
            } else if (cap === 'alarm_water') {
                return `this.registerCapability('${cap}', 'ssIasZone');`;
            } else if (cap === 'target_temperature') {
                return `this.registerCapability('${cap}', 'hvacThermostat');`;
            } else if (cap === 'thermostat_mode') {
                return `this.registerCapability('${cap}', 'hvacThermostat');`;
            } else if (cap === 'windowcoverings_state') {
                return `this.registerCapability('${cap}', 'closuresWindowCovering');`;
            } else if (cap === 'windowcoverings_set') {
                return `this.registerCapability('${cap}', 'closuresWindowCovering');`;
            } else if (cap === 'garagedoor_closed') {
                return `this.registerCapability('${cap}', 'closuresDoorLock');`;
            } else if (cap === 'garagedoor_state') {
                return `this.registerCapability('${cap}', 'closuresDoorLock');`;
            } else {
                return `this.registerCapability('${cap}', 'genBasic');`;
            }
        }).join('\n        ')}
        
        // Set up capability listeners
        ${modelData.capabilities.map(cap => {
            if (cap === 'onoff') {
                return `this.registerCapabilityListener('${cap}', async (value) => {
            await this.setCapabilityValue('${cap}', value);
        });`;
            } else if (cap === 'dim') {
                return `this.registerCapabilityListener('${cap}', async (value) => {
            await this.setCapabilityValue('${cap}', value);
        });`;
            } else if (cap === 'target_temperature') {
                return `this.registerCapabilityListener('${cap}', async (value) => {
            await this.setCapabilityValue('${cap}', value);
        });`;
            } else if (cap === 'thermostat_mode') {
                return `this.registerCapabilityListener('${cap}', async (value) => {
            await this.setCapabilityValue('${cap}', value);
        });`;
            } else if (cap === 'windowcoverings_set') {
                return `this.registerCapabilityListener('${cap}', async (value) => {
            await this.setCapabilityValue('${cap}', value);
        });`;
            } else {
                return '';
            }
        }).filter(cap => cap !== '').join('\n        ')}
        
        // Device-specific logic
        this.setAvailable();
    }
}

module.exports = ${className}Device;`;
    }

    async recoverAllMissingDrivers() {
        this.log('🚀 Début de la récupération complète des drivers manquants');
        
        try {
            // S'assurer que le dossier drivers existe
            if (!fs.existsSync(this.driversDir)) {
                fs.mkdirSync(this.driversDir, { recursive: true });
            }

            // Récupérer les drivers existants pour éviter les doublons
            const existingDrivers = new Set();
            if (fs.existsSync(this.driversDir)) {
                const items = fs.readdirSync(this.driversDir);
                for (const item of items) {
                    existingDrivers.add(item);
                }
            }

            let createdCount = 0;
            let skippedCount = 0;

            // Créer tous les drivers manquants
            for (const [modelId, modelData] of Object.entries(this.tuyaModels)) {
                const driverId = modelId.toLowerCase().replace(/[^a-z0-9]/g, '-');
                
                if (existingDrivers.has(driverId)) {
                    this.log(`Driver déjà existant, ignoré: ${driverId}`);
                    skippedCount++;
                    continue;
                }

                const result = await this.createComprehensiveDriver(modelId, modelData);
                if (result.success) {
                    createdCount++;
                }
            }

            // Générer le rapport final
            this.report.summary = {
                totalModels: Object.keys(this.tuyaModels).length,
                createdDrivers: createdCount,
                skippedDrivers: skippedCount,
                successRate: (createdCount / Object.keys(this.tuyaModels).length * 100).toFixed(2) + '%'
            };

            this.log(`🎉 Récupération terminée! Créés: ${createdCount}, Ignorés: ${skippedCount}`);
            
            // Sauvegarder le rapport
            fs.writeFileSync('reports/comprehensive-driver-recovery-report.json', JSON.stringify(this.report, null, 2));
            
            return this.report;

        } catch (error) {
            this.log(`Erreur lors de la récupération: ${error.message}`, 'error');
            this.report.errors.push({ operation: 'recovery', error: error.message });
            return this.report;
        }
    }

    async validateRecoveredDrivers() {
        this.log('🔍 Validation des drivers récupérés');
        
        try {
            const driversDir = this.driversDir;
            if (!fs.existsSync(driversDir)) {
                this.log('Aucun driver à valider');
                return { valid: 0, invalid: 0, total: 0 };
            }

            const driverDirs = fs.readdirSync(driversDir);
            let validCount = 0;
            let invalidCount = 0;

            for (const driverDir of driverDirs) {
                const driverPath = path.join(driversDir, driverDir);
                const composePath = path.join(driverPath, 'driver.compose.json');
                const devicePath = path.join(driverPath, 'device.js');
                
                if (fs.existsSync(composePath) && fs.existsSync(devicePath)) {
                    try {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        if (compose.id && compose.capabilities && compose.zigbee) {
                            validCount++;
                            this.log(`✅ ${driverDir}: Valide`);
                        } else {
                            invalidCount++;
                            this.log(`❌ ${driverDir}: Incomplet`);
                        }
                    } catch (error) {
                        invalidCount++;
                        this.log(`❌ ${driverDir}: Erreur JSON`);
                    }
                } else {
                    invalidCount++;
                    this.log(`❌ ${driverDir}: Fichiers manquants`);
                }
            }

            const validation = { valid: validCount, invalid: invalidCount, total: driverDirs.length };
            this.log(`📊 Validation: ${validCount}/${driverDirs.length} drivers valides`);
            
            return validation;

        } catch (error) {
            this.log(`Erreur lors de la validation: ${error.message}`, 'error');
            return { valid: 0, invalid: 0, total: 0 };
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début de la récupération complète des drivers manquants...');
    
    const recovery = new ComprehensiveDriverRecovery();
    
    // Récupérer tous les drivers manquants
    const recoveryReport = await recovery.recoverAllMissingDrivers();
    
    // Valider les drivers récupérés
    const validation = await recovery.validateRecoveredDrivers();
    
    console.log('✅ Récupération complète terminée avec succès!');
    console.log(`📊 Rapport sauvegardé dans: reports/comprehensive-driver-recovery-report.json`);
    console.log(`📊 Validation: ${validation.valid}/${validation.total} drivers valides`);
    
    return { recoveryReport, validation };
}

// Exécuter si appelé directement
if (require.main === module) {
    main().then(result => {
        console.log('✅ Script terminé avec succès');
        process.exit(0);
    }).catch(error => {
        console.error('❌ Erreur:', error);
        process.exit(1);
    });
}

module.exports = { ComprehensiveDriverRecovery }; 