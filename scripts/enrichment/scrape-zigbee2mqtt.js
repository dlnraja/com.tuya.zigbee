#!/usr/bin/env node

/**
 * SCRAPE ZIGBEE2MQTT DATABASE
 * Automatically fetch new devices from Zigbee2MQTT database
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ZIGBEE2MQTT_DEVICES_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee2mqtt.io/master/docs/devices/index.md';
const ZIGBEE2MQTT_API_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/';

const OUTPUT_FILE = path.join(__dirname, '..', '..', 'data', 'enrichment', 'zigbee2mqtt-devices.json');

console.log('\n🔍 SCRAPING ZIGBEE2MQTT DATABASE\n');
console.log('═'.repeat(70));

const newDevices = [];
let processed = 0;

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function scrapeTuyaDevices() {
    console.log('\n📥 Fetching Tuya devices from Zigbee2MQTT...\n');
    
    try {
        // Fetch Tuya converter file
        const tuyaUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
        const content = await fetchUrl(tuyaUrl);
        
        // Extract manufacturer IDs
        const manufacturerIdPattern = /manufacturerName:\s*\[([^\]]+)\]/g;
        const modelIdPattern = /model:\s*['"]([^'"]+)['"]/g;
        
        let match;
        const devices = new Map();
        
        // Extract all manufacturer IDs
        while ((match = manufacturerIdPattern.exec(content)) !== null) {
            const ids = match[1].match(/['"](_TZ[^'"]+)['"]/g);
            if (ids) {
                ids.forEach(id => {
                    const cleanId = id.replace(/['"]/g, '');
                    if (!devices.has(cleanId)) {
                        devices.set(cleanId, { manufacturerId: cleanId, models: [] });
                    }
                });
            }
        }
        
        // Extract model IDs
        while ((match = modelIdPattern.exec(content)) !== null) {
            const modelId = match[1];
            if (modelId.startsWith('TS')) {
                // Try to associate with manufacturer ID
                for (const [id, device] of devices.entries()) {
                    if (!device.models.includes(modelId)) {
                        device.models.push(modelId);
                    }
                }
            }
        }
        
        console.log(`✅ Found ${devices.size} Tuya manufacturer IDs\n`);
        
        // Check which are new
        const existingIds = await getExistingManufacturerIds();
        
        for (const [id, device] of devices.entries()) {
            if (!existingIds.has(id)) {
                newDevices.push(device);
                console.log(`   🆕 ${id}`);
            }
            processed++;
        }
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

async function getExistingManufacturerIds() {
    const ids = new Set();
    const driversPath = path.join(__dirname, '..', '..', 'drivers');
    
    if (!fs.existsSync(driversPath)) return ids;
    
    const drivers = fs.readdirSync(driversPath);
    
    for (const driver of drivers) {
        const composePath = path.join(driversPath, driver, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                if (compose.zigbee && compose.zigbee.manufacturerName) {
                    compose.zigbee.manufacturerName.forEach(id => ids.add(id));
                }
            } catch (error) {
                // Ignore
            }
        }
    }
    
    return ids;
}

async function saveResults() {
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const result = {
        date: new Date().toISOString(),
        source: 'zigbee2mqtt',
        totalProcessed: processed,
        newDevices: newDevices.length,
        devices: newDevices
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`\n📄 Results saved: ${OUTPUT_FILE}`);
}

// Main execution
(async () => {
    await scrapeTuyaDevices();
    await saveResults();
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 SUMMARY\n');
    console.log(`Processed:    ${processed}`);
    console.log(`New devices:  ${newDevices.length}`);
    console.log('\n✅ SCRAPING COMPLETE!\n');
    
    process.exit(0);
})();
