#!/usr/bin/env node

/**
 * SMART CATEGORY RESTORATION 
 * Restaure les catégories spécifiques qui ont été trop agressivement fusionnées
 * Recrée les séparations importantes par boutons, alimentation, types spécifiques
 */

const fs = require('fs-extra');
const path = require('path');

class SmartCategoryRestoration {
    constructor() {
        this.projectRoot = process.cwd();
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.reportsPath = path.join(this.projectRoot, 'project-data', 'analysis-results');
        this.restoredCategories = [];
    }

    async run() {
        console.log('🔧 Starting Smart Category Restoration...');
        
        // Restaurer les catégories essentielles qui ont été fusionnées
        await this.restoreEssentialSwitchCategories();
        await this.restoreEssentialSensorCategories();
        await this.restoreEssentialLightCategories(); 
        await this.restoreEssentialPlugCategories();
        await this.restoreEssentialCoverCategories();
        await this.restoreEssentialDetectorCategories();
        await this.restoreEssentialLockCategories();
        await this.restoreEssentialClimateCategories();
        
        // Mise à jour .homeycompose
        await this.updateHomeyCompose();
        
        // Génération du rapport
        await this.generateRestorationReport();
        
        console.log('✅ Smart category restoration complete!');
    }

    async restoreEssentialSwitchCategories() {
        console.log('\n🔌 Restoring essential switch categories...');
        
        const switchCategories = [
            // Wall switches AC
            { name: 'wall_switch_1gang_ac', buttons: 1, power: 'ac', type: 'wall' },
            { name: 'wall_switch_2gang_ac', buttons: 2, power: 'ac', type: 'wall' },
            { name: 'wall_switch_3gang_ac', buttons: 3, power: 'ac', type: 'wall' },
            { name: 'wall_switch_4gang_ac', buttons: 4, power: 'ac', type: 'wall' },
            { name: 'wall_switch_5gang_ac', buttons: 5, power: 'ac', type: 'wall' },
            { name: 'wall_switch_6gang_ac', buttons: 6, power: 'ac', type: 'wall' },
            
            // Wall switches DC
            { name: 'wall_switch_1gang_dc', buttons: 1, power: 'dc', type: 'wall' },
            { name: 'wall_switch_2gang_dc', buttons: 2, power: 'dc', type: 'wall' },
            { name: 'wall_switch_3gang_dc', buttons: 3, power: 'dc', type: 'wall' },
            { name: 'wall_switch_4gang_dc', buttons: 4, power: 'dc', type: 'wall' },
            
            // Wireless switches Battery
            { name: 'wireless_switch_1gang_cr2032', buttons: 1, power: 'battery', type: 'wireless' },
            { name: 'wireless_switch_2gang_cr2032', buttons: 2, power: 'battery', type: 'wireless' },
            { name: 'wireless_switch_3gang_cr2032', buttons: 3, power: 'battery', type: 'wireless' },
            { name: 'wireless_switch_4gang_cr2032', buttons: 4, power: 'battery', type: 'wireless' },
            { name: 'wireless_switch_5gang_cr2032', buttons: 5, power: 'battery', type: 'wireless' },
            { name: 'wireless_switch_6gang_cr2032', buttons: 6, power: 'battery', type: 'wireless' },
            
            // Touch switches
            { name: 'touch_switch_1gang', buttons: 1, power: 'ac', type: 'touch' },
            { name: 'touch_switch_2gang', buttons: 2, power: 'ac', type: 'touch' },
            { name: 'touch_switch_3gang', buttons: 3, power: 'ac', type: 'touch' },
            { name: 'touch_switch_4gang', buttons: 4, power: 'ac', type: 'touch' },
            
            // Scene controllers
            { name: 'scene_controller_2button', buttons: 2, power: 'battery', type: 'scene' },
            { name: 'scene_controller_4button', buttons: 4, power: 'battery', type: 'scene' },
            { name: 'scene_controller_6button', buttons: 6, power: 'battery', type: 'scene' },
            { name: 'scene_controller_8button', buttons: 8, power: 'battery', type: 'scene' }
        ];
        
        for (const category of switchCategories) {
            await this.createOrRestoreCategory(category);
        }
        
        console.log(`  ✅ Restored ${switchCategories.length} switch categories`);
    }

