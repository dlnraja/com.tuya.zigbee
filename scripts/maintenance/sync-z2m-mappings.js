/**
 * Z2M Mapping Synchronizer - v1.0.0
 * 
 * Automatically synchronizes Tuya DataPoint (DP) mappings from Zigbee2MQTT
 * to the app's internal driver-mapping-database.json.
 * 
 * Features:
 * - Fetches latest tuya.ts from Koenkk/zigbee-herdsman-converters
 * - Extracts zigbeeModel and tuyaDatapoints using regex
 * - Maps Z2M exposes to Homey capabilities
 * - Updates driver-mapping-database.json with versioning
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const Z2M_TUYA_URL = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';
const DB_PATH = path.join(__dirname, '../../driver-mapping-database.json');
const CREDITS_PATH = path.join(__dirname, '../../lib/data/SourceCredits.js');

// Mapping dictionary: Z2M name -> Homey capability
const CAPABILITY_MAP = {
    'occupancy': 'alarm_motion',
    'presence': 'alarm_motion',
    'contact': 'alarm_contact',
    'battery': 'measure_battery',
    'battery_low': 'alarm_battery',
    'temperature': 'measure_temperature',
    'humidity': 'measure_humidity',
    'illuminance': 'measure_luminance',
    'brightness': 'dim',
    'water_leak': 'alarm_water',
    'smoke': 'alarm_smoke',
    'gas': 'alarm_gas',
    'voltage': 'measure_voltage',
    'current': 'measure_current',
    'power': 'measure_power',
    'energy': 'meter_power',
    'state': 'onoff',
    'switch': 'onoff',
    'child_lock': 'child_lock',
    'mode': 'thermostat_mode',
    'target_temp': 'target_temperature',
    'current_temp': 'measure_temperature',
    'window_state': 'windowcoverings_state',
    'percent_control': 'windowcoverings_set',
    'percent_state': 'windowcoverings_set',
    'position': 'windowcoverings_set',
    'countdown': 'timer'
};

// Parser dictionary: Z2M converter -> DriverMappingLoader parser
const PARSER_MAP = {
    'tuya.valueConverter.divideBy10': 'divide_10',
    'tuya.valueConverter.divideBy100': 'divide_100',
    'tuya.valueConverter.trueFalse0': 'boolean',
    'tuya.valueConverter.trueFalseInverted': 'invert',
    'tuya.valueConverter.raw': null,
    'tuya.valueConverter.battery': 'battery_percentage',
};

async function fetchFile(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) return reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseTuyaTs(content) {
    console.log('🔍 Parsing tuya.ts content...');
    const database = {};
    
    // Split into individual device blocks
    // Device blocks usually look like { zigbeeModel: [...], ... }
    const blocks = content.split(/(\{\s*zigbeeModel:\s*\[)/);
    
    let processed = 0;
    for (let i = 1; i < blocks.length; i += 2) {
        const fullBlock = blocks[i] + blocks[i + 1];
        
        // Extract models
        const modelMatch = fullBlock.match(/zigbeeModel:\s*\[([^\]]+)\]/);
        if (!modelMatch) continue;
        
        const models = modelMatch[1].split(',').map(m => m.trim().replace(/['"]/g, '')).filter(Boolean);
        
        // Extract manufacturer names (whiteLabel)
        const whiteLabels = [];
        const whiteLabelRe = /model:\s*['"]([^'"]+)['"]/g; // Simplified for this context
        let m;
        
        // Extract tuyaDatapoints
        const dpMatch = fullBlock.match(/tuyaDatapoints:\s*\[([\s\S]+?)\],\s*\}/);
        if (dpMatch) {
            const dpContent = dpMatch[1];
            // Match [1, "name", converter]
            const dpRe = /\[\s*(\d+),\s*['"]([^'"]+)['"](?:\s*,\s*([\s\S]+?))?\s*\]/g;
            const dps = {};
            
            while ((m = dpRe.exec(dpContent)) !== null) {
                const dpId = m[1];
                const z2mName = m[2];
                const converter = m[3] ? m[3].trim().split(',')[0].trim() : null;
                
                const capability = CAPABILITY_MAP[z2mName] || z2mName;
                const parser = PARSER_MAP[converter] || null;
                
                dps[dpId] = {
                    capability,
                    parser,
                    z2m_name: z2mName
                };
            }
            
            if (Object.keys(dps).length > 0) {
                models.forEach(model => {
                    if (!database[model]) {
                        database[model] = {
                            dps,
                            description: fullBlock.match(/description:\s*['"]([^'"]+)['"]/)?.[1] || 'Unknown device'
                        };
                        processed++;
                    }
                });
            }
        }
    }
    
    console.log(`✅ Extracted mappings for ${processed} unique models.`);
    return database;
}

function updateDatabase(newMappings) {
    let currentDb = { version: "1.0.0", lastUpdated: "", devices: {} };
    if (fs.existsSync(DB_PATH)) {
        currentDb = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
    
    const stats = { added: 0, updated: 0 };
    
    for (const [model, data] of Object.entries(newMappings)) {
        if (!currentDb.devices[model]) {
            currentDb.devices[model] = { manufacturers: {}, type: "tuya_dp", description: data.description };
            stats.added++;
        }
        
        // In the current architecture, we map DPs to the model if it's a generic TS0601
        // or to specific manufacturers if needed.
        // For automation, we'll store a "generic_tuya_dps" field or similar if it's model-wide
        if (!currentDb.devices[model].dps) {
            currentDb.devices[model].dps = data.dps;
        } else {
            // Merge DPs
            Object.assign(currentDb.devices[model].dps, data.dps);
            stats.updated++;
        }
    }
    
    currentDb.version = "1.1." + Math.floor(Date.now() / 86400000); // Daily versioning
    currentDb.lastUpdated = new Date().toISOString();
    
    fs.writeFileSync(DB_PATH, JSON.stringify(currentDb, null, 2));
    console.log(`🚀 Database updated: ${stats.added} new models, ${stats.updated} models updated.`);
}

function updateCredits() {
    if (!fs.existsSync(CREDITS_PATH)) return;
    let content = fs.readFileSync(CREDITS_PATH, 'utf8');
    const now = new Date().toISOString().split('T')[0];
    
    content = content.replace(/lastChecked:\s*null/g, `lastChecked: '${now}'`);
    content = content.replace(/lastChecked:\s*'[^']*'/g, `lastChecked: '${now}'`);
    
    fs.writeFileSync(CREDITS_PATH, content);
    console.log('📝 Updated SourceCredits.js lastChecked date.');
}

async function main() {
    console.log('🌐 Fetching latest Tuya mappings from Zigbee2MQTT...');
    try {
        const content = await fetchFile(Z2M_TUYA_URL);
        const mappings = parseTuyaTs(content);
        updateDatabase(mappings);
        updateCredits();
        console.log('✨ Synchronization complete!');
    } catch (err) {
        console.error('❌ Sync failed:', err.message);
        process.exit(1);
    }
}

main();
