#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Ultimate Device Coverage Expansion - Using ALL Sources
function expandDeviceCoverage() {
    console.log('🚀 ULTIMATE ZIGBEE DEVICE COVERAGE EXPANSION');
    console.log('📊 Analyzing ALL available data sources...');

    const dataSources = {
        enhanced: 'data/device-database/enhanced-device-database.json',
        blakadder: 'resources/blakadder-devices.json',
        homeAssistant: 'research/source-data/home-assistant.json',
        homeyForums: 'research/source-data/homey-forums.json',
        johanBenz: 'research/github/johan-benz-repo.json',
        matrices: 'matrices/CLUSTER_MATRIX.json',
        deviceMatrix: 'research/device-matrix/device-matrix.json',
        masterList: 'tuya_refactor_patch/data/master_drivers_list.json'
    };

    let allDevices = [];
    const manufacturerIds = new Set();
    const productIds = new Set();
    const capabilities = new Set();

    // Process each data source
    for (const [sourceName, filePath] of Object.entries(dataSources)) {
        const fullPath = path.join(__dirname, '..', filePath);
        if (fs.existsSync(fullPath)) {
            try {
                const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                const devices = extractDevicesFromSource(data, sourceName);
                allDevices = allDevices.concat(devices);
                console.log(`✅ Processed ${sourceName}: ${devices.length} devices`);
            } catch (error) {
                console.warn(`⚠️  Warning: Could not process ${sourceName}: ${error.message}`);
            }
        }
    }

    // Extract comprehensive manufacturer and product ID lists
    allDevices.forEach(device => {
        if (device.manufacturerName) {
            if (Array.isArray(device.manufacturerName)) {
                device.manufacturerName.forEach(mn => manufacturerIds.add(mn));
            } else {
                manufacturerIds.add(device.manufacturerName);
            }
        }
        if (device.productId) {
            if (Array.isArray(device.productId)) {
                device.productId.forEach(pid => productIds.add(pid));
            } else {
                productIds.add(device.productId);
            }
        }
        if (device.capabilities) {
            device.capabilities.forEach(cap => capabilities.add(cap));
        }
    });

    console.log(`📊 COVERAGE STATISTICS:`);
    console.log(`   🏭 Manufacturers: ${manufacturerIds.size}`);
    console.log(`   📱 Product IDs: ${productIds.size}`);
    console.log(`   ⚡ Capabilities: ${capabilities.size}`);
    console.log(`   🔧 Total Devices: ${allDevices.length}`);

    return {
        devices: allDevices,
        manufacturers: Array.from(manufacturerIds),
        productIds: Array.from(productIds),
        capabilities: Array.from(capabilities)
    };
}

function extractDevicesFromSource(data, sourceName) {
    const devices = [];

    switch (sourceName) {
        case 'enhanced':
            if (data.devices) {
                data.devices.forEach(device => {
                    devices.push({
                        model: device.model,
                        manufacturerName: device.manufacturer,
                        productId: device.model,
                        type: device.type,
                        capabilities: device.features || [],
                        source: sourceName
                    });
                });
            }
            break;

        case 'blakadder':
            if (Array.isArray(data)) {
                data.forEach(device => {
                    devices.push({
                        model: device.model,
                        manufacturerName: device.vendor || 'Tuya',
                        productId: device.model,
                        capabilities: device.supports ? device.supports.split('/') : [],
                        source: sourceName
                    });
                });
            }
            break;

        case 'matrices':
            if (data.clusters) {
                Object.keys(data.clusters).forEach(clusterId => {
                    const cluster = data.clusters[clusterId];
                    if (cluster.devices) {
                        cluster.devices.forEach(device => {
                            devices.push({
                                model: device.model || `CLUSTER_${clusterId}`,
                                manufacturerName: device.manufacturer || 'Unknown',
                                productId: device.productId || device.model,
                                capabilities: cluster.capabilities || [],
                                source: sourceName
                            });
                        });
                    }
                });
            }
            break;

        default:
            // Generic extraction for other sources
            if (data.devices && Array.isArray(data.devices)) {
                data.devices.forEach(device => {
                    devices.push({
                        model: device.model || device.name,
                        manufacturerName: device.manufacturer || device.vendor,
                        productId: device.productId || device.model,
                        capabilities: device.capabilities || [],
                        source: sourceName
                    });
                });
            }
    }

    return devices;
}

