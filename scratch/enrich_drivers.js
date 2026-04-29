'use strict';

const fs = require('fs');
const path = require('path');

// Paths
const z2mPath = path.join(__dirname, '../lib/data/z2m_devices_full.json');
const driverComposePath = path.join(__dirname, '../drivers/universal_zigbee/driver.compose.json');
const mappingDbPath = path.join(__dirname, '../driver-mapping-database.json');

function enrich() {
    console.log(' Starting Enrichment Process...');

    // 1. Load Z2M Data
    if (!fs.existsSync(z2mPath)) {
        console.error(' Z2M data not found at:', z2mPath);
        return;
    }
    const z2mData = JSON.parse(fs.readFileSync(z2mPath, 'utf8'));
    console.log(` Loaded ${z2mData.length} Z2M devices`);

    // 2. Load Current Universal Driver Manifest
    const driverCompose = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
    
    // 3. Extract Unique Models and Manufacturers
    const manufacturers = new Set(driverCompose.zigbee.manufacturerName || []);
    const productIds = new Set(driverCompose.zigbee.productId || []);

    z2mData.forEach(dev => {
        if (dev.vendor === 'Tuya' || dev.vendor === 'Hooly' || dev.vendor === 'Lonsonho') {
            if (dev.zigbeeModels) {
                dev.zigbeeModels.forEach(m => {
                    if (m.startsWith('_TZE') || m.startsWith('_TZ3000')) {
                        manufacturers.add(m);
                    } else if (m.length > 3) {
                        productIds.add(m);
                    }
                });
            }
            if (dev.model && dev.model.length > 3) {
                productIds.add(dev.model);
            }
        }
    });

    driverCompose.zigbee.manufacturerName = Array.from(manufacturers).sort();
    driverCompose.zigbee.productId = Array.from(productIds).sort();

    console.log(` Enrichment Stats:`);
    console.log(`   - Manufacturers: ${driverCompose.zigbee.manufacturerName.length}`);
    console.log(`   - Product IDs: ${driverCompose.zigbee.productId.length}`);

    // Update manifest
    fs.writeFileSync(driverComposePath, JSON.stringify(driverCompose, null, 2));
    console.log(' Updated universal_zigbee/driver.compose.json');

    // 4. Generate/Enrich Mapping Database
    const mappingDb = {
        version: "1.0.0-enriched",
        lastUpdate: new Date().toISOString(),
        devices: {}
    };

    z2mData.forEach(dev => {
        const model = dev.model;
        if (!mappingDb.devices[model]) {
            mappingDb.devices[model] = {
                vendor: dev.vendor,
                description: dev.description,
                type: inferCategory(dev.description),
                manufacturers: {}
            };
        }
        
        if (dev.zigbeeModels) {
            dev.zigbeeModels.forEach(mfr => {
                mappingDb.devices[model].manufacturers[mfr] = {
                    name: dev.description,
                    driver: mapToHomeyDriver(mappingDb.devices[model].type, model, mfr)
                };
            });
        }
    });

    fs.writeFileSync(mappingDbPath, JSON.stringify(mappingDb, null, 2));
    console.log(' Generated driver-mapping-database.json');
}

function inferCategory(description) {
    const desc = (description || '').toLowerCase();
    if (desc.includes('presence') || desc.includes('radar')) return 'presence';
    if (desc.includes('motion') || desc.includes('pir')) return 'motion';
    if (desc.includes('switch') || desc.includes('gang')) return 'switch';
    if (desc.includes('plug') || desc.includes('outlet') || desc.includes('socket')) return 'plug';
    if (desc.includes('bulb') || desc.includes('light') || desc.includes('led')) return 'light';
    if (desc.includes('curtain') || desc.includes('blind') || desc.includes('cover')) return 'curtain';
    if (desc.includes('temp') || desc.includes('humid')) return 'climate';
    if (desc.includes('smoke')) return 'smoke';
    if (desc.includes('water') || desc.includes('leak')) return 'water';
    if (desc.includes('gas')) return 'gas';
    if (desc.includes('thermostat') || desc.includes('trv')) return 'thermostat';
    return 'other';
}

function mapToHomeyDriver(category, model, mfr) {
    // Map categories to existing app drivers
    const map = {
        'presence': 'presence_sensor_radar',
        'motion': 'motion_sensor',
        'switch': 'switch_1gang', // Fallback to 1gang, adaptation will fix it
        'plug': 'plug_smart',
        'light': 'bulb_rgb',
        'curtain': 'curtain_motor',
        'climate': 'climate_sensor',
        'smoke': 'smoke_detector_advanced',
        'water': 'water_leak_sensor',
        'gas': 'gas_sensor',
        'thermostat': 'thermostat_tuya_dp'
    };
    return map[category] || 'universal_zigbee';
}

enrich();