    async restoreEssentialSensorCategories() {
        console.log('\n🔍 Restoring essential sensor categories...');
        
        const sensorCategories = [
            // Motion sensors
            { name: 'motion_sensor_pir_battery', type: 'motion', subtype: 'pir', power: 'battery' },
            { name: 'motion_sensor_pir_ac', type: 'motion', subtype: 'pir', power: 'ac' },
            { name: 'motion_sensor_radar_battery', type: 'motion', subtype: 'radar', power: 'battery' },
            { name: 'motion_sensor_radar_ac', type: 'motion', subtype: 'radar', power: 'ac' },
            { name: 'motion_sensor_mmwave_battery', type: 'motion', subtype: 'mmwave', power: 'battery' },
            { name: 'motion_sensor_mmwave_ac', type: 'motion', subtype: 'mmwave', power: 'ac' },
            
            // Environment sensors
            { name: 'temperature_humidity_sensor', type: 'environment', subtype: 'temp_hum', power: 'battery' },
            { name: 'air_quality_sensor', type: 'environment', subtype: 'air_quality', power: 'ac' },
            { name: 'co2_sensor', type: 'environment', subtype: 'co2', power: 'ac' },
            { name: 'tvoc_sensor', type: 'environment', subtype: 'tvoc', power: 'ac' },
            { name: 'formaldehyde_sensor', type: 'environment', subtype: 'formaldehyde', power: 'ac' },
            { name: 'pm25_sensor', type: 'environment', subtype: 'pm25', power: 'ac' },
            { name: 'noise_level_sensor', type: 'environment', subtype: 'noise', power: 'ac' },
            { name: 'lux_sensor', type: 'environment', subtype: 'light', power: 'ac' },
            { name: 'pressure_sensor', type: 'environment', subtype: 'pressure', power: 'battery' },
            
            // Contact/Security sensors
            { name: 'door_window_sensor', type: 'contact', subtype: 'door_window', power: 'battery' },
            { name: 'vibration_sensor', type: 'contact', subtype: 'vibration', power: 'battery' },
            { name: 'water_leak_sensor', type: 'contact', subtype: 'water_leak', power: 'battery' },
            
            // Specialized sensors
            { name: 'soil_moisture_sensor', type: 'specialized', subtype: 'soil', power: 'battery' },
            { name: 'presence_sensor_radar', type: 'specialized', subtype: 'presence', power: 'ac' },
            { name: 'multisensor', type: 'specialized', subtype: 'multi', power: 'battery' }
        ];
        
        for (const category of sensorCategories) {
            await this.createOrRestoreCategory(category);
        }
        
        console.log(`  ✅ Restored ${sensorCategories.length} sensor categories`);
    }

    async restoreEssentialLightCategories() {
        console.log('\n💡 Restoring essential light categories...');
        
        const lightCategories = [
            // Smart bulbs
            { name: 'smart_bulb_white', type: 'bulb', subtype: 'white', power: 'ac' },
            { name: 'smart_bulb_tunable', type: 'bulb', subtype: 'tunable', power: 'ac' },
            { name: 'smart_bulb_rgb', type: 'bulb', subtype: 'rgb', power: 'ac' },
            { name: 'smart_spot', type: 'bulb', subtype: 'spot', power: 'ac' },
            
            // Light controllers
            { name: 'led_strip_controller', type: 'controller', subtype: 'led_strip', power: 'ac' },
            { name: 'ceiling_light_controller', type: 'controller', subtype: 'ceiling', power: 'ac' },
            { name: 'outdoor_light_controller', type: 'controller', subtype: 'outdoor', power: 'ac' },
            { name: 'strip_light_controller', type: 'controller', subtype: 'strip', power: 'ac' },
            
            // Dimmers
            { name: 'touch_dimmer', type: 'dimmer', subtype: 'touch', power: 'ac' }
        ];
        
        for (const category of lightCategories) {
            await this.createOrRestoreCategory(category);
        }
        
        console.log(`  ✅ Restored ${lightCategories.length} light categories`);
    }

    async restoreEssentialPlugCategories() {
        console.log('\n🔌 Restoring essential plug categories...');
        
        const plugCategories = [
            { name: 'smart_plug', type: 'plug', subtype: 'basic', power: 'ac' },
            { name: 'energy_monitoring_plug', type: 'plug', subtype: 'energy', power: 'ac' },
            { name: 'extension_plug', type: 'plug', subtype: 'extension', power: 'ac' },
            { name: 'usb_outlet', type: 'outlet', subtype: 'usb', power: 'ac' }
        ];
        
        for (const category of plugCategories) {
            await this.createOrRestoreCategory(category);
        }
        
        console.log(`  ✅ Restored ${plugCategories.length} plug categories`);
    }