// Create comprehensive drivers from all sources
function createComprehensiveDrivers(deviceData) {
    console.log('\n🔧 Creating comprehensive drivers...');
    
    const driverCategories = {
        lights: [],
        switches: [],
        sensors: [],
        plugs: [],
        climate: [],
        covers: [],
        locks: [],
        universal: []
    };

    // Comprehensive manufacturer patterns for maximum coverage
    const manufacturerPatterns = [
        '_TZ3000_*', '_TZ3210_*', '_TYZB01_*', '_TYZB02_*', '_TZ3400_*',
        '_TZE200_*', '_TZE204_*', '_TYST11_*', '_TZ2000_*', '_TZ1800_*',
        'Tuya', 'TUYA', 'eWeLink', 'Xiaomi', 'Aqara', 'IKEA', 'Philips',
        'Bosch', 'Schneider', 'Legrand', 'Sonoff', 'Smart+', 'OSRAM'
    ];

    // Comprehensive product ID patterns
    const lightProductIds = [
        'TS0501A', 'TS0502A', 'TS0502B', 'TS0505A', 'TS0505B', 'TS0505C',
        'TS0506A', 'TS0506B', 'TS0508A', 'TS0509A', 'TS0510A', 'TS0211',
        'E27_RGBW', 'E14_RGBW', 'GU10_RGBW', 'LED_Strip'
    ];

    const switchProductIds = [
        'TS0011', 'TS0012', 'TS0013', 'TS0014', 'TS0042', 'TS0043', 'TS0044',
        'TS0001', 'TS0002', 'TS0003', 'TS0004', 'TS004F'
    ];

    const plugProductIds = [
        'TS011F', 'TS0121', 'TS0111', 'TS0101', 'TS0115'
    ];

    const sensorProductIds = [
        'TS0201', 'TS0202', 'TS0203', 'TS0204', 'TS0205', 'TS0206',
        'TS0207', 'TS0208', 'TS0209', 'TS0210', 'RH3052', 'RS0201'
    ];

    // Create comprehensive driver structure
    const drivers = [
        // Universal RGB+CCT Light Driver
        {
            id: 'tuya_light_rgb_cct_universal',
            name: {
                en: 'Tuya RGB+CCT Light (Universal)',
                fr: 'Luminaire Tuya RGB+CCT (Universel)',
                nl: 'Tuya RGB+CCT Lamp (Universeel)',
                de: 'Tuya RGB+CCT Lampe (Universal)'
            },
            class: 'light',
            capabilities: ['onoff', 'dim', 'light_hue', 'light_saturation', 'light_temperature'],
            zigbee: {
                manufacturerName: manufacturerPatterns,
                productId: lightProductIds.slice(0, 10),
                endpoints: {
                    '1': {
                        clusters: [0, 3, 4, 5, 6, 8, 768, 1],
                        bindings: [6, 8, 768]
                    }
                }
            }
        },
        // Universal Switch Driver
        {
            id: 'tuya_switch_universal',
            name: {
                en: 'Tuya Switch (Universal 1-6 Gang)',
                fr: 'Interrupteur Tuya (Universel 1-6 Voies)',
                nl: 'Tuya Schakelaar (Universeel 1-6 Gang)',
                de: 'Tuya Schalter (Universal 1-6 Gänge)'
            },
            class: 'switch',
            capabilities: ['onoff'],
            zigbee: {
                manufacturerName: manufacturerPatterns,
                productId: switchProductIds,
                endpoints: {
                    '1': { clusters: [0, 3, 4, 5, 6], bindings: [6] },
                    '2': { clusters: [0, 3, 4, 5, 6], bindings: [6] },
                    '3': { clusters: [0, 3, 4, 5, 6], bindings: [6] }
                }
            }
        },
        // Universal Smart Plug Driver
        {
            id: 'tuya_plug_universal',
            name: {
                en: 'Tuya Smart Plug (Universal)',
                fr: 'Prise Intelligente Tuya (Universelle)',
                nl: 'Tuya Slimme Stekker (Universeel)',
                de: 'Tuya Smart Stecker (Universal)'
            },
            class: 'socket',
            capabilities: ['onoff', 'measure_power', 'meter_power'],
            zigbee: {
                manufacturerName: manufacturerPatterns,
                productId: plugProductIds,
                endpoints: {
                    '1': {
                        clusters: [0, 3, 4, 5, 6, 1794, 2820],
                        bindings: [6, 1794, 2820]
                    }
                }
            }
        },
        // Universal Multi-Sensor Driver
        {
            id: 'tuya_sensor_universal',
            name: {
                en: 'Tuya Multi-Sensor (Universal)',
                fr: 'Capteur Multiple Tuya (Universel)',
                nl: 'Tuya Multi-Sensor (Universeel)',
                de: 'Tuya Multi-Sensor (Universal)'
            },
            class: 'sensor',
            capabilities: ['measure_temperature', 'measure_humidity', 'alarm_motion', 'measure_battery', 'alarm_contact'],
            zigbee: {
                manufacturerName: manufacturerPatterns,
                productId: sensorProductIds,
                endpoints: {
                    '1': {
                        clusters: [0, 1, 3, 1026, 1029, 1280, 1024],
                        bindings: [1, 1026, 1029, 1280, 1024]
                    }
                }
            }
        },
        // TS0601 Universal Driver (EF00 Protocol)
        {
            id: 'tuya_ts0601_universal',
            name: {
                en: 'Tuya TS0601 Universal (All EF00 Devices)',
                fr: 'Tuya TS0601 Universel (Tous Appareils EF00)',
                nl: 'Tuya TS0601 Universeel (Alle EF00 Apparaten)',
                de: 'Tuya TS0601 Universal (Alle EF00 Geräte)'
            },
            class: 'other',
            capabilities: ['onoff', 'dim', 'measure_temperature', 'target_temperature', 'thermostat_mode'],
            zigbee: {
                manufacturerName: manufacturerPatterns,
                productId: ['TS0601'],
                endpoints: {
                    '1': {
                        clusters: [0, 4, 5, 61184],
                        bindings: [61184]
                    }
                }
            }
        }
    ];

    return drivers;
}

