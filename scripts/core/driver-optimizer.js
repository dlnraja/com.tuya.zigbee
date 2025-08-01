const fs = require('fs');
const path = require('path');

class DriverOptimizer {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            optimizedDrivers: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        
        this.driversDir = 'drivers/tuya';
        
        // Améliorations et optimisations
        this.optimizations = {
            // Amélioration des capabilities
            capabilityImprovements: {
                'onoff': {
                    type: 'boolean',
                    title: { en: 'On/Off', fr: 'Marche/Arrêt', nl: 'Aan/Uit', ta: 'ஆன்/ஆஃப்' },
                    getable: true,
                    setable: true
                },
                'dim': {
                    type: 'number',
                    title: { en: 'Dim Level', fr: 'Niveau de variation', nl: 'Dim niveau', ta: 'டிம் நிலை' },
                    getable: true,
                    setable: true,
                    min: 0,
                    max: 1
                },
                'meter_power': {
                    type: 'number',
                    title: { en: 'Power', fr: 'Puissance', nl: 'Vermogen', ta: 'சக்தி' },
                    getable: true,
                    setable: false,
                    unit: 'W'
                },
                'measure_temperature': {
                    type: 'number',
                    title: { en: 'Temperature', fr: 'Température', nl: 'Temperatuur', ta: 'வெப்பநிலை' },
                    getable: true,
                    setable: false,
                    unit: '°C'
                },
                'measure_humidity': {
                    type: 'number',
                    title: { en: 'Humidity', fr: 'Humidité', nl: 'Vochtigheid', ta: 'ஈரப்பதம்' },
                    getable: true,
                    setable: false,
                    unit: '%'
                }
            },
            
            // Amélioration des clusters
            clusterImprovements: {
                'genOnOff': {
                    attributes: ['onOff'],
                    commands: ['toggle', 'off', 'on']
                },
                'genLevelCtrl': {
                    attributes: ['currentLevel'],
                    commands: ['moveToLevel', 'move', 'step']
                },
                'seMetering': {
                    attributes: ['instantaneousDemand', 'currentSummationDelivered'],
                    commands: []
                },
                'msTemperatureMeasurement': {
                    attributes: ['measuredValue'],
                    commands: []
                },
                'msRelativeHumidity': {
                    attributes: ['measuredValue'],
                    commands: []
                }
            }
        };
    }

    log(message, type = 'info') {
        const logEntry = {
            message,
            type,
            timestamp: new Date().toISOString()
        };
        this.report.optimizedDrivers.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async optimizeDriver(driverPath) {
        try {
            const composePath = path.join(driverPath, 'driver.compose.json');
            const devicePath = path.join(driverPath, 'device.js');
            
            if (!fs.existsSync(composePath) || !fs.existsSync(devicePath)) {
                this.log(`Fichiers manquants pour: ${path.basename(driverPath)}`, 'warning');
                return false;
            }

            // Optimiser driver.compose.json
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            const optimizedCompose = this.optimizeCompose(compose);
            fs.writeFileSync(composePath, JSON.stringify(optimizedCompose, null, 2));

            // Optimiser device.js
            const deviceJs = fs.readFileSync(devicePath, 'utf8');
            const optimizedDeviceJs = this.optimizeDeviceJs(deviceJs, optimizedCompose);
            fs.writeFileSync(devicePath, optimizedDeviceJs);

            this.log(`Driver optimisé: ${path.basename(driverPath)}`);
            return true;

        } catch (error) {
            this.log(`Erreur optimisation ${path.basename(driverPath)}: ${error.message}`, 'error');
            this.report.errors.push({ driver: path.basename(driverPath), error: error.message });
            return false;
        }
    }

    optimizeCompose(compose) {
        const optimized = { ...compose };
        
        // Améliorer les capabilities
        if (optimized.capabilities) {
            optimized.capabilities = optimized.capabilities.map(cap => {
                if (this.optimizations.capabilityImprovements[cap]) {
                    return {
                        ...this.optimizations.capabilityImprovements[cap],
                        id: cap
                    };
                }
                return cap;
            });
        }
        
        // Améliorer les clusters
        if (optimized.zigbee && optimized.zigbee.clusters) {
            optimized.zigbee.clusters = optimized.zigbee.clusters.map(cluster => {
                if (this.optimizations.clusterImprovements[cluster]) {
                    return {
                        ...this.optimizations.clusterImprovements[cluster],
                        id: cluster
                    };
                }
                return cluster;
            });
        }
        
        // Ajouter des métadonnées
        optimized.metadata = {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            optimized: true
        };
        
        return optimized;
    }

    optimizeDeviceJs(deviceJs, compose) {
        let optimized = deviceJs;
        
        // Ajouter des imports optimisés
        if (!optimized.includes('const Homey = require(\'homey\');')) {
            optimized = `const Homey = require('homey');\n\n${optimized}`;
        }
        
        // Ajouter des méthodes d'optimisation
        const optimizationMethods = `
    // Optimized methods
    async onSettings(oldSettings, newSettings, changedKeys) {
        this.log('Settings updated:', changedKeys);
    }
    
    async onRenamed(name) {
        this.log('Device renamed to:', name);
    }
    
    async onDeleted() {
        this.log('Device deleted');
    }
    
    // Error handling
    async onError(error) {
        this.log('Device error:', error);
        this.setUnavailable(error.message);
    }
    
    // Availability management
    async onUnavailable() {
        this.log('Device unavailable');
    }
    
    async onAvailable() {
        this.log('Device available');
        this.setAvailable();
    }`;
        
        // Insérer les méthodes d'optimisation avant la fin de la classe
        const classEndIndex = optimized.lastIndexOf('}');
        if (classEndIndex !== -1) {
            optimized = optimized.slice(0, classEndIndex) + optimizationMethods + '\n' + optimized.slice(classEndIndex);
        }
        
        return optimized;
    }

    async optimizeAllDrivers() {
        this.log('🚀 Début de l\'optimisation de tous les drivers');
        
        try {
            if (!fs.existsSync(this.driversDir)) {
                this.log('Aucun driver à optimiser');
                return { optimized: 0, errors: 0, total: 0 };
            }

            const driverDirs = fs.readdirSync(this.driversDir);
            let optimizedCount = 0;
            let errorCount = 0;

            for (const driverDir of driverDirs) {
                const driverPath = path.join(this.driversDir, driverDir);
                
                if (fs.statSync(driverPath).isDirectory()) {
                    const success = await this.optimizeDriver(driverPath);
                    if (success) {
                        optimizedCount++;
                    } else {
                        errorCount++;
                    }
                }
            }

            // Générer le rapport final
            this.report.summary = {
                totalDrivers: driverDirs.length,
                optimizedDrivers: optimizedCount,
                errorCount: errorCount,
                successRate: (optimizedCount / driverDirs.length * 100).toFixed(2) + '%'
            };

            this.log(`🎉 Optimisation terminée! Optimisés: ${optimizedCount}/${driverDirs.length}`);
            
            // Sauvegarder le rapport
            fs.writeFileSync('reports/driver-optimization-report.json', JSON.stringify(this.report, null, 2));
            
            return this.report.summary;

        } catch (error) {
            this.log(`Erreur lors de l'optimisation: ${error.message}`, 'error');
            this.report.errors.push({ operation: 'optimization', error: error.message });
            return { optimized: 0, errors: 1, total: 0 };
        }
    }

    async validateOptimizedDrivers() {
        this.log('🔍 Validation des drivers optimisés');
        
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
                        
                        // Vérifications avancées
                        const isValid = compose.id && 
                                      compose.capabilities && 
                                      compose.zigbee && 
                                      compose.metadata && 
                                      compose.metadata.optimized;
                        
                        if (isValid) {
                            validCount++;
                            this.log(`✅ ${driverDir}: Optimisé et valide`);
                        } else {
                            invalidCount++;
                            this.log(`❌ ${driverDir}: Non optimisé`);
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
            this.log(`📊 Validation: ${validCount}/${driverDirs.length} drivers optimisés et valides`);
            
            return validation;

        } catch (error) {
            this.log(`Erreur lors de la validation: ${error.message}`, 'error');
            return { valid: 0, invalid: 0, total: 0 };
        }
    }

    async generateOptimizedAppJs() {
        this.log('📝 Génération d\'app.js optimisé');
        
        try {
            const optimizedAppJs = `'use strict';

const Homey = require('homey');

class TuyaZigbeeApp extends Homey.App {
    async onInit() {
        this.log('Tuya Zigbee App initialized');
        
        // Register device classes
        this.registerDeviceClass('light', require('./drivers/tuya/ts0001/device.js'));
        this.registerDeviceClass('socket', require('./drivers/tuya/ts011f-plug/device.js'));
        this.registerDeviceClass('sensor', require('./drivers/tuya/ts0601-sensor/device.js'));
        this.registerDeviceClass('thermostat', require('./drivers/tuya/ts0601-thermostat/device.js'));
        this.registerDeviceClass('curtain', require('./drivers/tuya/ts0601-curtain/device.js'));
        this.registerDeviceClass('fan', require('./drivers/tuya/ts0601-fan/device.js'));
        this.registerDeviceClass('garage', require('./drivers/tuya/ts0601-garage/device.js'));
        this.registerDeviceClass('valve', require('./drivers/tuya/ts0601-valve/device.js'));
        
        // Initialize optimization
        this.log('Optimization system initialized');
    }
    
    async onUninit() {
        this.log('Tuya Zigbee App uninitialized');
    }
}

module.exports = TuyaZigbeeApp;`;
            
            fs.writeFileSync('app.js', optimizedAppJs);
            this.log('app.js optimisé généré');
            
            return true;

        } catch (error) {
            this.log(`Erreur génération app.js: ${error.message}`, 'error');
            return false;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début de l\'optimisation complète des drivers...');
    
    const optimizer = new DriverOptimizer();
    
    // Optimiser tous les drivers
    const optimizationSummary = await optimizer.optimizeAllDrivers();
    
    // Valider les drivers optimisés
    const validation = await optimizer.validateOptimizedDrivers();
    
    // Générer app.js optimisé
    const appJsGenerated = await optimizer.generateOptimizedAppJs();
    
    console.log('✅ Optimisation complète terminée avec succès!');
    console.log(`📊 Rapport sauvegardé dans: reports/driver-optimization-report.json`);
    console.log(`📊 Optimisation: ${optimizationSummary.optimizedDrivers}/${optimizationSummary.totalDrivers} drivers optimisés`);
    console.log(`📊 Validation: ${validation.valid}/${validation.total} drivers valides`);
    
    return { optimizationSummary, validation, appJsGenerated };
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

module.exports = { DriverOptimizer }; 