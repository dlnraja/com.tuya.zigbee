const fs = require('fs');
const path = require('path');

class IntelligentDriverUnbranderReorganizer {
    constructor() {
        this.projectRoot = path.resolve(__dirname, '..', '..');
        this.driversPath = path.join(this.projectRoot, 'drivers');
        this.brandedDrivers = [];
        this.categoryMappings = {
            // Battery-powered switches (CR2032, CR2450, etc.)
            battery_switches: {
                'wireless_switch_1gang_battery': ['aqara_button', 'wireless_button'],
                'wireless_switch_2gang_battery': [],
                'wireless_switch_3gang_battery': [],
                'wireless_switch_4gang_battery': [],
                'scene_controller_battery': ['scene_switch']
            },
            // AC-powered wall switches
            ac_wall_switches: {
                'wall_switch_1gang': ['wall_switch_1gang'],
                'wall_switch_2gang': ['wall_switch_2gang'], 
                'wall_switch_3gang': ['wall_switch_3gang'],
                'wall_switch_4gang': ['wall_switch_4gang'],
                'wall_switch_5gang': [],
                'wall_switch_6gang': []
            },
            // Motion & presence sensors
            motion_sensors: {
                'motion_sensor_pir': ['motion_sensor', 'pir_sensor'],
                'motion_sensor_radar': ['radar_sensor'],
                'motion_sensor_mmwave': [],
                'presence_sensor_radar': ['presence_sensor']
            },
            // Environmental sensors
            environmental_sensors: {
                'temperature_humidity_sensor': ['temperature_humidity_sensor', 'aqara_temperature_sensor'],
                'air_quality_sensor': ['air_quality_monitor'],
                'soil_moisture_sensor': ['soil_moisture_sensor'],
                'soil_temperature_humidity_sensor': [],
                'co2_sensor': [],
                'tvoc_sensor': [],
                'pm25_sensor': [],
                'formaldehyde_sensor': ['formaldehyde_sensor'],
                'noise_level_sensor': ['noise_sensor'],
                'lux_sensor': ['lux_sensor'],
                'pressure_sensor': ['pressure_sensor'],
                'vibration_sensor': ['vibration_sensor']
            },
            // Contact & security sensors
            contact_sensors: {
                'contact_sensor': ['contact_sensor', 'door_window_sensor'],
                'water_leak_sensor': ['water_leak_sensor'],
                'smoke_detector': ['smoke_detector'],
                'gas_detector': ['gas_detector'],
                'co_detector': ['co_detector']
            },
            // Smart lighting
            smart_lights: {
                'smart_bulb_white': ['smart_bulb', 'filament_bulb', 'candle_bulb'],
                'smart_bulb_tunable': ['tunable_white_bulb'],
                'smart_bulb_rgb': ['rgb_bulb'],
                'smart_spot': ['gu10_spot'],
                'led_strip_controller': ['led_strip', 'led_controller'],
                'ceiling_light_controller': [],
                'outdoor_light_controller': []
            },
            // Dimmers & controllers
            dimmer_controllers: {
                'dimmer_switch': ['dimmer_switch', 'rotary_dimmer'],
                'touch_dimmer': ['touch_switch'],
                'strip_light_controller': []
            },
            // Smart plugs & outlets
            power_outlets: {
                'smart_plug': ['smart_plug'],
                'smart_outlet': ['smart_outlet', 'wall_outlet'],
                'energy_monitoring_plug': ['energy_plug'],
                'extension_plug': ['extension_plug'],
                'usb_outlet': ['usb_outlet']
            },
            // Climate control
            climate_control: {
                'thermostat': ['thermostat'],
                'radiator_valve': ['radiator_valve'],
                'fan_controller': ['fan_controller'],
                'hvac_controller': ['hvac_controller'],
                'temperature_controller': ['temperature_controller'],
                'fan_speed_controller': [],
                'air_conditioner_controller': [],
                'dehumidifier_controller': []
            },
            // Covers & blinds
            window_covers: {
                'curtain_motor': ['curtain_motor'],
                'blind_controller': ['blind_controller'],
                'roller_blind_controller': ['roller_blind'],
                'shade_controller': ['shade_controller'],
                'awning_controller': [],
                'projector_screen_controller': [],
                'venetian_blind_controller': [],
                'window_motor': ['window_motor']
            },
            // Security & access
            security_access: {
                'smart_lock': ['smart_lock'],
                'keypad_lock': ['keypad_lock'],
                'fingerprint_lock': ['fingerprint_lock'],
                'door_lock': ['door_lock'],
                'garage_door_controller': ['garage_door'],
                'door_controller': ['door_controller'],
                'smart_doorbell': [],
                'access_controller': [],
                'alarm_keypad': []
            },
            // Emergency & SOS
            emergency_controls: {
                'emergency_button': ['emergency_button'],
                'panic_button': ['panic_button'],
                'sos_button': ['sos_button']
            },
            // Specialized devices
            specialized_devices: {
                'cube_controller': ['aqara_cube'],
                'multisensor': ['multisensor']
            },
            // Brand-specific that need generic alternatives
            brand_specific_remove: [
                'hue_bulb', 'hue_dimmer', 'hue_motion_sensor',
                'ikea_tradfri_bulb', 'ikea_styrbar_remote', 'ikea_symfonisk_remote',
                'sonoff_basic', 'sonoff_mini', 'sonoff_zbbridge'
            ]
        };
    }
    
