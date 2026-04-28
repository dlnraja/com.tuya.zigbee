/**
 * Tuya Zigbee Driver Auto-Generator & Enricher (via Z2M)
 * 
 * Usage: node .github/scripts/generate-driver.js "_TZE200_pay2byax" "sensor"
 */
const fs = require('fs');
const path = require('path');

const z2mUrl = 'https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/devices/tuya.ts';


async function fetchZ2MDefinitions() {
    console.log('Fetching Z2M Tuya Definitions...');
    try {
        const response = await fetch(z2mUrl);
        const code = await response.text();
        return code;
    } catch (e) {
        console.error('Failed to fetch:', e);
        return null;
    }
}

async function findOrEnrichDriver(manufacturerName, typeHint) {
    // Basic logic to enrich existing driver
    const driversDir = path.join(__dirname, '../../drivers/');
    if (!fs.existsSync(driversDir)) return console.error('Drivers folder not found.');

    const drivers = fs.readdirSync(driversDir);
    let foundDriver = null;

    for (const d of drivers) {
        const composePath = path.join(driversDir, d, 'driver.compose.json');
        if (fs.existsSync(composePath)) {
            try {
                const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                const mfrs = compose.zigbee?.manufacturerName || [];
                if (mfrs.includes(manufacturerName)) {
                    console.log(` ${manufacturerName} already exists in driver: ${d}`);
                    return;
                }
                
                // Extremely basic fuzzy matching just to cluster
                if (typeHint && d.includes(typeHint)) {
                    foundDriver = composePath;
                }
            } catch (e) {}
        }
    }

    if (foundDriver) {
        console.log(`Enriching existing driver: ${foundDriver}`);
        const compose = JSON.parse(fs.readFileSync(foundDriver, 'utf8'));
        if (!compose.zigbee) compose.zigbee = {};
        if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];
        if (!Array.isArray(compose.zigbee.manufacturerName)) compose.zigbee.manufacturerName = [compose.zigbee.manufacturerName].filter(Boolean);
        
        if (!compose.zigbee.manufacturerName.includes(manufacturerName)) {
            compose.zigbee.manufacturerName.push(manufacturerName);
            fs.writeFileSync(foundDriver, JSON.stringify(compose, null, 2));
            console.log(` Appended ${manufacturerName} to ${foundDriver}`);
        }
    } else {
        console.log(` No suitable driver found to enrich for hint ${typeHint}. Creation mode needed.`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    if (!args[0]) {
        console.log('Provide a manufacturer name (e.g. _TZE200_xxxx)');
        process.exit(1);
    }
    
    await findOrEnrichDriver(args[0], args[1] || 'sensor');
}

main();