    async restoreEssentialCoverCategories() {
        console.log('\n🏠 Restoring essential cover categories...');
        
        const coverCategories = [
            { name: 'roller_blind_controller', type: 'blind', subtype: 'roller', power: 'ac' },
            { name: 'venetian_blind_controller', type: 'blind', subtype: 'venetian', power: 'ac' },
            { name: 'curtain_motor', type: 'curtain', subtype: 'motor', power: 'ac' },
            { name: 'shade_controller', type: 'shade', subtype: 'controller', power: 'ac' },
            { name: 'garage_door_controller', type: 'door', subtype: 'garage', power: 'ac' },
            { name: 'projector_screen_controller', type: 'screen', subtype: 'projector', power: 'ac' }
        ];
        
        for (const category of coverCategories) {
            await this.createOrRestoreCategory(category);
        }
        
        console.log(`  ✅ Restored ${coverCategories.length} cover categories`);
    }

    async restoreEssentialDetectorCategories() {
        console.log('\n🚨 Restoring essential detector categories...');
        
        const detectorCategories = [
            { name: 'smoke_detector', type: 'detector', subtype: 'smoke', power: 'battery' },
            { name: 'co_detector', type: 'detector', subtype: 'co', power: 'battery' },
            { name: 'gas_detector', type: 'detector', subtype: 'gas', power: 'ac' }
        ];
        
        for (const category of detectorCategories) {
            await this.createOrRestoreCategory(category);
        }
        
        console.log(`  ✅ Restored ${detectorCategories.length} detector categories`);
    }

    async restoreEssentialLockCategories() {
        console.log('\n🔒 Restoring essential lock categories...');
        
        const lockCategories = [
            { name: 'smart_lock', type: 'lock', subtype: 'smart', power: 'battery' },
            { name: 'door_lock', type: 'lock', subtype: 'door', power: 'battery' },
            { name: 'fingerprint_lock', type: 'lock', subtype: 'fingerprint', power: 'battery' },
            { name: 'keypad_lock', type: 'lock', subtype: 'keypad', power: 'battery' }
        ];
        
        for (const category of lockCategories) {
            await this.createOrRestoreCategory(category);
        }
        
        console.log(`  ✅ Restored ${lockCategories.length} lock categories`);
    }

    async restoreEssentialClimateCategories() {
        console.log('\n🌡️ Restoring essential climate categories...');
        
        const climateCategories = [
            { name: 'thermostat', type: 'climate', subtype: 'thermostat', power: 'ac' },
            { name: 'radiator_valve', type: 'climate', subtype: 'radiator', power: 'battery' },
            { name: 'temperature_controller', type: 'climate', subtype: 'temp_control', power: 'ac' },
            { name: 'fan_controller', type: 'climate', subtype: 'fan', power: 'ac' },
            { name: 'air_conditioner_controller', type: 'climate', subtype: 'ac', power: 'ac' },
            { name: 'hvac_controller', type: 'climate', subtype: 'hvac', power: 'ac' }
        ];
        
        for (const category of climateCategories) {
            await this.createOrRestoreCategory(category);
        }
        
        console.log(`  ✅ Restored ${climateCategories.length} climate categories`);
    }

    async createOrRestoreCategory(categoryConfig) {
        const driverPath = path.join(this.driversPath, categoryConfig.name);
        
        if (await fs.pathExists(driverPath)) {
            console.log(`    ✅ Already exists: ${categoryConfig.name}`);
            return;
        }
        
        console.log(`    ➕ Creating: ${categoryConfig.name}`);
        
        await fs.ensureDir(driverPath);
        await fs.ensureDir(path.join(driverPath, 'assets'));
        
        // Créer driver.json
        const driverJson = this.generateDriverJson(categoryConfig);
        await fs.writeJson(path.join(driverPath, 'driver.json'), driverJson, { spaces: 2 });
        
        // Créer device.js
        const deviceJs = this.generateDeviceJs(categoryConfig);
        await fs.writeFile(path.join(driverPath, 'device.js'), deviceJs);
        
        this.restoredCategories.push(categoryConfig);
    }

    generateDriverJson(config) {
        const capabilities = this.getCapabilitiesForConfig(config);
        const deviceClass = this.getDeviceClassForConfig(config);
        const energy = this.getEnergyConfigForConfig(config);
        
        return {
            id: config.name,
            name: {
                en: this.generateDisplayName(config.name)
            },
            class: deviceClass,
            capabilities: capabilities,
            energy: energy,
            zigbee: {
                manufacturerName: this.getManufacturerIds(config),
                productId: this.getProductIds(config),
                endpoints: {
                    1: {
                        clusters: this.getClustersForConfig(config),
                        bindings: this.getBindingsForConfig(config)
                    }
                }
            },
            images: {
                large: `./assets/large.png`,
                small: `./assets/small.png`
            }
        };
    }

