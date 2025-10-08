#!/usr/bin/env node

/**
 * MISSING FILES COMPLETION
 * Vérifie et complète tous les fichiers manquants dans les drivers
 * S'assure que chaque driver a device.js, driver.json et assets
 */

const fs = require('fs-extra');
const path = require('path');

class MissingFilesCompletion {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.reportsPath = path.join(this.projectRoot, 'project-data', 'analysis-results');
        this.missingFiles = [];
        this.completedFiles = [];
        this.errors = [];
    }

    async run() {
        console.log('🔍 Starting Missing Files Completion...');
        
        const drivers = await this.getDriversList();
        
        for (const driver of drivers) {
            await this.checkAndCompleteDriver(driver);
        }
        
        await this.generateCompletionReport();
        
        console.log('✅ Missing files completion complete!');
    }

    async getDriversList() {
        if (!await fs.pathExists(this.driversPath)) {
            console.log('⚠️  Drivers directory not found');
            return [];
        }
        
        const items = await fs.readdir(this.driversPath);
        const drivers = [];
        
        for (const item of items) {
            const itemPath = path.join(this.driversPath, item);
            const stat = await fs.stat(itemPath);
            
            if (stat.isDirectory()) {
                drivers.push({
                    name: item,
                    path: itemPath
                });
            }
        }
        
        console.log(`📊 Found ${drivers.length} drivers to check`);
        return drivers;
    }

    async checkAndCompleteDriver(driver) {
        console.log(`\n📋 Checking driver: ${driver.name}`);
        
        const requiredFiles = {
            'driver.json': { required: true, type: 'json' },
            'device.js': { required: true, type: 'js' },
            'assets/small.png': { required: true, type: 'image' },
            'assets/large.png': { required: true, type: 'image' }
        };
        
        for (const [fileName, fileConfig] of Object.entries(requiredFiles)) {
            const filePath = path.join(driver.path, fileName);
            
            if (!await fs.pathExists(filePath)) {
                console.log(`  ❌ Missing: ${fileName}`);
                this.missingFiles.push({
                    driver: driver.name,
                    file: fileName,
                    path: filePath
                });
                
                await this.createMissingFile(driver, fileName, fileConfig, filePath);
            } else {
                console.log(`  ✅ Exists: ${fileName}`);
            }
        }
        
        // Vérifications supplémentaires
        await this.validateDriverJson(driver);
        await this.validateDeviceJs(driver);
    }

    async createMissingFile(driver, fileName, fileConfig, filePath) {
        try {
            // S'assurer que le répertoire existe
            await fs.ensureDir(path.dirname(filePath));
            
            if (fileConfig.type === 'json' && fileName === 'driver.json') {
                const driverJson = this.generateDriverJson(driver.name);
                await fs.writeJson(filePath, driverJson, { spaces: 2 });
                console.log(`    ➕ Created: ${fileName}`);
                
            } else if (fileConfig.type === 'js' && fileName === 'device.js') {
                const deviceJs = this.generateDeviceJs(driver.name);
                await fs.writeFile(filePath, deviceJs);
                console.log(`    ➕ Created: ${fileName}`);
                
            } else if (fileConfig.type === 'image') {
                // Copier une image par défaut ou créer un placeholder
                await this.createImagePlaceholder(filePath, fileName.includes('large'));
                console.log(`    ➕ Created: ${fileName}`);
            }
            
            this.completedFiles.push({
                driver: driver.name,
                file: fileName,
                action: 'created'
            });
            
        } catch (error) {
            console.log(`    ❌ Error creating ${fileName}: ${error.message}`);
            this.errors.push({
                driver: driver.name,
                file: fileName,
                error: error.message
            });
        }
    }

    generateDriverJson(driverName) {
        const config = this.analyzeDriverFromName(driverName);
        
        return {
            id: driverName,
            name: {
                en: this.generateDisplayName(driverName)
            },
            class: config.deviceClass,
            capabilities: config.capabilities,
            energy: config.energy,
            zigbee: {
                manufacturerName: config.manufacturerIds,
                productId: config.productIds,
                endpoints: {
                    1: {
                        clusters: config.clusters,
                        bindings: config.bindings
                    }
                }
            },
            images: {
                large: "./assets/large.png",
                small: "./assets/small.png"
            }
        };
    }

    analyzeDriverFromName(driverName) {
        const name = driverName.toLowerCase();
        let config = {
            deviceClass: 'other',
            capabilities: ['onoff'],
            energy: undefined,
            manufacturerIds: ['_TZ3000_', '_TZ3210_', '_TYZB01_'],
            productIds: ['TS0001', 'TS0002', 'TS0003', 'TS0004'],
            clusters: [0, 3, 4, 5, 6],
            bindings: [6]
        };

        // Analyse des switches
        if (name.includes('switch')) {
            config.deviceClass = 'button';
            const buttonCount = this.extractButtonCount(name);
            config.capabilities = [];
            for (let i = 1; i <= buttonCount; i++) {
                config.capabilities.push(`button.${i}`);
            }
            
            if (name.includes('battery') || name.includes('cr2032')) {
                config.energy = { batteries: ['CR2032'] };
                config.capabilities.push('measure_battery');
                config.clusters.push(1); // Power Configuration
            }
        }
        
        // Analyse des sensors
        else if (name.includes('sensor')) {
            config.deviceClass = 'sensor';
            config.capabilities = [];
            
            if (name.includes('motion')) {
                config.capabilities.push('alarm_motion');
                config.clusters.push(1280); // IAS Zone
            }
            if (name.includes('temperature')) {
                config.capabilities.push('measure_temperature');
                config.clusters.push(1026); // Temperature Measurement
            }
            if (name.includes('humidity')) {
                config.capabilities.push('measure_humidity');
                config.clusters.push(1029); // Humidity Measurement
            }
            if (name.includes('co2')) {
                config.capabilities.push('measure_co2');
            }
            if (name.includes('pm25')) {
                config.capabilities.push('measure_pm25');
            }
            if (name.includes('battery') || (!name.includes('ac') && !name.includes('dc'))) {
                config.energy = { batteries: ['CR2032'] };
                config.capabilities.push('measure_battery');
                config.clusters.push(1); // Power Configuration
            }
        }
        
        // Analyse des lights/bulbs
        else if (name.includes('bulb') || name.includes('light') || name.includes('strip')) {
            config.deviceClass = 'light';
            config.capabilities = ['onoff', 'dim'];
            config.clusters.push(8); // Level Control
            
            if (name.includes('rgb')) {
                config.capabilities.push('light_hue', 'light_saturation');
                config.clusters.push(768); // Color Control
            } else if (name.includes('tunable')) {
                config.capabilities.push('light_temperature');
                config.clusters.push(768); // Color Control
            }
        }
        
        // Analyse des plugs
        else if (name.includes('plug') || name.includes('outlet')) {
            config.deviceClass = 'socket';
            config.capabilities = ['onoff'];
            
            if (name.includes('energy')) {
                config.capabilities.push('measure_power', 'meter_power');
                config.clusters.push(1794); // Smart Energy Metering
            }
        }
        
        // Analyse des locks
        else if (name.includes('lock')) {
            config.deviceClass = 'lock';
            config.capabilities = ['locked'];
            config.energy = { batteries: ['CR2'] };
            config.capabilities.push('measure_battery');
            config.clusters.push(1, 257); // Power Configuration, Door Lock
        }
        
        // Analyse des detectors
        else if (name.includes('detector')) {
            config.deviceClass = 'sensor';
            config.capabilities = ['alarm_smoke', 'alarm_co', 'alarm_fire'];
            config.energy = { batteries: ['CR2'] };
            config.capabilities.push('measure_battery');
            config.clusters.push(1, 1280); // Power Configuration, IAS Zone
        }
        
        // Analyse des covers
        else if (name.includes('blind') || name.includes('curtain') || name.includes('shade')) {
            config.deviceClass = 'windowcoverings';
            config.capabilities = ['windowcoverings_state', 'windowcoverings_set'];
            config.clusters.push(258); // Window Covering
        }
        
        // Analyse du climate
        else if (name.includes('thermostat') || name.includes('climate') || name.includes('fan')) {
            config.deviceClass = 'thermostat';
            config.capabilities = ['target_temperature', 'measure_temperature'];
            config.clusters.push(513, 1026); // Thermostat, Temperature Measurement
        }

        return config;
    }

    extractButtonCount(name) {
        const patterns = [
            /(\d+)gang/,
            /(\d+)_gang/,
            /(\d+)button/,
            /(\d+)_button/,
            /(\d+)ch/
        ];
        
        for (const pattern of patterns) {
            const match = name.match(pattern);
            if (match) return parseInt(match[1]);
        }
        
        return 1;
    }

    generateDisplayName(driverName) {
        return driverName
            .replace(/_/g, ' ')
            .replace(/(\d+)gang/g, '$1-Gang')
            .replace(/cr2032/g, 'Battery')
            .replace(/ac/g, 'AC')
            .replace(/dc/g, 'DC')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    generateDeviceJs(driverName) {
        const className = this.toPascalCase(driverName);
        const config = this.analyzeDriverFromName(driverName);
        
        return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        
        this.printNode();
        
        // Register capabilities
${config.capabilities.map(cap => `        this.registerCapability('${cap}', CLUSTER.${this.getClusterForCapability(cap)});`).join('\n')}
        
        this.log('${className} initialized');
    }
    
    async onSettings({ oldSettings, newSettings, changedKeys }) {
        this.log('${className} settings were changed');
    }
}