    async analyzeCurrentDrivers() {
        console.log('🔍 Analyzing current drivers for rebranding...');
        const drivers = fs.readdirSync(this.driversPath);
        
        this.brandedDrivers = drivers.filter(driver => {
            return driver.includes('aqara_') || 
                   driver.includes('hue_') || 
                   driver.includes('ikea_') || 
                   driver.includes('sonoff_') ||
                   driver.includes('tuya_');
        });
        
        console.log(`📊 Found ${this.brandedDrivers.length} branded drivers to reorganize`);
        return this.brandedDrivers;
    }
    
    async createUnbrandedCategories() {
        console.log('📂 Creating unbranded category structure...');
        
        const reorganizationPlan = [];
        
        for (const [category, mappings] of Object.entries(this.categoryMappings)) {
            if (category === 'brand_specific_remove') continue;
            
            console.log(`\n📁 Processing category: ${category}`);
            
            for (const [newName, oldNames] of Object.entries(mappings)) {
                const existingDrivers = oldNames.filter(name => 
                    fs.existsSync(path.join(this.driversPath, name))
                );
                
                if (existingDrivers.length > 0) {
                    reorganizationPlan.push({
                        category,
                        newName,
                        oldNames: existingDrivers,
                        action: existingDrivers.length > 1 ? 'merge' : 'rename'
                    });
                    
                    console.log(`  ✅ ${newName}: ${existingDrivers.join(', ')}`);
                } else if (oldNames.length === 0) {
                    // New driver to create
                    reorganizationPlan.push({
                        category,
                        newName,
                        oldNames: [],
                        action: 'create'
                    });
                    
                    console.log(`  🆕 ${newName}: new driver to create`);
                }
            }
        }
        
        return reorganizationPlan;
    }
    
    async executeReorganization(plan) {
        console.log('🔄 Executing driver reorganization...');
        const results = [];
        
        for (const item of plan) {
            try {
                switch (item.action) {
                    case 'rename':
                        await this.renameDriver(item.oldNames[0], item.newName);
                        results.push({ ...item, status: 'renamed' });
                        break;
                        
                    case 'merge':
                        await this.mergeDrivers(item.oldNames, item.newName);
                        results.push({ ...item, status: 'merged' });
                        break;
                        
                    case 'create':
                        await this.createNewDriver(item.newName, item.category);
                        results.push({ ...item, status: 'created' });
                        break;
                }
                
                console.log(`✅ ${item.action}: ${item.newName}`);
                
            } catch (error) {
                console.error(`❌ Failed ${item.action}: ${item.newName}`, error.message);
                results.push({ ...item, status: 'failed', error: error.message });
            }
        }
        
        return results;
    }
    
    async renameDriver(oldName, newName) {
        const oldPath = path.join(this.driversPath, oldName);
        const newPath = path.join(this.driversPath, newName);
        
        if (fs.existsSync(newPath)) {
            throw new Error(`Target driver ${newName} already exists`);
        }
        
        // Rename directory
        fs.renameSync(oldPath, newPath);
        
        // Update driver ID in driver.compose.json
        const composeFile = path.join(newPath, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
            const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            compose.id = newName;
            fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
        }
    }
    
