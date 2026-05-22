const fs = require('fs');
const path = require('path');

/**
 * inject_fingerprint.js
 * CLI tool to safely inject a new Tuya fingerprint into `fingerprints.json`
 * and update the corresponding `driver.compose.json` automatically.
 *
 * Usage: node scripts/tools/inject_fingerprint.js <manufacturer_name> <driver_id> <type> <powerSource> [modelIds...]
 * Example: node scripts/tools/inject_fingerprint.js _TZ3000_famkxci2 button_wireless_3 button battery TS0043
 */

const args = process.argv.slice(2);
if (args.length < 4) {
    console.error("Usage: node inject_fingerprint.js <manufacturerName> <driverId> <type> <powerSource> [modelIds...]");
    process.exit(1);
}

const manufacturerName = args[0];
const driverId = args[1];
const type = args[2];
const powerSource = args[3];
const modelIds = args.slice(4);

const projectRoot = path.join(__dirname, '../..');
const fingerprintsPath = path.join(projectRoot, 'lib/tuya/fingerprints.json');
const driverComposePath = path.join(projectRoot, 'drivers', driverId, 'driver.compose.json');

console.log(`\x1b[36m[TOOL]\x1b[0m Injecting ${manufacturerName} into ${driverId}...`);

try {
    // 1. Update fingerprints.json
    const fpData = JSON.parse(fs.readFileSync(fingerprintsPath, 'utf8'));
    
    if (fpData[manufacturerName]) {
        console.warn(`\x1b[33m[WARNING]\x1b[0m Fingerprint ${manufacturerName} already exists. Overwriting...`);
    }

    fpData[manufacturerName] = {
        driverId: driverId,
        type: type,
        powerSource: powerSource,
        modelIds: modelIds.length > 0 ? modelIds : []
    };

    fs.writeFileSync(fingerprintsPath, JSON.stringify(fpData, null, 2) + '\n', 'utf8');
    console.log(`\x1b[32m[OK]\x1b[0m Added to fingerprints.json`);

    // 2. Update driver.compose.json
    if (fs.existsSync(driverComposePath)) {
        const composeData = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
        
        // Ensure it's a zigbee driver
        if (composeData.zigbee && composeData.zigbee.manufacturerName) {
            let mfrs = composeData.zigbee.manufacturerName;
            if (typeof mfrs === 'string') {
                mfrs = [mfrs];
            }
            
            if (!mfrs.includes(manufacturerName)) {
                mfrs.push(manufacturerName);
                composeData.zigbee.manufacturerName = mfrs;
                fs.writeFileSync(driverComposePath, JSON.stringify(composeData, null, 2) + '\n', 'utf8');
                console.log(`\x1b[32m[OK]\x1b[0m Added to ${driverId}/driver.compose.json`);
            } else {
                console.log(`\x1b[34m[INFO]\x1b[0m Already exists in ${driverId}/driver.compose.json`);
            }
        } else {
            console.warn(`\x1b[33m[WARNING]\x1b[0m ${driverId} does not seem to have a zigbee.manufacturerName array.`);
        }
    } else {
        console.error(`\x1b[31m[ERROR]\x1b[0m driver.compose.json not found for ${driverId}`);
    }

    console.log('\x1b[32m[SUCCESS]\x1b[0m Fingerprint injection complete. Run `npx homey app build` to apply.');

} catch (err) {
    console.error(`\x1b[31m[FATAL]\x1b[0m ${err.message}`);
    process.exit(1);
}
