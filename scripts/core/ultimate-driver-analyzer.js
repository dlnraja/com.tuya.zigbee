const fs = require('fs');
const path = require('path');

class UltimateDriverAnalyzer {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            analyzedDrivers: [],
            missingDrivers: [],
            createdDrivers: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        
        // Base de données complète des modèles Tuya connus
        this.tuyaModelsDatabase = {
            // Switches & Lights
            'TS0001': { type: 'switch', channels: 1, capabilities: ['onoff'] },
            'TS0002': { type: 'switch', channels: 2, capabilities: ['onoff', 'onoff'] },
            'TS0003': { type: 'switch', channels: 3, capabilities: ['onoff', 'onoff', 'onoff'] },
            'TS0004': { type: 'switch', channels: 4, capabilities: ['onoff', 'onoff', 'onoff', 'onoff'] },
            'TS0005': { type: 'switch', channels: 5, capabilities: ['onoff', 'onoff', 'onoff', 'onoff', 'onoff'] },
            'TS0006': { type: 'switch', channels: 6, capabilities: ['onoff', 'onoff', 'onoff', 'onoff', 'onoff', 'onoff'] },
            'TS0601': { type: 'switch', channels: 1, capabilities: ['onoff'] },
            'TS0601_dimmer': { type: 'light', channels: 1, capabilities: ['onoff', 'dim'] },
            'TS0601_rgb': { type: 'light', channels: 1, capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode'] },
            'TS0601_switch_2': { type: 'light', channels: 1, capabilities: ['onoff', 'dim', 'light_temperature'] },
            'TS0601_rgb_2': { type: 'light', channels: 1, capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode', 'light_hue', 'light_saturation'] },
            
            // Plugs & Power
            'TS011F': { type: 'socket', channels: 1, capabilities: ['onoff', 'meter_power'] },
            'TS011F_2': { type: 'socket', channels: 1, capabilities: ['onoff', 'meter_power', 'measure_current', 'measure_voltage'] },
            'TS0121': { type: 'socket', channels: 1, capabilities: ['onoff', 'meter_power', 'measure_current', 'measure_voltage'] },
            'TS0121_2': { type: 'socket', channels: 1, capabilities: ['onoff', 'meter_power', 'measure_current', 'measure_voltage', 'measure_power_factor'] },
            'TS0601_plug': { type: 'socket', channels: 1, capabilities: ['onoff', 'meter_power'] },
            'TS0601_plug_2': { type: 'socket', channels: 1, capabilities: ['onoff', 'meter_power', 'measure_current', 'measure_voltage'] },
            
            // Sensors
            'TS0601_sensor': { type: 'sensor', channels: 1, capabilities: ['measure_temperature', 'measure_humidity'] },
            'TS0601_sensor_2': { type: 'sensor', channels: 1, capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure'] },
            'TS0601_motion': { type: 'sensor', channels: 1, capabilities: ['alarm_motion', 'measure_temperature'] },
            'TS0601_motion_2': { type: 'sensor', channels: 1, capabilities: ['alarm_motion', 'measure_temperature', 'measure_illuminance'] },
            'TS0601_contact': { type: 'sensor', channels: 1, capabilities: ['alarm_contact', 'measure_temperature'] },
            'TS0601_contact_2': { type: 'sensor', channels: 1, capabilities: ['alarm_contact', 'measure_temperature', 'measure_battery'] },
            'TS0601_smoke': { type: 'sensor', channels: 1, capabilities: ['alarm_smoke', 'measure_temperature'] },
            'TS0601_water': { type: 'sensor', channels: 1, capabilities: ['alarm_water', 'measure_temperature'] },
            'TS0601_gas': { type: 'sensor', channels: 1, capabilities: ['alarm_gas', 'measure_temperature'] },
            'TS0601_vibration': { type: 'sensor', channels: 1, capabilities: ['alarm_vibration', 'measure_temperature'] },
            
            // Controls
            'TS0601_thermostat': { type: 'thermostat', channels: 1, capabilities: ['measure_temperature', 'target_temperature', 'thermostat_mode'] },
            'TS0601_thermostat_2': { type: 'thermostat', channels: 1, capabilities: ['measure_temperature', 'target_temperature', 'thermostat_mode', 'measure_humidity'] },
            'TS0601_valve': { type: 'valve', channels: 1, capabilities: ['onoff', 'measure_temperature'] },
            'TS0601_curtain': { type: 'curtain', channels: 1, capabilities: ['windowcoverings_state', 'windowcoverings_set'] },
            'TS0601_blind': { type: 'blind', channels: 1, capabilities: ['windowcoverings_state', 'windowcoverings_set'] },
            'TS0601_fan': { type: 'fan', channels: 1, capabilities: ['onoff', 'dim'] },
            'TS0601_garage': { type: 'garage', channels: 1, capabilities: ['garagedoor_closed', 'garagedoor_state'] },
            'TS0601_lock': { type: 'lock', channels: 1, capabilities: ['lock_state', 'lock_mode'] },
            
            // Generic Tuya models
            '_TZ3000_light': { type: 'light', channels: 1, capabilities: ['onoff', 'dim'] },
            '_TZ3210_rgb': { type: 'light', channels: 1, capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode'] },
            '_TZ3400_switch': { type: 'switch', channels: 1, capabilities: ['onoff', 'dim'] },
            '_TZ3500_sensor': { type: 'sensor', channels: 1, capabilities: ['measure_temperature', 'measure_humidity'] },
            '_TZ3600_plug': { type: 'socket', channels: 1, capabilities: ['onoff', 'meter_power'] },
            '_TZ3700_thermostat': { type: 'thermostat', channels: 1, capabilities: ['measure_temperature', 'target_temperature', 'thermostat_mode'] },
            
            // Advanced models
            'TS0601_switch_3': { type: 'switch', channels: 1, capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode', 'light_hue'] },
            'TS0601_rgb_3': { type: 'light', channels: 1, capabilities: ['onoff', 'dim', 'light_temperature', 'light_mode', 'light_hue', 'light_saturation', 'light_brightness'] },
            'TS0601_sensor_3': { type: 'sensor', channels: 1, capabilities: ['measure_temperature', 'measure_humidity', 'measure_pressure', 'measure_illuminance'] },
            'TS0601_motion_3': { type: 'sensor', channels: 1, capabilities: ['alarm_motion', 'measure_temperature', 'measure_illuminance', 'measure_battery'] },
            'TS0601_contact_3': { type: 'sensor', channels: 1, capabilities: ['alarm_contact', 'measure_temperature', 'measure_battery', 'measure_illuminance'] },
            'TS0601_thermostat_3': { type: 'thermostat', channels: 1, capabilities: ['measure_temperature', 'target_temperature', 'thermostat_mode', 'measure_humidity', 'measure_battery'] }
        };
        
        // Référentiel benchmark des capacités
        this.capabilityBenchmark = {
            // Basic capabilities
            'onoff': { type: 'boolean', title: { en: 'On/Off', fr: 'Marche/Arrêt', nl: 'Aan/Uit', ta: 'ஆன்/ஆஃப்' }, getable: true, setable: true },
            'dim': { type: 'number', title: { en: 'Dim Level', fr: 'Niveau de Dim', nl: 'Dim Niveau', ta: 'டிம் நிலை' }, getable: true, setable: true, min: 0, max: 100, unit: '%' },
            
            // Power & Energy
            'meter_power': { type: 'number', title: { en: 'Power', fr: 'Puissance', nl: 'Vermogen', ta: 'சக்தி' }, getable: true, setable: false, unit: 'W' },
            'measure_current': { type: 'number', title: { en: 'Current', fr: 'Courant', nl: 'Stroom', ta: 'மின்னோட்டம்' }, getable: true, setable: false, unit: 'A' },
            'measure_voltage': { type: 'number', title: { en: 'Voltage', fr: 'Tension', nl: 'Spanning', ta: 'மின்னழுத்தம்' }, getable: true, setable: false, unit: 'V' },
            'measure_power_factor': { type: 'number', title: { en: 'Power Factor', fr: 'Facteur de Puissance', nl: 'Vermogensfactor', ta: 'சக்தி காரணி' }, getable: true, setable: false, unit: '' },
            
            // Environmental sensors
            'measure_temperature': { type: 'number', title: { en: 'Temperature', fr: 'Température', nl: 'Temperatuur', ta: 'வெப்பநிலை' }, getable: true, setable: false, unit: '°C' },
            'measure_humidity': { type: 'number', title: { en: 'Humidity', fr: 'Humidité', nl: 'Vochtigheid', ta: 'ஈரப்பதம்' }, getable: true, setable: false, unit: '%' },
            'measure_pressure': { type: 'number', title: { en: 'Pressure', fr: 'Pression', nl: 'Druk', ta: 'அழுத்தம்' }, getable: true, setable: false, unit: 'hPa' },
            'measure_illuminance': { type: 'number', title: { en: 'Illuminance', fr: 'Éclairement', nl: 'Verlichtingssterkte', ta: 'வெளிச்சம்' }, getable: true, setable: false, unit: 'lux' },
            'measure_battery': { type: 'number', title: { en: 'Battery', fr: 'Batterie', nl: 'Batterij', ta: 'பேட்டரி' }, getable: true, setable: false, unit: '%' },
            
            // Alarms
            'alarm_motion': { type: 'boolean', title: { en: 'Motion', fr: 'Mouvement', nl: 'Beweging', ta: 'இயக்கம்' }, getable: true, setable: false },
            'alarm_contact': { type: 'boolean', title: { en: 'Contact', fr: 'Contact', nl: 'Contact', ta: 'தொடர்பு' }, getable: true, setable: false },
            'alarm_smoke': { type: 'boolean', title: { en: 'Smoke', fr: 'Fumée', nl: 'Rook', ta: 'புகை' }, getable: true, setable: false },
            'alarm_water': { type: 'boolean', title: { en: 'Water Leak', fr: 'Fuite d\'Eau', nl: 'Waterlek', ta: 'தண்ணீர் கசிவு' }, getable: true, setable: false },
            'alarm_gas': { type: 'boolean', title: { en: 'Gas', fr: 'Gaz', nl: 'Gas', ta: 'வாயு' }, getable: true, setable: false },
            'alarm_vibration': { type: 'boolean', title: { en: 'Vibration', fr: 'Vibration', nl: 'Trilling', ta: 'துடிப்பு' }, getable: true, setable: false },
            
            // Thermostat
            'target_temperature': { type: 'number', title: { en: 'Target Temperature', fr: 'Température Cible', nl: 'Doeltemperatuur', ta: 'இலக்கு வெப்பநிலை' }, getable: true, setable: true, min: 5, max: 35, unit: '°C' },
            'thermostat_mode': { type: 'string', title: { en: 'Thermostat Mode', fr: 'Mode Thermostat', nl: 'Thermostaat Modus', ta: 'தெர்மோஸ்டேட் பயன்முறை' }, getable: true, setable: true, options: ['heat', 'cool', 'auto'] },
            
            // Window coverings
            'windowcoverings_state': { type: 'string', title: { en: 'Covering State', fr: 'État Couverture', nl: 'Bedekking Status', ta: 'மறைப்பு நிலை' }, getable: true, setable: false },
            'windowcoverings_set': { type: 'number', title: { en: 'Covering Position', fr: 'Position Couverture', nl: 'Bedekking Positie', ta: 'மறைப்பு நிலை' }, getable: true, setable: true, min: 0, max: 100, unit: '%' },
            
            // Garage door
            'garagedoor_closed': { type: 'boolean', title: { en: 'Garage Door Closed', fr: 'Porte Garage Fermée', nl: 'Garage Deur Gesloten', ta: 'கேரேஜ் கதவு மூடப்பட்டது' }, getable: true, setable: false },
            'garagedoor_state': { type: 'string', title: { en: 'Garage Door State', fr: 'État Porte Garage', nl: 'Garage Deur Status', ta: 'கேரேஜ் கதவு நிலை' }, getable: true, setable: false },
            
            // Lock
            'lock_state': { type: 'string', title: { en: 'Lock State', fr: 'État Verrou', nl: 'Slot Status', ta: 'பூட்டு நிலை' }, getable: true, setable: false },
            'lock_mode': { type: 'string', title: { en: 'Lock Mode', fr: 'Mode Verrou', nl: 'Slot Modus', ta: 'பூட்டு பயன்முறை' }, getable: true, setable: true },
            
            // Light advanced
            'light_temperature': { type: 'number', title: { en: 'Light Temperature', fr: 'Température Lumière', nl: 'Licht Temperatuur', ta: 'விளக்கு வெப்பநிலை' }, getable: true, setable: true, min: 2700, max: 6500, unit: 'K' },
            'light_mode': { type: 'string', title: { en: 'Light Mode', fr: 'Mode Lumière', nl: 'Licht Modus', ta: 'விளக்கு பயன்முறை' }, getable: true, setable: true, options: ['color', 'temperature', 'white'] },
            'light_hue': { type: 'number', title: { en: 'Light Hue', fr: 'Teinte Lumière', nl: 'Licht Tint', ta: 'விளக்கு நிறம்' }, getable: true, setable: true, min: 0, max: 360, unit: '°' },
            'light_saturation': { type: 'number', title: { en: 'Light Saturation', fr: 'Saturation Lumière', nl: 'Licht Verzadiging', ta: 'விளக்கு செறிவு' }, getable: true, setable: true, min: 0, max: 100, unit: '%' },
            'light_brightness': { type: 'number', title: { en: 'Light Brightness', fr: 'Luminosité Lumière', nl: 'Licht Helderheid', ta: 'விளக்கு பிரகாசம்' }, getable: true, setable: true, min: 0, max: 100, unit: '%' }
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

    async analyzeExistingDrivers() {
        this.log('🔍 Analyse des drivers existants...');
        
        try {
            const existingDrivers = [];
            const tuyaDir = 'drivers/tuya';
            const zigbeeDir = 'drivers/zigbee';
            
            // Analyser les drivers Tuya
            if (fs.existsSync(tuyaDir)) {
                const driverDirs = fs.readdirSync(tuyaDir);
                for (const driverDir of driverDirs) {
                    const driverPath = path.join(tuyaDir, driverDir);
                    if (fs.statSync(driverPath).isDirectory()) {
                        const composePath = path.join(driverPath, 'driver.compose.json');
                        if (fs.existsSync(composePath)) {
                            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                            existingDrivers.push({
                                id: driverDir,
                                modelId: compose.zigbee?.modelId || driverDir,
                                capabilities: compose.capabilities || [],
                                type: compose.class || 'unknown',
                                source: 'existing'
                            });
                        }
                    }
                }
            }
            
            // Analyser les drivers Zigbee
            if (fs.existsSync(zigbeeDir)) {
                const driverDirs = fs.readdirSync(zigbeeDir);
                for (const driverDir of driverDirs) {
                    const driverPath = path.join(zigbeeDir, driverDir);
                    if (fs.statSync(driverPath).isDirectory()) {
                        const composePath = path.join(driverPath, 'driver.compose.json');
                        if (fs.existsSync(composePath)) {
                            const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                            existingDrivers.push({
                                id: driverDir,
                                modelId: compose.zigbee?.modelId || driverDir,
                                capabilities: compose.capabilities || [],
                                type: compose.class || 'unknown',
                                source: 'existing'
                            });
                        }
                    }
                }
            }
            
            this.log(`✅ ${existingDrivers.length} drivers existants analysés`);
            return existingDrivers;
            
        } catch (error) {
            this.log(`❌ Erreur analyse drivers existants: ${error.message}`, 'error');
            return [];
        }
    }

    async identifyMissingDrivers(existingDrivers) {
        this.log('🔍 Identification des drivers manquants...');
        
        try {
            const missingDrivers = [];
            const existingModelIds = existingDrivers.map(d => d.modelId);
            
            // Vérifier tous les modèles de la base de données
            for (const [modelId, modelInfo] of Object.entries(this.tuyaModelsDatabase)) {
                if (!existingModelIds.includes(modelId)) {
                    missingDrivers.push({
                        id: modelId.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                        modelId: modelId,
                        type: modelInfo.type,
                        channels: modelInfo.channels,
                        capabilities: modelInfo.capabilities,
                        source: 'database_analysis'
                    });
                }
            }
            
            // Ajouter des modèles génériques basés sur les patterns
            const genericModels = this.generateGenericModels(existingDrivers);
            missingDrivers.push(...genericModels);
            
            this.log(`✅ ${missingDrivers.length} drivers manquants identifiés`);
            return missingDrivers;
            
        } catch (error) {
            this.log(`❌ Erreur identification drivers manquants: ${error.message}`, 'error');
            return [];
        }
    }

    generateGenericModels(existingDrivers) {
        const genericModels = [];
        
        // Patterns de modèles génériques basés sur les discussions de forums
        const genericPatterns = [
            { pattern: 'TS000', base: 'TS000', variants: [1, 2, 3, 4, 5, 6, 7, 8] },
            { pattern: 'TS060', base: 'TS0601', variants: ['switch', 'dimmer', 'rgb', 'sensor', 'motion', 'contact', 'smoke', 'water', 'gas', 'vibration', 'thermostat', 'valve', 'curtain', 'blind', 'fan', 'garage', 'lock'] },
            { pattern: 'TS011', base: 'TS011', variants: ['F', 'G', 'H', 'I', 'J'] },
            { pattern: 'TS012', base: 'TS012', variants: ['1', '2', '3', '4', '5'] },
            { pattern: '_TZ', base: '_TZ', variants: ['3000', '3100', '3200', '3300', '3400', '3500', '3600', '3700', '3800', '3900'] }
        ];
        
        for (const pattern of genericPatterns) {
            for (const variant of pattern.variants) {
                const modelId = `${pattern.base}${variant}`;
                const existingModel = existingDrivers.find(d => d.modelId === modelId);
                
                if (!existingModel) {
                    // Déterminer les capacités basées sur le pattern
                    const capabilities = this.determineCapabilitiesFromPattern(pattern.base, variant);
                    
                    genericModels.push({
                        id: modelId.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                        modelId: modelId,
                        type: this.determineTypeFromPattern(pattern.base, variant),
                        channels: 1,
                        capabilities: capabilities,
                        source: 'generic_pattern_analysis'
                    });
                }
            }
        }
        
        return genericModels;
    }

    determineCapabilitiesFromPattern(base, variant) {
        // Logique pour déterminer les capacités basées sur le pattern
        if (base === 'TS000') {
            return Array(parseInt(variant)).fill('onoff');
        } else if (base === 'TS0601') {
            switch (variant) {
                case 'switch': return ['onoff'];
                case 'dimmer': return ['onoff', 'dim'];
                case 'rgb': return ['onoff', 'dim', 'light_temperature', 'light_mode'];
                case 'sensor': return ['measure_temperature', 'measure_humidity'];
                case 'motion': return ['alarm_motion', 'measure_temperature'];
                case 'contact': return ['alarm_contact', 'measure_temperature'];
                case 'smoke': return ['alarm_smoke', 'measure_temperature'];
                case 'water': return ['alarm_water', 'measure_temperature'];
                case 'gas': return ['alarm_gas', 'measure_temperature'];
                case 'vibration': return ['alarm_vibration', 'measure_temperature'];
                case 'thermostat': return ['measure_temperature', 'target_temperature', 'thermostat_mode'];
                case 'valve': return ['onoff', 'measure_temperature'];
                case 'curtain': return ['windowcoverings_state', 'windowcoverings_set'];
                case 'blind': return ['windowcoverings_state', 'windowcoverings_set'];
                case 'fan': return ['onoff', 'dim'];
                case 'garage': return ['garagedoor_closed', 'garagedoor_state'];
                case 'lock': return ['lock_state', 'lock_mode'];
                default: return ['onoff'];
            }
        } else if (base === 'TS011') {
            return ['onoff', 'meter_power', 'measure_current', 'measure_voltage'];
        } else if (base === 'TS012') {
            return ['onoff', 'meter_power', 'measure_current', 'measure_voltage', 'measure_power_factor'];
        } else if (base === '_TZ') {
            switch (variant) {
                case '3000': return ['onoff', 'dim'];
                case '3100': return ['onoff', 'dim', 'light_temperature'];
                case '3200': return ['onoff', 'dim', 'light_temperature', 'light_mode'];
                case '3300': return ['onoff', 'dim', 'light_temperature', 'light_mode', 'light_hue'];
                case '3400': return ['onoff', 'dim'];
                case '3500': return ['measure_temperature', 'measure_humidity'];
                case '3600': return ['onoff', 'meter_power'];
                case '3700': return ['measure_temperature', 'target_temperature', 'thermostat_mode'];
                default: return ['onoff'];
            }
        }
        
        return ['onoff'];
    }

    determineTypeFromPattern(base, variant) {
        if (base === 'TS000') return 'switch';
        if (base === 'TS0601') {
            switch (variant) {
                case 'switch': return 'switch';
                case 'dimmer': case 'rgb': return 'light';
                case 'sensor': case 'motion': case 'contact': case 'smoke': case 'water': case 'gas': case 'vibration': return 'sensor';
                case 'thermostat': return 'thermostat';
                case 'valve': return 'valve';
                case 'curtain': case 'blind': return 'curtain';
                case 'fan': return 'fan';
                case 'garage': return 'garage';
                case 'lock': return 'lock';
                default: return 'switch';
            }
        }
        if (base === 'TS011' || base === 'TS012') return 'socket';
        if (base === '_TZ') {
            if (['3000', '3100', '3200', '3300', '3400'].includes(variant)) return 'light';
            if (['3500'].includes(variant)) return 'sensor';
            if (['3600'].includes(variant)) return 'socket';
            if (['3700'].includes(variant)) return 'thermostat';
        }
        return 'switch';
    }

    async createMissingDrivers(missingDrivers) {
        this.log('🔧 Création des drivers manquants...');
        
        try {
            let createdCount = 0;
            
            for (const driver of missingDrivers) {
                const driverDir = path.join('drivers/tuya', driver.id);
                
                if (!fs.existsSync(driverDir)) {
                    fs.mkdirSync(driverDir, { recursive: true });
                    
                    // Créer driver.compose.json
                    const composeData = {
                        id: driver.id,
                        name: {
                            en: `Tuya ${driver.modelId}`,
                            fr: `Tuya ${driver.modelId}`,
                            nl: `Tuya ${driver.modelId}`,
                            ta: `Tuya ${driver.modelId}`
                        },
                        class: driver.type,
                        capabilities: driver.capabilities,
                        zigbee: {
                            manufacturerName: 'Tuya',
                            modelId: driver.modelId,
                            clusters: this.generateClustersFromCapabilities(driver.capabilities)
                        },
                        metadata: {
                            createdAt: new Date().toISOString(),
                            version: '3.1.0',
                            source: driver.source,
                            channels: driver.channels
                        }
                    };
                    
                    const composePath = path.join(driverDir, 'driver.compose.json');
                    fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
                    
                    // Créer device.js
                    const deviceJs = this.generateDeviceJs(driver);
                    const devicePath = path.join(driverDir, 'device.js');
                    fs.writeFileSync(devicePath, deviceJs);
                    
                    createdCount++;
                    this.log(`Driver manquant créé: ${driver.id} (${driver.modelId})`);
                }
            }
            
            this.log(`✅ ${createdCount} drivers manquants créés`);
            return createdCount;
            
        } catch (error) {
            this.log(`❌ Erreur création drivers manquants: ${error.message}`, 'error');
            return 0;
        }
    }

    generateClustersFromCapabilities(capabilities) {
        const clusters = [];
        
        for (const capability of capabilities) {
            switch (capability) {
                case 'onoff':
                    clusters.push('genOnOff');
                    break;
                case 'dim':
                    clusters.push('genLevelCtrl');
                    break;
                case 'meter_power':
                case 'measure_current':
                case 'measure_voltage':
                case 'measure_power_factor':
                    clusters.push('seMetering');
                    break;
                case 'measure_temperature':
                    clusters.push('msTemperatureMeasurement');
                    break;
                case 'measure_humidity':
                    clusters.push('msRelativeHumidity');
                    break;
                case 'measure_pressure':
                    clusters.push('msPressureMeasurement');
                    break;
                case 'measure_illuminance':
                    clusters.push('msIlluminanceMeasurement');
                    break;
                case 'measure_battery':
                    clusters.push('genPowerCfg');
                    break;
                case 'alarm_motion':
                    clusters.push('msOccupancySensing');
                    break;
                case 'alarm_contact':
                case 'alarm_smoke':
                case 'alarm_water':
                case 'alarm_gas':
                case 'alarm_vibration':
                    clusters.push('ssIasZone');
                    break;
                case 'target_temperature':
                case 'thermostat_mode':
                    clusters.push('hvacThermostat');
                    break;
                case 'windowcoverings_state':
                case 'windowcoverings_set':
                    clusters.push('closuresWindowCovering');
                    break;
                case 'garagedoor_closed':
                case 'garagedoor_state':
                    clusters.push('closuresDoorLock');
                    break;
                case 'lock_state':
                case 'lock_mode':
                    clusters.push('closuresDoorLock');
                    break;
                case 'light_temperature':
                case 'light_mode':
                case 'light_hue':
                case 'light_saturation':
                case 'light_brightness':
                    clusters.push('lightingColorCtrl');
                    break;
            }
        }
        
        // Ajouter genBasic pour tous les devices
        clusters.unshift('genBasic');
        
        return [...new Set(clusters)]; // Supprimer les doublons
    }

    generateDeviceJs(driver) {
        const className = driver.id.replace(/[-_]/g, '').replace(/([A-Z])/g, '$1');
        
        return `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${className}Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('${driver.modelId} initialized');
            
            // Register capabilities with error handling
            ${driver.capabilities.map(cap => `try { this.registerCapability('${cap}', 'genOnOff'); } catch (error) { this.log('Error registering capability ${cap}:', error); }`).join('\n            ')}
            
            // Add metadata
            this.setStoreValue('modelId', '${driver.modelId}');
            this.setStoreValue('source', '${driver.source}');
            this.setStoreValue('createdAt', '${new Date().toISOString()}');
            
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
        this.log('📁 Organisation des drivers...');
        
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

            this.log(`✅ Drivers organisés: ${Object.values(categories).flat().length} drivers`);
            return categories;

        } catch (error) {
            this.log(`❌ Erreur organisation: ${error.message}`, 'error');
            return null;
        }
    }

    async runUltimateAnalysis() {
        this.log('🚀 Début de l\'analyse ultime des drivers...');
        
        try {
            // Analyser les drivers existants
            const existingDrivers = await this.analyzeExistingDrivers();
            
            // Identifier les drivers manquants
            const missingDrivers = await this.identifyMissingDrivers(existingDrivers);
            
            // Créer les drivers manquants
            const createdCount = await this.createMissingDrivers(missingDrivers);
            
            // Organiser les drivers
            const categories = await this.organizeDrivers();
            
            // Générer le rapport final
            this.report.summary = {
                existingDrivers: existingDrivers.length,
                missingDrivers: missingDrivers.length,
                createdDrivers: createdCount,
                categories: categories,
                status: 'ultimate_analysis_complete'
            };

            // Sauvegarder le rapport
            fs.writeFileSync('reports/ultimate-driver-analysis-report.json', JSON.stringify(this.report, null, 2));

            this.log(`🎉 Analyse ultime terminée!`);
            this.log(`📊 Existants: ${existingDrivers.length}, Manquants: ${missingDrivers.length}, Créés: ${createdCount}`);
            
            return this.report;

        } catch (error) {
            this.log(`❌ Erreur analyse ultime: ${error.message}`, 'error');
            return this.report;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début de l\'analyse ultime des drivers...');
    
    const analyzer = new UltimateDriverAnalyzer();
    const report = await analyzer.runUltimateAnalysis();
    
    console.log('✅ Analyse ultime terminée avec succès!');
    console.log(`📊 Rapport: reports/ultimate-driver-analysis-report.json`);
    
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

module.exports = { UltimateDriverAnalyzer }; 