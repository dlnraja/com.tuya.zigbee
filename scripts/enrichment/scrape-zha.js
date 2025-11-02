#!/usr/bin/env node

/**
 * SCRAPE ZHA DATABASE
 * Automatically fetch new devices from Home Assistant ZHA integration
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const ZHA_QUIRKS_URL = 'https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/';
const OUTPUT_FILE = path.join(__dirname, '..', '..', 'data', 'enrichment', 'zha-devices.json');

console.log('\n🔍 SCRAPING ZHA DATABASE\n');
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

async function scrapeZhaQuirks() {
    console.log('\n📥 Fetching ZHA quirks...\n');
    
    try {
        // List of ZHA Tuya quirk files to check
        const quirkFiles = [
            'air_quality.py',
            'smoke.py',
            'siren.py',
            'motion.py',
            'light.py',
            'switch.py',
            'ts0601_sensor.py',
            'ts0601_dimmer.py',
            'ts0601_valve.py',
            'ts0601_trv.py',
            'mcu.py'
        ];
        
        for (const file of quirkFiles) {
            try {
                const url = ZHA_QUIRKS_URL + file;
                const content = await fetchUrl(url);
                
                // Extract manufacturer signatures
                const signaturePattern = /signature\s*=\s*{\s*[^}]*MODELS_INFO:\s*\[\s*\(\s*['"]([^'"]+)['"],\s*['"]([^'"]+)['"]/g;
                const manufacturerPattern = /['"](_TZ[^'"]+)['"]/g;
                
                let match;
                const fileDevices = [];
                
                // Extract from signatures
                while ((match = signaturePattern.exec(content)) !== null) {
                    const manufacturerId = match[1];
                    const modelId = match[2];
                    
                    if (manufacturerId.startsWith('_TZ')) {
                        fileDevices.push({
                            manufacturerId,
                            modelId,
                            source: file,
                            type: file.replace('.py', '')
                        });
                    }
                }
                
                // Also extract standalone manufacturer IDs
                while ((match = manufacturerPattern.exec(content)) !== null) {
                    const manufacturerId = match[1];
                    if (!fileDevices.find(d => d.manufacturerId === manufacturerId)) {
                        fileDevices.push({
                            manufacturerId,
                            modelId: null,
                            source: file,
                            type: file.replace('.py', '')
                        });
                    }
                }
                
                if (fileDevices.length > 0) {
                    console.log(`   ✅ ${file}: ${fileDevices.length} devices`);
                    
                    // Check which are new
                    const existingIds = await getExistingManufacturerIds();
                    
                    for (const device of fileDevices) {
                        if (!existingIds.has(device.manufacturerId)) {
                            newDevices.push(device);
                            console.log(`      🆕 ${device.manufacturerId}`);
                        }
                        processed++;
                    }
                }
                
            } catch (error) {
                console.log(`   ⚠️  ${file}: ${error.message}`);
            }
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
        source: 'zha',
        totalProcessed: processed,
        newDevices: newDevices.length,
        devices: newDevices
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
    console.log(`\n📄 Results saved: ${OUTPUT_FILE}`);
}

// Main execution
(async () => {
    await scrapeZhaQuirks();
    await saveResults();
    
    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 SUMMARY\n');
    console.log(`Processed:    ${processed}`);
    console.log(`New devices:  ${newDevices.length}`);
    console.log('\n✅ SCRAPING COMPLETE!\n');
    
    process.exit(0);
})();
