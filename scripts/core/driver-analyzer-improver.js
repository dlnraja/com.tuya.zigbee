const fs = require('fs');
const path = require('path');

class DriverAnalyzerImprover {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            analyzedDrivers: [],
            improvedDrivers: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        this.driversDir = 'drivers';
        this.improvements = {
            capabilities: {
                onoff: { type: 'boolean', title: { en: 'On/Off', fr: 'Marche/Arrêt', nl: 'Aan/Uit', ta: 'ஆன்/ஆஃப்' }, getable: true, setable: true },
                dim: { type: 'number', title: { en: 'Dim Level', fr: 'Niveau de Dim', nl: 'Dim Niveau', ta: 'டிம் நிலை' }, getable: true, setable: true, min: 0, max: 100, unit: '%' },
                meter_power: { type: 'number', title: { en: 'Power', fr: 'Puissance', nl: 'Vermogen', ta: 'சக்தி' }, getable: true, setable: false, unit: 'W' },
                measure_current: { type: 'number', title: { en: 'Current', fr: 'Courant', nl: 'Stroom', ta: 'மின்னோட்டம்' }, getable: true, setable: false, unit: 'A' },
                measure_voltage: { type: 'number', title: { en: 'Voltage', fr: 'Tension', nl: 'Spanning', ta: 'மின்னழுத்தம்' }, getable: true, setable: false, unit: 'V' },
                measure_temperature: { type: 'number', title: { en: 'Temperature', fr: 'Température', nl: 'Temperatuur', ta: 'வெப்பநிலை' }, getable: true, setable: false, unit: '°C' },
                measure_humidity: { type: 'number', title: { en: 'Humidity', fr: 'Humidité', nl: 'Vochtigheid', ta: 'ஈரப்பதம்' }, getable: true, setable: false, unit: '%' },
                alarm_motion: { type: 'boolean', title: { en: 'Motion', fr: 'Mouvement', nl: 'Beweging', ta: 'இயக்கம்' }, getable: true, setable: false },
                alarm_contact: { type: 'boolean', title: { en: 'Contact', fr: 'Contact', nl: 'Contact', ta: 'தொடர்பு' }, getable: true, setable: false },
                alarm_smoke: { type: 'boolean', title: { en: 'Smoke', fr: 'Fumée', nl: 'Rook', ta: 'புகை' }, getable: true, setable: false },
                alarm_water: { type: 'boolean', title: { en: 'Water Leak', fr: 'Fuite d\'Eau', nl: 'Waterlek', ta: 'தண்ணீர் கசிவு' }, getable: true, setable: false },
                target_temperature: { type: 'number', title: { en: 'Target Temperature', fr: 'Température Cible', nl: 'Doeltemperatuur', ta: 'இலக்கு வெப்பநிலை' }, getable: true, setable: true, min: 5, max: 35, unit: '°C' },
                thermostat_mode: { type: 'string', title: { en: 'Thermostat Mode', fr: 'Mode Thermostat', nl: 'Thermostaat Modus', ta: 'தெர்மோஸ்டேட் பயன்முறை' }, getable: true, setable: true, options: ['heat', 'cool', 'auto'] },
                windowcoverings_state: { type: 'string', title: { en: 'Covering State', fr: 'État Couverture', nl: 'Bedekking Status', ta: 'மறைப்பு நிலை' }, getable: true, setable: false },
                windowcoverings_set: { type: 'number', title: { en: 'Covering Position', fr: 'Position Couverture', nl: 'Bedekking Positie', ta: 'மறைப்பு நிலை' }, getable: true, setable: true, min: 0, max: 100, unit: '%' },
                garagedoor_closed: { type: 'boolean', title: { en: 'Garage Door Closed', fr: 'Porte Garage Fermée', nl: 'Garage Deur Gesloten', ta: 'கேரேஜ் கதவு மூடப்பட்டது' }, getable: true, setable: false },
                garagedoor_state: { type: 'string', title: { en: 'Garage Door State', fr: 'État Porte Garage', nl: 'Garage Deur Status', ta: 'கேரேஜ் கதவு நிலை' }, getable: true, setable: false },
                light_temperature: { type: 'number', title: { en: 'Light Temperature', fr: 'Température Lumière', nl: 'Licht Temperatuur', ta: 'விளக்கு வெப்பநிலை' }, getable: true, setable: true, min: 2700, max: 6500, unit: 'K' },
                light_mode: { type: 'string', title: { en: 'Light Mode', fr: 'Mode Lumière', nl: 'Licht Modus', ta: 'விளக்கு பயன்முறை' }, getable: true, setable: true, options: ['color', 'temperature', 'white'] }
            },
            clusters: {
                genOnOff: {
                    attributes: ['onOff'],
                    commands: ['toggle', 'off', 'on']
                },
                genLevelCtrl: {
                    attributes: ['currentLevel'],
                    commands: ['move', 'step', 'stop', 'moveToLevel']
                },
                seMetering: {
                    attributes: ['currentSummationDelivered', 'instantaneousDemand'],
                    commands: []
                },
                msTemperatureMeasurement: {
                    attributes: ['measuredValue'],
                    commands: []
                },
                msRelativeHumidity: {
                    attributes: ['measuredValue'],
                    commands: []
                },
                msOccupancySensing: {
                    attributes: ['occupancy'],
                    commands: []
                },
                ssIasZone: {
                    attributes: ['zoneState'],
                    commands: []
                },
                hvacThermostat: {
                    attributes: ['localTemperature', 'occupiedHeatingSetpoint'],
                    commands: ['setWeeklySchedule', 'getWeeklySchedule', 'clearWeeklySchedule']
                },
                closuresWindowCovering: {
                    attributes: ['currentPositionLiftPercentage'],
                    commands: ['upOpen', 'downClose', 'stop']
                },
                closuresDoorLock: {
                    attributes: ['lockState'],
                    commands: ['lockDoor', 'unlockDoor']
                },
                lightingColorCtrl: {
                    attributes: ['currentHue', 'currentSaturation', 'currentX', 'currentY'],
                    commands: ['moveToHue', 'stepHue', 'moveToSaturation', 'stepSaturation', 'moveToColor', 'stepColor']
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
        this.report.analyzedDrivers.push(logEntry);
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    async analyzeDriver(driverPath) {
        try {
            const composePath = path.join(driverPath, 'driver.compose.json');
            const devicePath = path.join(driverPath, 'device.js');
            
            if (!fs.existsSync(composePath) || !fs.existsSync(devicePath)) {
                this.log(`Driver incomplet: ${driverPath}`, 'warning');
                return null;
            }

            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            const deviceJs = fs.readFileSync(devicePath, 'utf8');

            const analysis = {
                id: compose.id,
                name: compose.name,
                class: compose.class,
                capabilities: compose.capabilities || [],
                clusters: compose.zigbee?.clusters || [],
                hasDeviceJs: true,
                hasComposeJson: true,
                needsImprovement: false,
                improvements: []
            };

            // Analyser les capacités
            for (const capability of analysis.capabilities) {
                if (!this.improvements.capabilities[capability]) {
                    analysis.needsImprovement = true;
                    analysis.improvements.push(`Capability ${capability} needs detailed properties`);
                }
            }

            // Analyser les clusters
            for (const cluster of analysis.clusters) {
                if (!this.improvements.clusters[cluster]) {
                    analysis.needsImprovement = true;
                    analysis.improvements.push(`Cluster ${cluster} needs detailed attributes/commands`);
                }
            }

            // Vérifier les méthodes de cycle de vie
            const lifecycleMethods = ['onSettings', 'onRenamed', 'onDeleted', 'onError', 'onUnavailable', 'onAvailable'];
            for (const method of lifecycleMethods) {
                if (!deviceJs.includes(`async ${method}`)) {
                    analysis.needsImprovement = true;
                    analysis.improvements.push(`Missing lifecycle method: ${method}`);
                }
            }

            this.log(`Driver analysé: ${analysis.id} (${analysis.needsImprovement ? 'Amélioration nécessaire' : 'OK'})`);
            return analysis;

        } catch (error) {
            this.log(`Erreur analyse driver ${driverPath}: ${error.message}`, 'error');
            return null;
        }
    }

    async improveDriver(driverPath, analysis) {
        try {
            const composePath = path.join(driverPath, 'driver.compose.json');
            const devicePath = path.join(driverPath, 'device.js');
            
            // Améliorer driver.compose.json
            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
            
            // Améliorer les capacités
            if (compose.capabilities) {
                for (const capability of compose.capabilities) {
                    if (this.improvements.capabilities[capability]) {
                        if (!compose.capabilityProperties) {
                            compose.capabilityProperties = {};
                        }
                        compose.capabilityProperties[capability] = this.improvements.capabilities[capability];
                    }
                }
            }

            // Améliorer les clusters
            if (compose.zigbee && compose.zigbee.clusters) {
                for (const cluster of compose.zigbee.clusters) {
                    if (this.improvements.clusters[cluster]) {
                        if (!compose.clusterDetails) {
                            compose.clusterDetails = {};
                        }
                        compose.clusterDetails[cluster] = this.improvements.clusters[cluster];
                    }
                }
            }

            // Ajouter des métadonnées
            compose.metadata = {
                ...compose.metadata,
                improvedAt: new Date().toISOString(),
                version: '3.1.0',
                analysis: analysis
            };

            fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));

            // Améliorer device.js
            let deviceJs = fs.readFileSync(devicePath, 'utf8');
            
            // Ajouter les méthodes de cycle de vie manquantes
            const lifecycleMethods = [
                'async onSettings(oldSettings, newSettings, changedKeys) { this.log("Settings updated:", changedKeys); }',
                'async onRenamed(name) { this.log("Device renamed to:", name); }',
                'async onDeleted() { this.log("Device deleted"); }',
                'async onError(error) { this.log("Device error:", error); }',
                'async onUnavailable() { this.log("Device unavailable"); }',
                'async onAvailable() { this.log("Device available"); }'
            ];

            for (const method of lifecycleMethods) {
                const methodName = method.split('(')[0].split(' ').pop();
                if (!deviceJs.includes(`async ${methodName}`)) {
                    // Insérer avant le dernier }
                    const lastBraceIndex = deviceJs.lastIndexOf('}');
                    deviceJs = deviceJs.slice(0, lastBraceIndex) + `    ${method}\n    ` + deviceJs.slice(lastBraceIndex);
                }
            }

            // Ajouter la gestion d'erreurs améliorée
            if (!deviceJs.includes('try {') && !deviceJs.includes('catch (error)')) {
                const onMeshInitMatch = deviceJs.match(/async onMeshInit\(\) \{([^}]+)\}/);
                if (onMeshInitMatch) {
                    const improvedOnMeshInit = `async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('${compose.name?.en || compose.id} initialized');
            
            // Register capabilities with error handling
            ${compose.capabilities?.map(cap => `try { this.registerCapability('${cap}', 'genOnOff'); } catch (error) { this.log('Error registering capability ${cap}:', error); }`).join('\n            ') || ''}
            
        } catch (error) {
            this.log('Error during mesh init:', error);
            throw error;
        }
    }`;
                    
                    deviceJs = deviceJs.replace(/async onMeshInit\(\) \{([^}]+)\}/, improvedOnMeshInit);
                }
            }

            fs.writeFileSync(devicePath, deviceJs);

            this.log(`Driver amélioré: ${analysis.id}`);
            return true;

        } catch (error) {
            this.log(`Erreur amélioration driver ${driverPath}: ${error.message}`, 'error');
            return false;
        }
    }

    async createMissingDrivers() {
        this.log('🔧 Création des drivers manquants...');
        
        try {
            const missingDrivers = [
                {
                    id: 'TS0005',
                    name: { en: 'Tuya TS0005 Switch', fr: 'Interrupteur Tuya TS0005', nl: 'Tuya TS0005 Schakelaar', ta: 'Tuya TS0005 சுவிட்ச்' },
                    class: 'light',
                    capabilities: ['onoff', 'onoff', 'onoff', 'onoff', 'onoff'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0005', clusters: ['genOnOff', 'genOnOff', 'genOnOff', 'genOnOff', 'genOnOff'] }
                },
                {
                    id: 'TS0006',
                    name: { en: 'Tuya TS0006 Switch', fr: 'Interrupteur Tuya TS0006', nl: 'Tuya TS0006 Schakelaar', ta: 'Tuya TS0006 சுவிட்ச்' },
                    class: 'light',
                    capabilities: ['onoff', 'onoff', 'onoff', 'onoff', 'onoff', 'onoff'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0006', clusters: ['genOnOff', 'genOnOff', 'genOnOff', 'genOnOff', 'genOnOff', 'genOnOff'] }
                },
                {
                    id: 'TS011F_2',
                    name: { en: 'Tuya TS011F Plug V2', fr: 'Prise Tuya TS011F V2', nl: 'Tuya TS011F Stekker V2', ta: 'Tuya TS011F பிளக் V2' },
                    class: 'socket',
                    capabilities: ['onoff', 'meter_power', 'measure_current', 'measure_voltage'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS011F', clusters: ['genOnOff', 'seMetering'] }
                },
                {
                    id: 'TS0121_2',
                    name: { en: 'Tuya TS0121 Plug V2', fr: 'Prise Tuya TS0121 V2', nl: 'Tuya TS0121 Stekker V2', ta: 'Tuya TS0121 பிளக் V2' },
                    class: 'socket',
                    capabilities: ['onoff', 'meter_power', 'measure_current', 'measure_voltage', 'measure_power_factor'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0121', clusters: ['genOnOff', 'seMetering'] }
                },
                {
                    id: 'TS0601_switch_2',
                    name: { en: 'Tuya TS0601 Switch V2', fr: 'Interrupteur Tuya TS0601 V2', nl: 'Tuya TS0601 Schakelaar V2', ta: 'Tuya TS0601 சுவிட்ச் V2' },
                    class: 'light',
                    capabilities: ['onoff', 'dim', 'light_temperature'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0601', clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'] }
                },
                {
                    id: 'TS0601_rgb_2',
                    name: { en: 'Tuya TS0601 RGB V2', fr: 'RGB Tuya TS0601 V2', nl: 'Tuya TS0601 RGB V2', ta: 'Tuya TS0601 RGB V2' },
                    class: 'light',
                    capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode', 'light_hue', 'light_saturation'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0601', clusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl'] }
                },
                {
                    id: 'TS0601_sensor_2',
                    name: { en: 'Tuya TS0601 Sensor V2', fr: 'Capteur Tuya TS0601 V2', nl: 'Tuya TS0601 Sensor V2', ta: 'Tuya TS0601 சென்சார் V2' },
                    class: 'sensor',
                    capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0601', clusters: ['genBasic', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement'] }
                },
                {
                    id: 'TS0601_motion_2',
                    name: { en: 'Tuya TS0601 Motion V2', fr: 'Capteur de Mouvement Tuya TS0601 V2', nl: 'Tuya TS0601 Bewegingssensor V2', ta: 'Tuya TS0601 இயக்க சென்சார் V2' },
                    class: 'sensor',
                    capabilities: ['alarm_motion', 'measure_temperature', 'measure_illuminance'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0601', clusters: ['genBasic', 'msOccupancySensing', 'msTemperatureMeasurement', 'msIlluminanceMeasurement'] }
                },
                {
                    id: 'TS0601_contact_2',
                    name: { en: 'Tuya TS0601 Contact V2', fr: 'Capteur de Contact Tuya TS0601 V2', nl: 'Tuya TS0601 Contactsensor V2', ta: 'Tuya TS0601 தொடர்பு சென்சார் V2' },
                    class: 'sensor',
                    capabilities: ['alarm_contact', 'measure_temperature', 'measure_battery'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0601', clusters: ['genBasic', 'msOccupancySensing', 'msTemperatureMeasurement', 'genPowerCfg'] }
                },
                {
                    id: 'TS0601_thermostat_2',
                    name: { en: 'Tuya TS0601 Thermostat V2', fr: 'Thermostat Tuya TS0601 V2', nl: 'Tuya TS0601 Thermostaat V2', ta: 'Tuya TS0601 தெர்மோஸ்டேட் V2' },
                    class: 'thermostat',
                    capabilities: ['measure_temperature', 'target_temperature', 'thermostat_mode', 'measure_humidity'],
                    zigbee: { manufacturerName: 'Tuya', modelId: 'TS0601', clusters: ['genBasic', 'msTemperatureMeasurement', 'hvacThermostat', 'msRelativeHumidity'] }
                }
            ];

            let createdCount = 0;
            for (const driver of missingDrivers) {
                const driverDir = path.join('drivers/tuya', driver.id);
                
                if (!fs.existsSync(driverDir)) {
                    fs.mkdirSync(driverDir, { recursive: true });
                    
                    // Créer driver.compose.json
                    const composePath = path.join(driverDir, 'driver.compose.json');
                    const composeData = {
                        ...driver,
                        metadata: {
                            createdAt: new Date().toISOString(),
                            version: '3.1.0',
                            source: 'missing_driver_creation'
                        }
                    };
                    fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));

                    // Créer device.js
                    const deviceJs = this.generateDeviceJs(driver);
                    const devicePath = path.join(driverDir, 'device.js');
                    fs.writeFileSync(devicePath, deviceJs);

                    createdCount++;
                    this.log(`Driver manquant créé: ${driver.id}`);
                }
            }

            this.log(`✅ Drivers manquants créés: ${createdCount}`);
            return createdCount;

        } catch (error) {
            this.log(`❌ Erreur création drivers manquants: ${error.message}`, 'error');
            return 0;
        }
    }

    generateDeviceJs(driver) {
        const className = driver.id.replace(/[-_]/g, '').replace(/([A-Z])/g, '$1');
        
        return `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${className}Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('${driver.name.en} initialized');
            
            // Register capabilities with error handling
            ${driver.capabilities.map(cap => `try { this.registerCapability('${cap}', 'genOnOff'); } catch (error) { this.log('Error registering capability ${cap}:', error); }`).join('\n            ')}
            
        } catch (error) {
            this.log('Error during mesh init:', error);
            throw error;
        }
    }
    
    async onSettings(oldSettings, newSettings, changedKeys) {
        this.log('Settings updated:', changedKeys);
    }
    
    async onRenamed(name) {
        this.log('Device renamed to:', name);
    }
    
    async onDeleted() {
        this.log('Device deleted');
    }
    
    async onError(error) {
        this.log('Device error:', error);
    }
    
    async onUnavailable() {
        this.log('Device unavailable');
    }
    
    async onAvailable() {
        this.log('Device available');
    }
}

module.exports = ${className}Device;`;
    }

    async organizeDrivers() {
        this.log('📁 Réorganisation des drivers...');
        
        try {
            const categories = {
                switches: [],
                plugs: [],
                sensors: [],
                controls: [],
                lights: []
            };

            const tuyaDir = 'drivers/tuya';
            if (fs.existsSync(tuyaDir)) {
                const driverDirs = fs.readdirSync(tuyaDir);
                
                for (const driverDir of driverDirs) {
                    const composePath = path.join(tuyaDir, driverDir, 'driver.compose.json');
                    
                    if (fs.existsSync(composePath)) {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        
                        if (compose.capabilities.includes('meter_power')) {
                            categories.plugs.push(driverDir);
                        } else if (compose.capabilities.some(cap => cap.includes('measure') || cap.includes('alarm'))) {
                            categories.sensors.push(driverDir);
                        } else if (compose.capabilities.includes('dim') || compose.capabilities.includes('light_temperature')) {
                            categories.lights.push(driverDir);
                        } else if (compose.capabilities.includes('onoff')) {
                            categories.switches.push(driverDir);
                        } else {
                            categories.controls.push(driverDir);
                        }
                    }
                }
            }

            // Créer des sous-dossiers organisés
            for (const [category, drivers] of Object.entries(categories)) {
                const categoryDir = path.join(tuyaDir, category);
                if (!fs.existsSync(categoryDir)) {
                    fs.mkdirSync(categoryDir, { recursive: true });
                }

                for (const driver of drivers) {
                    const sourceDir = path.join(tuyaDir, driver);
                    const targetDir = path.join(categoryDir, driver);
                    
                    if (fs.existsSync(sourceDir) && !fs.existsSync(targetDir)) {
                        // Déplacer le driver vers la catégorie appropriée
                        fs.renameSync(sourceDir, targetDir);
                        this.log(`Driver déplacé: ${driver} -> ${category}`);
                    }
                }
            }

            this.log(`✅ Drivers réorganisés: ${Object.values(categories).flat().length} drivers`);
            return categories;

        } catch (error) {
            this.log(`❌ Erreur réorganisation: ${error.message}`, 'error');
            return null;
        }
    }

    async runAnalysisAndImprovement() {
        this.log('🚀 Début de l\'analyse et amélioration des drivers...');
        
        try {
            const tuyaDir = 'drivers/tuya';
            const zigbeeDir = 'drivers/zigbee';
            
            let analyzedCount = 0;
            let improvedCount = 0;
            let errorCount = 0;

            // Analyser et améliorer les drivers Tuya
            if (fs.existsSync(tuyaDir)) {
                const driverDirs = fs.readdirSync(tuyaDir);
                
                for (const driverDir of driverDirs) {
                    const driverPath = path.join(tuyaDir, driverDir);
                    
                    if (fs.statSync(driverPath).isDirectory()) {
                        const analysis = await this.analyzeDriver(driverPath);
                        
                        if (analysis) {
                            analyzedCount++;
                            
                            if (analysis.needsImprovement) {
                                const improved = await this.improveDriver(driverPath, analysis);
                                if (improved) {
                                    improvedCount++;
                                } else {
                                    errorCount++;
                                }
                            }
                        }
                    }
                }
            }

            // Analyser et améliorer les drivers Zigbee
            if (fs.existsSync(zigbeeDir)) {
                const driverDirs = fs.readdirSync(zigbeeDir);
                
                for (const driverDir of driverDirs) {
                    const driverPath = path.join(zigbeeDir, driverDir);
                    
                    if (fs.statSync(driverPath).isDirectory()) {
                        const analysis = await this.analyzeDriver(driverPath);
                        
                        if (analysis) {
                            analyzedCount++;
                            
                            if (analysis.needsImprovement) {
                                const improved = await this.improveDriver(driverPath, analysis);
                                if (improved) {
                                    improvedCount++;
                                } else {
                                    errorCount++;
                                }
                            }
                        }
                    }
                }
            }

            // Créer les drivers manquants
            const createdCount = await this.createMissingDrivers();

            // Réorganiser les drivers
            const categories = await this.organizeDrivers();

            // Générer le rapport final
            this.report.summary = {
                analyzedDrivers: analyzedCount,
                improvedDrivers: improvedCount,
                createdDrivers: createdCount,
                errorCount: errorCount,
                categories: categories,
                status: 'analysis_and_improvement_complete'
            };

            // Sauvegarder le rapport
            fs.writeFileSync('reports/driver-analysis-improvement-report.json', JSON.stringify(this.report, null, 2));

            this.log(`🎉 Analyse et amélioration terminées!`);
            this.log(`📊 Analysés: ${analyzedCount}, Améliorés: ${improvedCount}, Créés: ${createdCount}`);
            
            return this.report;

        } catch (error) {
            this.log(`❌ Erreur analyse et amélioration: ${error.message}`, 'error');
            return this.report;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début de l\'analyse et amélioration des drivers...');
    
    const analyzer = new DriverAnalyzerImprover();
    const report = await analyzer.runAnalysisAndImprovement();
    
    console.log('✅ Analyse et amélioration terminées avec succès!');
    console.log(`📊 Rapport: reports/driver-analysis-improvement-report.json`);
    
    return report;
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

module.exports = { DriverAnalyzerImprover }; 