module.exports = ${className};`;
    }

    getClusterForCapability(capability) {
        const clusterMap = {
            'onoff': 'ON_OFF',
            'button.1': 'ON_OFF', 'button.2': 'ON_OFF', 'button.3': 'ON_OFF', 'button.4': 'ON_OFF',
            'button.5': 'ON_OFF', 'button.6': 'ON_OFF',
            'alarm_motion': 'IAS_ZONE',
            'measure_battery': 'POWER_CONFIGURATION',
            'measure_temperature': 'TEMPERATURE_MEASUREMENT',
            'measure_humidity': 'RELATIVE_HUMIDITY_MEASUREMENT',
            'dim': 'LEVEL_CONTROL',
            'light_hue': 'COLOR_CONTROL',
            'light_saturation': 'COLOR_CONTROL',
            'light_temperature': 'COLOR_CONTROL',
            'measure_power': 'ELECTRICAL_MEASUREMENT',
            'meter_power': 'SIMPLE_METERING',
            'locked': 'DOOR_LOCK',
            'windowcoverings_state': 'WINDOW_COVERING',
            'windowcoverings_set': 'WINDOW_COVERING',
            'target_temperature': 'THERMOSTAT'
        };
        
        const baseCapability = capability.split('.')[0];
        return clusterMap[capability] || clusterMap[baseCapability] || 'ON_OFF';
    }

    toPascalCase(str) {
        return str.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
    }

    async createImagePlaceholder(imagePath, isLarge) {
        // Créer un fichier placeholder pour les images
        // Dans un vrai projet, on utiliserait une bibliothèque comme sharp ou jimp
        const dimensions = isLarge ? '500x500' : '75x75';
        const placeholder = `# Image Placeholder: ${dimensions}\n# This should be replaced with an actual PNG image\n# Generated by Ultimate Zigbee Hub Enhancement`;
        
        // Créer un fichier temporaire qui sera remplacé par le générateur d'images
        await fs.writeFile(imagePath.replace('.png', '.placeholder'), placeholder);
        
        // Copier une image par défaut si elle existe
        const defaultImagePath = path.join(this.projectRoot, 'assets', 'templates', isLarge ? 'large.png' : 'small.png');
        if (await fs.pathExists(defaultImagePath)) {
            await fs.copy(defaultImagePath, imagePath);
        }
    }

    async validateDriverJson(driver) {
        const driverJsonPath = path.join(driver.path, 'driver.json');
        
        if (await fs.pathExists(driverJsonPath)) {
            try {
                const driverJson = await fs.readJson(driverJsonPath);
                
                // Vérifications de base
                const requiredFields = ['id', 'name', 'class', 'capabilities'];
                const missingFields = requiredFields.filter(field => !driverJson[field]);
                
                if (missingFields.length > 0) {
                    console.log(`    ⚠️  driver.json missing fields: ${missingFields.join(', ')}`);
                    
                    // Compléter les champs manquants
                    if (!driverJson.id) driverJson.id = driver.name;
                    if (!driverJson.name) driverJson.name = { en: this.generateDisplayName(driver.name) };
                    if (!driverJson.class) driverJson.class = 'other';
                    if (!driverJson.capabilities) driverJson.capabilities = ['onoff'];
                    
                    await fs.writeJson(driverJsonPath, driverJson, { spaces: 2 });
                    
                    this.completedFiles.push({
                        driver: driver.name,
                        file: 'driver.json',
                        action: 'updated'
                    });
                }
                
            } catch (error) {
                console.log(`    ❌ Error validating driver.json: ${error.message}`);
                this.errors.push({
                    driver: driver.name,
                    file: 'driver.json',
                    error: error.message
                });
            }
        }
    }

    async validateDeviceJs(driver) {
        const deviceJsPath = path.join(driver.path, 'device.js');
        
        if (await fs.pathExists(deviceJsPath)) {
            try {
                const deviceJs = await fs.readFile(deviceJsPath, 'utf8');
                
                // Vérifications de base
                const hasRequiredImports = deviceJs.includes('ZigBeeDevice') || deviceJs.includes('homey-zigbeedriver');
                const hasModuleExports = deviceJs.includes('module.exports');
                
                if (!hasRequiredImports || !hasModuleExports) {
                    console.log(`    ⚠️  device.js missing required structure`);
                    
                    // Si le fichier est trop basique, le régénérer
                    if (deviceJs.trim().length < 100) {
                        const newDeviceJs = this.generateDeviceJs(driver.name);
                        await fs.writeFile(deviceJsPath, newDeviceJs);
                        
                        this.completedFiles.push({
                            driver: driver.name,
                            file: 'device.js',
                            action: 'regenerated'
                        });
                    }
                }
                
            } catch (error) {
                console.log(`    ❌ Error validating device.js: ${error.message}`);
                this.errors.push({
                    driver: driver.name,
                    file: 'device.js',
                    error: error.message
                });
            }
        }
    }

    async generateCompletionReport() {
        console.log('\n📊 Generating completion report...');
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalFilesChecked: this.missingFiles.length + this.completedFiles.length,
                missingFiles: this.missingFiles.length,
                completedFiles: this.completedFiles.length,
                errors: this.errors.length
            },
            missingFiles: this.missingFiles,
            completedFiles: this.completedFiles,
            errors: this.errors,
            actions: [
                `Found ${this.missingFiles.length} missing files`,
                `Completed ${this.completedFiles.length} file operations`,
                `Encountered ${this.errors.length} errors`
            ]
        };
        
        await fs.ensureDir(this.reportsPath);
        await fs.writeJson(
            path.join(this.reportsPath, 'missing-files-completion-report.json'),
            report,
            { spaces: 2 }
        );
        
        console.log(`  📄 Completion report saved`);
        console.log(`  📊 Summary:`);
        console.log(`     Missing files found: ${report.summary.missingFiles}`);
        console.log(`     Files completed: ${report.summary.completedFiles}`);
        console.log(`     Errors encountered: ${report.summary.errors}`);
        
        if (this.errors.length > 0) {
            console.log(`  ⚠️  Errors detected:`);
            this.errors.forEach(error => {
                console.log(`     ${error.driver}/${error.file}: ${error.error}`);
            });
        }
    }
}

// Exécution
if (require.main === module) {
    new MissingFilesCompletion().run().catch(console.error);
}

module.exports = MissingFilesCompletion;