    async mergeDrivers(oldNames, newName) {
        const newPath = path.join(this.driversPath, newName);
        
        // Create new driver directory
        if (!fs.existsSync(newPath)) {
            fs.mkdirSync(newPath, { recursive: true });
        }
        
        // Use the most complete driver as base
        let baseDriver = oldNames[0];
        let maxItems = 0;
        
        for (const driver of oldNames) {
            const driverPath = path.join(this.driversPath, driver);
            const items = fs.readdirSync(driverPath).length;
            if (items > maxItems) {
                maxItems = items;
                baseDriver = driver;
            }
        }
        
        // Copy base driver content
        const basePath = path.join(this.driversPath, baseDriver);
        await this.copyDirectory(basePath, newPath);
        
        // Update driver ID
        const composeFile = path.join(newPath, 'driver.compose.json');
        if (fs.existsSync(composeFile)) {
            const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
            compose.id = newName;
            
            // Merge manufacturer IDs from all drivers
            const allManufacturerIds = new Set(compose.manufacturerId || []);
            const allProductIds = new Set(compose.productId || []);
            
            for (const driver of oldNames) {
                const driverCompose = path.join(this.driversPath, driver, 'driver.compose.json');
                if (fs.existsSync(driverCompose)) {
                    const driverData = JSON.parse(fs.readFileSync(driverCompose, 'utf8'));
                    (driverData.manufacturerId || []).forEach(id => allManufacturerIds.add(id));
                    (driverData.productId || []).forEach(id => allProductIds.add(id));
                }
            }
            
            compose.manufacturerId = Array.from(allManufacturerIds);
            compose.productId = Array.from(allProductIds);
            
            fs.writeFileSync(composeFile, JSON.stringify(compose, null, 2));
        }
        
        // Remove old drivers
        for (const driver of oldNames) {
            const oldPath = path.join(this.driversPath, driver);
            if (fs.existsSync(oldPath)) {
                fs.rmSync(oldPath, { recursive: true, force: true });
            }
        }
    }
    
    async createNewDriver(driverName, category) {
        const driverPath = path.join(this.driversPath, driverName);
        
        if (fs.existsSync(driverPath)) {
            return; // Already exists
        }
        
        fs.mkdirSync(driverPath, { recursive: true });
        
        // Create basic structure
        const assetsPath = path.join(driverPath, 'assets');
        const pairPath = path.join(driverPath, 'pair');
        
        fs.mkdirSync(assetsPath, { recursive: true });
        fs.mkdirSync(pairPath, { recursive: true });
        
        // Generate appropriate driver configuration based on category
        const driverConfig = this.generateDriverConfig(driverName, category);
        fs.writeFileSync(
            path.join(driverPath, 'driver.compose.json'), 
            JSON.stringify(driverConfig, null, 2)
        );
        
        // Generate basic device.js
        const deviceJs = this.generateDeviceJs(driverName, category);
        fs.writeFileSync(path.join(driverPath, 'device.js'), deviceJs);
    }
    
    generateDriverConfig(driverName, category) {
        const baseConfig = {
            id: driverName,
            class: this.getDriverClass(category),
            capabilities: this.getDriverCapabilities(driverName, category),
            energy: this.getEnergyConfig(driverName),
            zigbee: {
                manufacturerId: [],
                productId: [],
                endpoints: {
                    "1": {
                        clusters: this.getZigbeeClusters(category),
                        bindings: this.getZigbeeBindings(category)
                    }
                },
                learnmode: {
                    image: `/drivers/${driverName}/assets/learn.svg`,
                    instruction: {
                        en: `Press and hold the button until the LED flashes`,
                        fr: `Appuyez et maintenez le bouton jusqu'à ce que la LED clignote`,
                        nl: `Houd de knop ingedrukt totdat de LED knippert`,
                        de: `Halten Sie die Taste gedrückt, bis die LED blinkt`
                    }
                }
            },
            images: {
                small: `/drivers/${driverName}/assets/small.png`,
                large: `/drivers/${driverName}/assets/large.png`
            }
        };
        
        return baseConfig;
    }
    
    getDriverClass(category) {
        const classMap = {
            battery_switches: 'button',
            ac_wall_switches: 'light',
            motion_sensors: 'sensor',
            environmental_sensors: 'sensor',
            contact_sensors: 'sensor',
            smart_lights: 'light',
            dimmer_controllers: 'light',
            power_outlets: 'socket',
            climate_control: 'thermostat',
            window_covers: 'windowcoverings',
            security_access: 'lock',
            emergency_controls: 'button',
            specialized_devices: 'sensor'
        };
        
        return classMap[category] || 'sensor';
    }
    
    getDriverCapabilities(driverName, category) {
        if (driverName.includes('battery') || driverName.includes('wireless')) {
            return ['onoff', 'measure_battery', 'alarm_battery'];
        }
        
        if (driverName.includes('motion') || driverName.includes('presence')) {
            return ['alarm_motion', 'measure_battery', 'alarm_battery'];
        }
        
        if (driverName.includes('temperature') && driverName.includes('humidity')) {
            return ['measure_temperature', 'measure_humidity', 'measure_battery', 'alarm_battery'];
        }
        
        if (driverName.includes('switch') || driverName.includes('plug') || driverName.includes('outlet')) {
            return ['onoff'];
        }
        
        if (driverName.includes('dimmer') || driverName.includes('bulb')) {
            return ['onoff', 'dim'];
        }
        
        return ['onoff'];
    }
    