    getCapabilitiesForConfig(config) {
        const capabilities = [];
        
        if (config.buttons) {
            for (let i = 1; i <= config.buttons; i++) {
                capabilities.push(`button.${i}`);
            }
        } else if (config.type === 'motion' || config.subtype === 'motion') {
            capabilities.push('alarm_motion');
        } else if (config.type === 'environment') {
            if (config.subtype === 'temp_hum') {
                capabilities.push('measure_temperature', 'measure_humidity');
            } else if (config.subtype === 'air_quality') {
                capabilities.push('measure_co2', 'measure_pm25');
            } else if (config.subtype === 'co2') {
                capabilities.push('measure_co2');
            }
        } else if (config.type === 'bulb') {
            capabilities.push('onoff', 'dim');
            if (config.subtype === 'rgb') {
                capabilities.push('light_hue', 'light_saturation');
            } else if (config.subtype === 'tunable') {
                capabilities.push('light_temperature');
            }
        } else if (config.type === 'plug') {
            capabilities.push('onoff');
            if (config.subtype === 'energy') {
                capabilities.push('measure_power', 'meter_power');
            }
        } else if (config.type === 'lock') {
            capabilities.push('locked');
        } else if (config.type === 'climate') {
            if (config.subtype === 'thermostat') {
                capabilities.push('target_temperature', 'measure_temperature');
            } else if (config.subtype === 'fan') {
                capabilities.push('onoff', 'fan_speed');
            }
        } else {
            capabilities.push('onoff');
        }
        
        if (config.power === 'battery') {
            capabilities.push('measure_battery');
        }
        
        return capabilities;
    }

    getDeviceClassForConfig(config) {
        if (config.buttons || config.type === 'switch') return 'button';
        if (config.type === 'motion' || config.type === 'environment' || config.type === 'contact') return 'sensor';
        if (config.type === 'bulb' || config.type === 'controller') return 'light';
        if (config.type === 'plug' || config.type === 'outlet') return 'socket';
        if (config.type === 'lock') return 'lock';
        if (config.type === 'climate') return 'thermostat';
        if (config.type === 'detector') return 'sensor';
        if (config.type === 'blind' || config.type === 'curtain' || config.type === 'shade') return 'windowcoverings';
        
        return 'other';
    }

    getEnergyConfigForConfig(config) {
        if (config.power === 'battery') {
            return { batteries: ['CR2032'] };
        }
        return undefined;
    }

    getManufacturerIds(config) {
        return ['_TZ3000_', '_TZ3210_', '_TYZB01_'];
    }

    getProductIds(config) {
        const baseIds = ['TS0001', 'TS0002', 'TS0003', 'TS0004'];
        if (config.buttons) {
            const buttonId = `TS000${Math.min(config.buttons, 4)}`;
            return [buttonId, ...baseIds];
        }
        return baseIds;
    }

    getClustersForConfig(config) {
        const baseClusters = [0, 3, 4, 5, 6];
        
        if (config.type === 'motion' || config.type === 'contact' || config.type === 'detector') {
            baseClusters.push(1280); // IAS Zone
        }
        
        if (config.type === 'environment') {
            baseClusters.push(1026, 1029); // Temperature, Humidity
        }
        
        if (config.type === 'bulb' || config.type === 'controller') {
            baseClusters.push(8, 768); // Level Control, Color Control
        }
        
        if (config.power === 'battery') {
            baseClusters.push(1); // Power Configuration
        }
        
        return baseClusters;
    }

