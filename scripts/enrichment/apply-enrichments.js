#!/usr/bin/env node

/**
 * APPLY ENRICHMENTS
 * Apply discovered devices from all sources to drivers
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'enrichment');
const DRIVERS_DIR = path.join(__dirname, '..', '..', 'drivers');
const REPORT_FILE = path.join(__dirname, '..', '..', 'reports', 'enrichment-applied.json');

console.log('\n🔄 APPLYING ENRICHMENTS\n');
console.log('═'.repeat(70));

const stats = {
    zigbee2mqtt: { total: 0, added: 0 },
    zha: { total: 0, added: 0 },
    community: { total: 0, added: 0 },
    driversUpdated: [],
    errors: []
};

function loadEnrichmentData(source) {
    const file = path.join(DATA_DIR, `${source}-devices.json`);
    if (fs.existsSync(file)) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (error) {
            console.error(`❌ Error loading ${source}: ${error.message}`);
        }
    }
    return null;
}

function findBestDriver(device) {
    // Match device to best driver based on type
    const typeMap = {
        'switch': ['switch_wall', 'switch_smart', 'switch_generic'],
        'light': ['light_', 'bulb_'],
        'dimmer': ['dimmer_', 'light_'],
        'sensor': ['sensor_', 'motion_', 'temperature_', 'humidity_'],
        'valve': ['valve_', 'water_valve'],
        'trv': ['thermostat_', 'valve_'],
        'smoke': ['smoke_detector'],
        'siren': ['siren'],
        'motion': ['motion_sensor'],
        'air_quality': ['air_quality']
    };
    
    const deviceType = device.type || 'generic';
    const patterns = typeMap[deviceType] || ['generic'];
    
    // Get all drivers
    const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => {
        const stat = fs.statSync(path.join(DRIVERS_DIR, d));
        return stat.isDirectory();
    });
    
    // Find best match
    for (const pattern of patterns) {
        const match = drivers.find(d => d.includes(pattern));
        if (match) return match;
    }
    
    // Default fallback
    const modelId = device.modelId || device.models?.[0] || '';
    if (modelId.includes('TS0001')) return 'switch_1gang';
    if (modelId.includes('TS0002')) return 'switch_2gang';
    if (modelId.includes('TS0003')) return 'switch_3gang';
    if (modelId.includes('TS0004')) return 'switch_4gang';
    if (modelId.includes('TS0011')) return 'switch_wall_1gang';
    if (modelId.includes('TS0012')) return 'switch_wall_2gang';
    
    return null;
}

function addManufacturerIdToDriver(driverName, manufacturerId) {
    const composePath = path.join(DRIVERS_DIR, driverName, 'driver.compose.json');
    
    if (!fs.existsSync(composePath)) {
        stats.errors.push(`Driver not found: ${driverName}`);
        return false;
    }
    
    try {
        const content = fs.readFileSync(composePath, 'utf8');
        const compose = JSON.parse(content);
        
        if (!compose.zigbee) compose.zigbee = {};
        if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
        
        // Check if already exists
        if (compose.zigbee.manufacturerName.includes(manufacturerId)) {
            return false; // Already exists
        }
        
        // Add manufacturer ID
        compose.zigbee.manufacturerName.push(manufacturerId);
        
        // Sort manufacturer IDs
        compose.zigbee.manufacturerName.sort();
        
        // Save
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2), 'utf8');
        
        return true;
        
    } catch (error) {
        stats.errors.push(`Error updating ${driverName}: ${error.message}`);
        return false;
    }
}

function applyFromSource(sourceName) {
    console.log(`\n📦 Processing ${sourceName}...\n`);
    
    const data = loadEnrichmentData(sourceName);
    if (!data || !data.devices || data.devices.length === 0) {
        console.log(`   ℹ️  No new devices from ${sourceName}`);
        return;
    }
    
    stats[sourceName].total = data.devices.length;
    
    for (const device of data.devices) {
        const manufacturerId = device.manufacturerId;
        
        // Find best driver
        const driver = findBestDriver(device);
        
        if (!driver) {
            console.log(`   ⚠️  ${manufacturerId}: No suitable driver found`);
            continue;
        }
        
        // Add to driver
        const added = addManufacturerIdToDriver(driver, manufacturerId);
        
        if (added) {
            console.log(`   ✅ ${driver}: Added ${manufacturerId}`);
            stats[sourceName].added++;
            
            if (!stats.driversUpdated.includes(driver)) {
                stats.driversUpdated.push(driver);
            }
        }
    }
}

function saveReport() {
    const reportDir = path.dirname(REPORT_FILE);
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = {
        date: new Date().toISOString(),
        stats,
        summary: {
            totalDevices: stats.zigbee2mqtt.total + stats.zha.total + stats.community.total,
            totalAdded: stats.zigbee2mqtt.added + stats.zha.added + stats.community.added,
            driversUpdated: stats.driversUpdated.length
        }
    };
    
    fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${REPORT_FILE}`);
}

// Main execution
console.log('\n🔍 Loading enrichment data...\n');

applyFromSource('zigbee2mqtt');
applyFromSource('zha');

console.log('\n' + '═'.repeat(70));
console.log('\n📊 ENRICHMENT SUMMARY\n');

console.log('Zigbee2MQTT:');
console.log(`  Total: ${stats.zigbee2mqtt.total}`);
console.log(`  Added: ${stats.zigbee2mqtt.added}`);

console.log('\nZHA:');
console.log(`  Total: ${stats.zha.total}`);
console.log(`  Added: ${stats.zha.added}`);

console.log(`\nDrivers updated: ${stats.driversUpdated.length}`);

if (stats.driversUpdated.length > 0) {
    console.log('\nUpdated drivers:');
    stats.driversUpdated.forEach(d => console.log(`  - ${d}`));
}

if (stats.errors.length > 0) {
    console.log(`\n⚠️  Errors: ${stats.errors.length}`);
    stats.errors.slice(0, 10).forEach(e => console.log(`  - ${e}`));
}

saveReport();

console.log('\n✅ ENRICHMENT COMPLETE!\n');

const exitCode = stats.errors.length > 0 ? 1 : 0;
process.exit(exitCode);
