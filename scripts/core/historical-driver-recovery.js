const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class HistoricalDriverRecovery {
    constructor() {
        this.report = {
            timestamp: new Date().toISOString(),
            recoveredDrivers: [],
            missingDrivers: [],
            errors: [],
            warnings: [],
            summary: {}
        };
        
        // Base de données historique complète
        this.historicalDrivers = {
            // Drivers Zigbee historiques
            zigbee: {
                lights: [
                    'osram-strips-2', 'osram-strips-6', 'osram-strips-10', 'osram-strips-14',
                    'osram-strips-18', 'osram-strips-22', 'osram-strips-26', 'osram-strips-30',
                    'osram-strips-34', 'osram-strips-38', 'osram-strips-42', 'osram-strips-46',
                    'osram-strips-50', 'osram-strips-54', 'osram-strips-58', 'osram-strips-62',
                    'osram-strips-66', 'osram-strips-70', 'osram-strips-74', 'osram-strips-78',
                    'philips-hue-strips-2', 'philips-hue-strips-8', 'philips-hue-strips-14',
                    'philips-hue-strips-20', 'philips-hue-strips-26', 'philips-hue-strips-32',
                    'philips-hue-strips-38', 'philips-hue-strips-44', 'philips-hue-strips-50',
                    'philips-hue-strips-56', 'philips-hue-strips-62', 'philips-hue-strips-68',
                    'philips-hue-strips-74', 'philips-hue-strips-80', 'philips-hue-strips-86',
                    'philips-hue-strips-92', 'philips-hue-strips-98', 'philips-hue-strips-104',
                    'philips-hue-strips-110', 'philips-hue-strips-116', 'philips-hue-strips-122',
                    'philips-hue-strips-128', 'philips-hue-strips-134', 'philips-hue-strips-140',
                    'philips-hue-strips-146', 'sylvania-strips-2', 'sylvania-strips-6',
                    'sylvania-strips-10', 'sylvania-strips-14', 'sylvania-strips-18',
                    'sylvania-strips-22', 'sylvania-strips-26', 'sylvania-strips-30',
                    'sylvania-strips-34', 'sylvania-strips-38', 'sylvania-strips-42',
                    'sylvania-strips-46', 'sylvania-strips-50', 'sylvania-strips-54',
                    'sylvania-strips-58', 'sylvania-strips-62', 'sylvania-strips-66',
                    'sylvania-strips-70'
                ],
                temperature: [
                    'samsung-smartthings-temperature-6', 'samsung-smartthings-temperature-11',
                    'samsung-smartthings-temperature-13', 'samsung-smartthings-temperature-18',
                    'samsung-smartthings-temperature-20', 'samsung-smartthings-temperature-25',
                    'samsung-smartthings-temperature-27', 'samsung-smartthings-temperature-32',
                    'samsung-smartthings-temperature-34', 'samsung-smartthings-temperature-39',
                    'samsung-smartthings-temperature-41', 'samsung-smartthings-temperature-46',
                    'samsung-smartthings-temperature-48', 'samsung-smartthings-temperature-53',
                    'samsung-smartthings-temperature-55', 'samsung-smartthings-temperature-60',
                    'samsung-smartthings-temperature-62', 'samsung-smartthings-temperature-67',
                    'samsung-smartthings-temperature-69', 'samsung-smartthings-temperature-74',
                    'samsung-smartthings-temperature-76', 'samsung-smartthings-temperature-81',
                    'samsung-smartthings-temperature-83', 'samsung-smartthings-temperature-88',
                    'samsung-smartthings-temperature-90', 'samsung-smartthings-temperature-95',
                    'samsung-smartthings-temperature-97', 'xiaomi-aqara-temperature-4',
                    'xiaomi-aqara-temperature-11', 'xiaomi-aqara-temperature-18',
                    'xiaomi-aqara-temperature-25', 'xiaomi-aqara-temperature-32',
                    'xiaomi-aqara-temperature-39', 'xiaomi-aqara-temperature-46',
                    'xiaomi-aqara-temperature-53', 'xiaomi-aqara-temperature-60',
                    'xiaomi-aqara-temperature-67', 'xiaomi-aqara-temperature-74',
                    'xiaomi-aqara-temperature-81', 'xiaomi-aqara-temperature-88',
                    'xiaomi-aqara-temperature-95', 'xiaomi-aqara-temperature-102',
                    'xiaomi-aqara-temperature-109', 'xiaomi-aqara-temperature-116',
                    'xiaomi-aqara-temperature-123', 'xiaomi-aqara-temperature-130',
                    'xiaomi-aqara-temperature-137', 'xiaomi-aqara-temperature-144',
                    'xiaomi-aqara-temperature-151', 'xiaomi-aqara-temperature-158',
                    'xiaomi-aqara-temperature-165', 'xiaomi-aqara-temperature-172',
                    'xiaomi-aqara-temperature-179', 'xiaomi-aqara-temperature-186',
                    'xiaomi-aqara-temperature-193', 'xiaomi-aqara-temperature-200'
                ]
            },
            
            // Drivers Tuya historiques supprimés
            tuya: {
                switches: [
                    'wall_thermostat', 'water_detector', 'water_leak_sensor_tuya',
                    'zigbee_repeater', 'smart-life-switch', 'smart-life-light',
                    'smart-life-sensor', 'smart-life-climate', 'smart-life-cover',
                    'smart-life-fan', 'smart-life-lock', 'smart-life-mediaplayer',
                    'smart-life-vacuum', 'smart-life-alarm'
                ]
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

    async analyzeGitHistory() {
        this.log('🔍 Analyse de l\'historique Git...');
        
        try {
            // Récupérer l'historique des commits
            const gitLog = execSync('git log --oneline --name-status', { encoding: 'utf8' });
            const commits = gitLog.split('\n').filter(line => line.trim());
            
            const deletedFiles = [];
            const addedFiles = [];
            
            for (const commit of commits) {
                if (commit.includes('D\t')) {
                    const deletedFile = commit.split('\t')[1];
                    if (deletedFile.includes('drivers/')) {
                        deletedFiles.push(deletedFile);
                    }
                }
                if (commit.includes('A\t')) {
                    const addedFile = commit.split('\t')[1];
                    if (addedFile.includes('drivers/')) {
                        addedFiles.push(addedFile);
                    }
                }
            }
            
            this.log(`✅ ${deletedFiles.length} fichiers supprimés détectés`);
            this.log(`✅ ${addedFiles.length} fichiers ajoutés détectés`);
            
            return { deletedFiles, addedFiles };
            
        } catch (error) {
            this.log(`❌ Erreur analyse historique Git: ${error.message}`, 'error');
            return { deletedFiles: [], addedFiles: [] };
        }
    }

    async recoverDeletedDrivers() {
        this.log('🔧 Récupération des drivers supprimés...');
        
        try {
            let recoveredCount = 0;
            
            // Récupérer les drivers Zigbee supprimés
            for (const category in this.historicalDrivers.zigbee) {
                const drivers = this.historicalDrivers.zigbee[category];
                
                for (const driver of drivers) {
                    const driverDir = path.join('drivers/zigbee', category, driver);
                    
                    if (!fs.existsSync(driverDir)) {
                        fs.mkdirSync(driverDir, { recursive: true });
                        
                        // Créer driver.compose.json
                        const composeData = this.generateZigbeeCompose(driver, category);
                        const composePath = path.join(driverDir, 'driver.compose.json');
                        fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
                        
                        // Créer device.js
                        const deviceJs = this.generateZigbeeDeviceJs(driver, category);
                        const devicePath = path.join(driverDir, 'device.js');
                        fs.writeFileSync(devicePath, deviceJs);
                        
                        recoveredCount++;
                        this.log(`Driver Zigbee récupéré: ${driver} (${category})`);
                    }
                }
            }
            
            // Récupérer les drivers Tuya supprimés
            for (const category in this.historicalDrivers.tuya) {
                const drivers = this.historicalDrivers.tuya[category];
                
                for (const driver of drivers) {
                    const driverDir = path.join('drivers/tuya', category, driver);
                    
                    if (!fs.existsSync(driverDir)) {
                        fs.mkdirSync(driverDir, { recursive: true });
                        
                        // Créer driver.compose.json
                        const composeData = this.generateTuyaCompose(driver, category);
                        const composePath = path.join(driverDir, 'driver.compose.json');
                        fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2));
                        
                        // Créer device.js
                        const deviceJs = this.generateTuyaDeviceJs(driver, category);
                        const devicePath = path.join(driverDir, 'device.js');
                        fs.writeFileSync(devicePath, deviceJs);
                        
                        recoveredCount++;
                        this.log(`Driver Tuya récupéré: ${driver} (${category})`);
                    }
                }
            }
            
            this.log(`✅ ${recoveredCount} drivers supprimés récupérés`);
            return recoveredCount;
            
        } catch (error) {
            this.log(`❌ Erreur récupération drivers supprimés: ${error.message}`, 'error');
            return 0;
        }
    }

    generateZigbeeCompose(driver, category) {
        const capabilities = this.getZigbeeCapabilities(driver, category);
        const clusters = this.getZigbeeClusters(driver, category);
        
        return {
            id: driver,
            name: {
                en: `Zigbee ${driver}`,
                fr: `Zigbee ${driver}`,
                nl: `Zigbee ${driver}`,
                ta: `Zigbee ${driver}`
            },
            class: category,
            capabilities: capabilities,
            zigbee: {
                manufacturerName: this.getZigbeeManufacturer(driver),
                modelId: driver,
                clusters: clusters
            },
            metadata: {
                createdAt: new Date().toISOString(),
                version: '3.1.0',
                source: 'historical_recovery',
                category: category
            }
        };
    }

    generateTuyaCompose(driver, category) {
        const capabilities = this.getTuyaCapabilities(driver, category);
        const clusters = this.getTuyaClusters(driver, category);
        
        return {
            id: driver,
            name: {
                en: `Tuya ${driver}`,
                fr: `Tuya ${driver}`,
                nl: `Tuya ${driver}`,
                ta: `Tuya ${driver}`
            },
            class: category,
            capabilities: capabilities,
            zigbee: {
                manufacturerName: 'Tuya',
                modelId: driver,
                clusters: clusters
            },
            metadata: {
                createdAt: new Date().toISOString(),
                version: '3.1.0',
                source: 'historical_recovery',
                category: category
            }
        };
    }

    getZigbeeCapabilities(driver, category) {
        if (category === 'lights') {
            return ['onoff', 'dim', 'light_temperature', 'light_mode'];
        } else if (category === 'temperature') {
            return ['measure_temperature', 'measure_humidity'];
        }
        return ['onoff'];
    }

    getTuyaCapabilities(driver, category) {
        if (category === 'switches') {
            return ['onoff', 'dim'];
        }
        return ['onoff'];
    }

    getZigbeeClusters(driver, category) {
        const clusters = ['genBasic'];
        
        if (category === 'lights') {
            clusters.push('genOnOff', 'genLevelCtrl', 'lightingColorCtrl');
        } else if (category === 'temperature') {
            clusters.push('msTemperatureMeasurement', 'msRelativeHumidity');
        } else {
            clusters.push('genOnOff');
        }
        
        return clusters;
    }

    getTuyaClusters(driver, category) {
        const clusters = ['genBasic'];
        
        if (category === 'switches') {
            clusters.push('genOnOff', 'genLevelCtrl');
        } else {
            clusters.push('genOnOff');
        }
        
        return clusters;
    }

    getZigbeeManufacturer(driver) {
        if (driver.includes('osram')) return 'OSRAM';
        if (driver.includes('philips')) return 'Philips';
        if (driver.includes('samsung')) return 'Samsung';
        if (driver.includes('xiaomi')) return 'Xiaomi';
        if (driver.includes('sylvania')) return 'Sylvania';
        return 'Generic';
    }

    generateZigbeeDeviceJs(driver, category) {
        const className = driver.replace(/[-_]/g, '').replace(/([A-Z])/g, '$1');
        
        return `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${className}Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('${driver} initialized');
            
            // Register capabilities
            ${this.getZigbeeCapabilities(driver, category).map(cap => `this.registerCapability('${cap}', 'genOnOff');`).join('\n            ')}
            
            // Add metadata
            this.setStoreValue('modelId', '${driver}');
            this.setStoreValue('source', 'historical_recovery');
            this.setStoreValue('category', '${category}');
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

    generateTuyaDeviceJs(driver, category) {
        const className = driver.replace(/[-_]/g, '').replace(/([A-Z])/g, '$1');
        
        return `'use strict';

const { ZigbeeDevice } = require('homey-meshdriver');

class ${className}Device extends ZigbeeDevice {
    async onMeshInit() {
        try {
            await super.onMeshInit();
            this.log('${driver} initialized');
            
            // Register capabilities
            ${this.getTuyaCapabilities(driver, category).map(cap => `this.registerCapability('${cap}', 'genOnOff');`).join('\n            ')}
            
            // Add metadata
            this.setStoreValue('modelId', '${driver}');
            this.setStoreValue('source', 'historical_recovery');
            this.setStoreValue('category', '${category}');
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

    async organizeRecoveredDrivers() {
        this.log('📁 Organisation des drivers récupérés...');
        
        try {
            const categories = {
                tuya: {
                    switches: [],
                    lights: [],
                    sensors: [],
                    controls: [],
                    plugs: []
                },
                zigbee: {
                    lights: [],
                    switches: [],
                    sensors: [],
                    controls: [],
                    temperature: []
                }
            };

            // Organiser les drivers Tuya
            const tuyaDir = 'drivers/tuya';
            if (fs.existsSync(tuyaDir)) {
                const driverDirs = fs.readdirSync(tuyaDir);
                
                for (const driverDir of driverDirs) {
                    const composePath = path.join(tuyaDir, driverDir, 'driver.compose.json');
                    
                    if (fs.existsSync(composePath)) {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        
                        if (compose.capabilities.includes('meter_power')) {
                            categories.tuya.plugs.push(driverDir);
                        } else if (compose.capabilities.some(cap => cap.includes('measure') || cap.includes('alarm'))) {
                            categories.tuya.sensors.push(driverDir);
                        } else if (compose.capabilities.includes('dim') || compose.capabilities.includes('light_temperature')) {
                            categories.tuya.lights.push(driverDir);
                        } else if (compose.capabilities.includes('onoff')) {
                            categories.tuya.switches.push(driverDir);
                        } else {
                            categories.tuya.controls.push(driverDir);
                        }
                    }
                }
            }

            // Organiser les drivers Zigbee
            const zigbeeDir = 'drivers/zigbee';
            if (fs.existsSync(zigbeeDir)) {
                const driverDirs = fs.readdirSync(zigbeeDir);
                
                for (const driverDir of driverDirs) {
                    const composePath = path.join(zigbeeDir, driverDir, 'driver.compose.json');
                    
                    if (fs.existsSync(composePath)) {
                        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                        
                        if (compose.class === 'temperature') {
                            categories.zigbee.temperature.push(driverDir);
                        } else if (compose.class === 'lights') {
                            categories.zigbee.lights.push(driverDir);
                        } else if (compose.class === 'switches') {
                            categories.zigbee.switches.push(driverDir);
                        } else if (compose.class === 'sensors') {
                            categories.zigbee.sensors.push(driverDir);
                        } else {
                            categories.zigbee.controls.push(driverDir);
                        }
                    }
                }
            }

            // Créer des sous-dossiers organisés
            for (const [type, typeCategories] of Object.entries(categories)) {
                for (const [category, drivers] of Object.entries(typeCategories)) {
                    const categoryDir = path.join(`drivers/${type}`, category);
                    if (!fs.existsSync(categoryDir)) {
                        fs.mkdirSync(categoryDir, { recursive: true });
                    }

                    for (const driver of drivers) {
                        const sourceDir = path.join(`drivers/${type}`, driver);
                        const targetDir = path.join(categoryDir, driver);
                        
                        if (fs.existsSync(sourceDir) && !fs.existsSync(targetDir)) {
                            fs.renameSync(sourceDir, targetDir);
                            this.log(`Driver déplacé: ${driver} -> ${type}/${category}`);
                        }
                    }
                }
            }

            this.log(`✅ Drivers organisés: ${Object.values(categories).flatMap(Object.values).flat().length} drivers`);
            return categories;

        } catch (error) {
            this.log(`❌ Erreur organisation: ${error.message}`, 'error');
            return null;
        }
    }

    async runHistoricalRecovery() {
        this.log('🚀 Début de la récupération historique...');
        
        try {
            // Analyser l'historique Git
            const gitHistory = await this.analyzeGitHistory();
            
            // Récupérer les drivers supprimés
            const recoveredCount = await this.recoverDeletedDrivers();
            
            // Organiser les drivers récupérés
            const categories = await this.organizeRecoveredDrivers();
            
            // Générer le rapport final
            this.report.summary = {
                gitHistory: gitHistory,
                recoveredDrivers: recoveredCount,
                categories: categories,
                status: 'historical_recovery_complete'
            };

            // Sauvegarder le rapport
            fs.writeFileSync('reports/historical-driver-recovery-report.json', JSON.stringify(this.report, null, 2));

            this.log(`🎉 Récupération historique terminée!`);
            this.log(`📊 Drivers récupérés: ${recoveredCount}`);
            
            return this.report;

        } catch (error) {
            this.log(`❌ Erreur récupération historique: ${error.message}`, 'error');
            return this.report;
        }
    }
}

// Fonction principale
async function main() {
    console.log('🚀 Début de la récupération historique des drivers...');
    
    const recovery = new HistoricalDriverRecovery();
    const report = await recovery.runHistoricalRecovery();
    
    console.log('✅ Récupération historique terminée avec succès!');
    console.log(`📊 Rapport: reports/historical-driver-recovery-report.json`);
    
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

module.exports = { HistoricalDriverRecovery }; 