    getEnergyConfig(driverName) {
        if (driverName.includes('battery') || driverName.includes('wireless')) {
            return { batteries: ['CR2032', 'CR2450', 'AA'] };
        }
        return undefined;
    }
    
    getZigbeeClusters(category) {
        const clusterMap = {
            battery_switches: [0, 1, 3, 6],
            ac_wall_switches: [0, 3, 6, 8],
            motion_sensors: [0, 1, 3, 1030],
            environmental_sensors: [0, 1, 3, 1026, 1029],
            contact_sensors: [0, 1, 3, 1280],
            smart_lights: [0, 3, 6, 8, 768],
            power_outlets: [0, 3, 6, 2820],
            climate_control: [0, 3, 513, 516],
            window_covers: [0, 3, 258],
            security_access: [0, 3, 257],
            emergency_controls: [0, 1, 3],
            specialized_devices: [0, 1, 3]
        };
        
        return clusterMap[category] || [0, 3];
    }
    
    getZigbeeBindings(category) {
        if (category.includes('switches') || category.includes('lights')) {
            return [6, 8];
        }
        if (category.includes('sensors')) {
            return [1];
        }
        return [];
    }
    
    generateDeviceJs(driverName, category) {
        return `'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ${this.toPascalCase(driverName)}Device extends ZigBeeDevice {
    
    async onNodeInit() {
        this.log('${driverName} device initialized');
        
        // Register capabilities based on driver type
        await this.registerCapabilities();
        
        // Set up device-specific listeners
        await this.setupListeners();
    }
    
    async registerCapabilities() {
        // Implementation based on capabilities defined in driver.compose.json
        if (this.hasCapability('onoff')) {
            this.registerCapability('onoff', 'genOnOff');
        }
        
        if (this.hasCapability('dim')) {
            this.registerCapability('dim', 'genLevelCtrl');
        }
        
        if (this.hasCapability('measure_battery')) {
            this.registerCapability('measure_battery', 'genPowerCfg', {
                reportOpts: {
                    configureAttributeReporting: {
                        minInterval: 0,
                        maxInterval: 3600,
                        minChange: 1
                    }
                }
            });
        }
        
        if (this.hasCapability('alarm_motion')) {
            this.registerCapability('alarm_motion', 'msOccupancySensing');
        }
        
        if (this.hasCapability('measure_temperature')) {
            this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
        }
        
        if (this.hasCapability('measure_humidity')) {
            this.registerCapability('measure_humidity', 'msRelativeHumidity');
        }
    }
    
    async setupListeners() {
        // Device-specific event listeners and configurations
        this.log('Device listeners configured');
    }
}

module.exports = ${this.toPascalCase(driverName)}Device;`;
    }
    
    toPascalCase(str) {
        return str.replace(/(^|_)([a-z])/g, (match, prefix, letter) => letter.toUpperCase());
    }
    
    async copyDirectory(src, dest) {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            
            if (entry.isDirectory()) {
                fs.mkdirSync(destPath, { recursive: true });
                await this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
    
    async generateReport(results) {
        const report = {
            timestamp: new Date().toISOString(),
            totalDrivers: results.length,
            successful: results.filter(r => r.status !== 'failed').length,
            failed: results.filter(r => r.status === 'failed').length,
            actions: {
                renamed: results.filter(r => r.status === 'renamed').length,
                merged: results.filter(r => r.status === 'merged').length,
                created: results.filter(r => r.status === 'created').length
            },
            details: results
        };
        
        const reportPath = path.join(this.projectRoot, 'project-data', 'analysis-results', 'driver-reorganization-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        
        console.log('\n📊 Reorganization Report:');
        console.log(`✅ Total operations: ${report.totalDrivers}`);
        console.log(`✅ Successful: ${report.successful}`);
        console.log(`❌ Failed: ${report.failed}`);
        console.log(`📁 Renamed: ${report.actions.renamed}`);
        console.log(`🔄 Merged: ${report.actions.merged}`);
        console.log(`🆕 Created: ${report.actions.created}`);
        
        return report;
    }
    
    async run() {
        console.log('🚀 Starting intelligent driver unbranding and reorganization...');
        
        await this.analyzeCurrentDrivers();
        const plan = await this.createUnbrandedCategories();
        const results = await this.executeReorganization(plan);
        const report = await this.generateReport(results);
        
        console.log('✅ Driver reorganization complete!');
        return report;
    }
}

if (require.main === module) {
    const reorganizer = new IntelligentDriverUnbranderReorganizer();
    reorganizer.run().catch(console.error);
}

module.exports = IntelligentDriverUnbranderReorganizer;
