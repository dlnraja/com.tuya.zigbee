/**
 * Z2M Mapping Synchronizer - v1.1.0
 * 
 * Automatically synchronizes Tuya DataPoint (DP) mappings from Zigbee2MQTT
 * to the app's internal driver-mapping-database.json.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const SOURCES = {
    'Z2M_TUYA': 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts',
    'Z2M_SONOFF': 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/sonoff.ts',
    'Z2M_DANFOSS': 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/danfoss.ts',
    // ZHA support planned for v1.2.0
};

const DB_PATH = path.join(process.cwd(), 'driver-mapping-database.json');
const CREDITS_PATH = path.join(process.cwd(), 'lib/data/SourceCredits.js');

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
    console.log(' Parsing tuya.ts content...');
    const database = {};
    const blocks = content.split(/(\{\s*zigbeeModel:\s*\[)/);
    
    let processed = 0;
    for (let i = 1; i < blocks.length; i += 2) {
        const fullBlock = blocks[i] + blocks[i + 1];
        const modelMatch = fullBlock.match(/zigbeeModel:\s*\[([^\]]+)\]/);
        if (!modelMatch) continue;
        
        const models = modelMatch[1].split(',').map(m => m.trim().replace(/['"]/g, '')).filter(Boolean);
        
        const dpMatch = fullBlock.match(/tuyaDatapoints:\s*\[([\s\S]+?)\],\s*\}/);
        if (dpMatch) {
            const dpContent = dpMatch[1];
            const dpRe = /\[\s*(\d+),\s*['"]([^'"]+)['"](?:\s*,\s*([\s\S]+?))?\s*\]/g;
            const dps = {};
            let m;
            
            while ((m = dpRe.exec(dpContent)) !== null) {
                const dpId = m[1];
                const z2mName = m[2];
                const converter = m[3] ? m[3].trim().split(',')[0].trim() : null;
                
                const capability = CAPABILITY_MAP[z2mName] || z2mName;
                const parser = PARSER_MAP[converter] || null;
                
                dps[dpId] = { capability, parser, z2m_name: z2mName };
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
        if (!currentDb.devices[model].dps) {
            currentDb.devices[model].dps = data.dps;
        } else {
            Object.assign(currentDb.devices[model].dps, data.dps);
            stats.updated++;
        }
    }
    
    currentDb.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_PATH, JSON.stringify(currentDb, null, 2));
    console.log(` Database updated: ${stats.added} new models, ${stats.updated} models updated.`);
}

async function main() {
    console.log(' Unified Mapping Sync Starting...');
    try {
        const aggregatedMappings = {};
        
        for (const [name, url] of Object.entries(SOURCES)) {
            console.log(`   Fetching ${name}...`);
            try {
                const content = await fetchFile(url);
                const mappings = parseTuyaTs(content);
                Object.assign(aggregatedMappings, mappings);
            } catch (e) {
                console.error(`    Failed to sync ${name}: ${e.message}`);
            }
        }

        updateDatabase(aggregatedMappings);
        
        if (fs.existsSync(CREDITS_PATH)) {
            const now = new Date().toISOString().split('T')[0];
            let credits = fs.readFileSync(CREDITS_PATH, 'utf8');
            credits = credits.replace(/lastChecked:\s*null/g, `lastChecked: '${now}'`);
            fs.writeFileSync(CREDITS_PATH, credits);
        }
        console.log(' Sync complete!');
    } catch (err) {
        console.error(' Sync failed:', err.message);
        process.exit(1);
    }
}

main();