    getBindingsForConfig(config) {
        return [6, 8];
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

    generateDeviceJs(config) {
        const className = this.toPascalCase(config.name);
        
        return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${className} extends ZigBeeDevice {
    
    async onNodeInit({ zclNode }) {
        await super.onNodeInit({ zclNode });
        
        this.printNode();
        
        // Register capabilities based on config
        ${this.generateCapabilityRegistrations(config)}
    }
}

module.exports = ${className};`;
    }

    generateCapabilityRegistrations(config) {
        const capabilities = this.getCapabilitiesForConfig(config);
        return capabilities.map(cap => {
            const cluster = this.getClusterForCapability(cap);
            return `this.registerCapability('${cap}', CLUSTER.${cluster});`;
        }).join('\n        ');
    }

    getClusterForCapability(capability) {
        if (capability.startsWith('button')) return 'ON_OFF';
        if (capability === 'alarm_motion') return 'IAS_ZONE';
        if (capability === 'measure_battery') return 'POWER_CONFIGURATION';
        if (capability === 'measure_temperature') return 'TEMPERATURE_MEASUREMENT';
        if (capability === 'measure_humidity') return 'RELATIVE_HUMIDITY_MEASUREMENT';
        if (capability === 'onoff') return 'ON_OFF';
        if (capability === 'dim') return 'LEVEL_CONTROL';
        if (capability === 'light_hue' || capability === 'light_saturation') return 'COLOR_CONTROL';
        
        return 'ON_OFF';
    }

    toPascalCase(str) {
        return str.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join('');
    }

    async updateHomeyCompose() {
        console.log('\n📝 Updating .homeycompose with restored categories...');
        
        const composeFile = path.join(this.projectRoot, '.homeycompose', 'app.json');
        let compose = {};
        
        if (await fs.pathExists(composeFile)) {
            compose = await fs.readJson(composeFile);
        }
        
        // Récupérer tous les drivers actuels
        const drivers = await fs.readdir(this.driversPath);
        const driverConfigs = [];
        
        for (const driver of drivers) {
            const driverPath = path.join(this.driversPath, driver);
            const stat = await fs.stat(driverPath);
            
            if (stat.isDirectory()) {
                driverConfigs.push({
                    id: driver,
                    name: { en: this.generateDisplayName(driver) },
                    images: {
                        large: `./drivers/${driver}/assets/large.png`,
                        small: `./drivers/${driver}/assets/small.png`
                    }
                });
            }
        }
        
        compose.drivers = driverConfigs;
        
        // Incrément de version
        const currentVersion = compose.version || '2.1.4';
        const versionParts = currentVersion.split('.');
        versionParts[2] = String(parseInt(versionParts[2]) + 1);
        compose.version = versionParts.join('.');
        
        await fs.writeJson(composeFile, compose, { spaces: 2 });
        
        console.log(`  ✅ Updated .homeycompose with ${driverConfigs.length} drivers`);
        console.log(`  📈 Version updated to: ${compose.version}`);
    }

    async generateRestorationReport() {
        console.log('\n📊 Generating restoration report...');
        
        const finalDrivers = await fs.readdir(this.driversPath);
        
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                restoredCategories: this.restoredCategories.length,
                finalDriverCount: finalDrivers.length,
                previousDriverCount: 50
            },
            restoredCategories: this.restoredCategories,
            finalDriverList: finalDrivers.sort(),
            categorization: this.categorizeFinalDrivers(finalDrivers)
        };
        
        await fs.ensureDir(this.reportsPath);
        await fs.writeJson(
            path.join(this.reportsPath, 'smart-category-restoration-report.json'),
            report,
            { spaces: 2 }
        );
        
        console.log(`  📄 Restoration report saved`);
        console.log(`  📊 Restoration Summary:`);
        console.log(`     Previous drivers: ${report.summary.previousDriverCount}`);
        console.log(`     Restored categories: ${report.summary.restoredCategories}`);
        console.log(`     Final driver count: ${report.summary.finalDriverCount}`);
        
        // Affichage par catégorie
        for (const [category, count] of Object.entries(report.categorization)) {
            console.log(`     ${category}: ${count} drivers`);
        }
    }

    categorizeFinalDrivers(drivers) {
        const categorization = {};
        
        drivers.forEach(driver => {
            let category = 'other';
            
            if (driver.includes('switch')) category = 'switches';
            else if (driver.includes('sensor')) category = 'sensors';
            else if (driver.includes('bulb') || driver.includes('light')) category = 'lights';
            else if (driver.includes('plug') || driver.includes('outlet')) category = 'plugs';
            else if (driver.includes('lock')) category = 'locks';
            else if (driver.includes('blind') || driver.includes('curtain') || driver.includes('shade')) category = 'covers';
            else if (driver.includes('detector')) category = 'detectors';
            else if (driver.includes('thermostat') || driver.includes('climate') || driver.includes('fan')) category = 'climate';
            
            if (!categorization[category]) categorization[category] = 0;
            categorization[category]++;
        });
        
        return categorization;
    }
}

// Exécution
if (require.main === module) {
    new SmartCategoryRestoration().run().catch(console.error);
}

module.exports = SmartCategoryRestoration;