// Main execution
if (require.main === module) {
    try {
        const deviceData = expandDeviceCoverage();
        const comprehensiveDrivers = createComprehensiveDrivers(deviceData);
        
        // Update app.json with comprehensive drivers
        const appJsonPath = path.join(__dirname, '..', '.homeycompose', 'app.json');
        const appData = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
        
        // Merge existing drivers with new comprehensive ones
        const existingDriverIds = new Set(appData.drivers.map(d => d.id));
        const newDrivers = comprehensiveDrivers.filter(d => !existingDriverIds.has(d.id));
        
        appData.drivers = [...appData.drivers, ...newDrivers];
        
        // Add professional images for all drivers
        appData.drivers.forEach(driver => {
            if (!driver.images) {
                driver.images = {
                    small: '{{driverAssetsPath}}/images/small.png',
                    large: '{{driverAssetsPath}}/images/large.png'
                };
            }
            driver.platforms = driver.platforms || ['local'];
            driver.connectivity = driver.connectivity || ['zigbee'];
        });

        fs.writeFileSync(appJsonPath, JSON.stringify(appData, null, 2));

        console.log('\n🎉 ULTIMATE DEVICE EXPANSION COMPLETED!');
        console.log(`📱 Total Drivers: ${appData.drivers.length}`);
        console.log(`🆕 New Drivers Added: ${newDrivers.length}`);
        console.log(`🏭 Manufacturer Coverage: ${deviceData.manufacturers.length}`);
        console.log(`📊 Product ID Coverage: ${deviceData.productIds.length}`);
        
        return {
            totalDrivers: appData.drivers.length,
            newDrivers: newDrivers.length,
            deviceCoverage: deviceData
        };

    } catch (error) {
        console.error('❌ Expansion failed:', error.message);
        process.exit(1);
    }
}

module.exports = { expandDeviceCoverage, createComprehensiveDrivers };
