const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '../..');
const fingerprintsPath = path.join(projectRoot, 'lib/tuya/fingerprints.json');
const driversDir = path.join(projectRoot, 'drivers');

console.log('\x1b[36m[AUTO-HEAL]\x1b[0m Starting mass fingerprint healer...');

try {
    const fingerprintsData = JSON.parse(fs.readFileSync(fingerprintsPath, 'utf8'));
    let addedCount = 0;
    let missingDriversCount = 0;
    const modifiedDrivers = new Set();

    for (const [fingerprint, config] of Object.entries(fingerprintsData)) {
        if (!config.driverId) continue;

        const driverPath = path.join(driversDir, config.driverId);
        const driverComposePath = path.join(driverPath, 'driver.compose.json');

        if (!fs.existsSync(driverComposePath)) {
            missingDriversCount++;
            continue;
        }

        let composeContent;
        try {
            composeContent = JSON.parse(fs.readFileSync(driverComposePath, 'utf8'));
        } catch (e) {
            console.error(`\x1b[31m[ERROR]\x1b[0m Failed to parse ${config.driverId}/driver.compose.json: ${e.message}`);
            continue;
        }

        if (!composeContent.zigbee) {
            composeContent.zigbee = {};
        }

        let mfrs = composeContent.zigbee.manufacturerName;
        
        // Normalize to array
        if (!mfrs) {
            mfrs = [];
        } else if (typeof mfrs === 'string') {
            mfrs = [mfrs];
        } else if (!Array.isArray(mfrs)) {
            console.warn(`\x1b[33m[WARNING]\x1b[0m Invalid manufacturerName format in ${config.driverId}, resetting to array.`);
            mfrs = [];
        }

        if (!mfrs.includes(fingerprint)) {
            mfrs.push(fingerprint);
            composeContent.zigbee.manufacturerName = mfrs;
            fs.writeFileSync(driverComposePath, JSON.stringify(composeContent, null, 2) + '\n', 'utf8');
            addedCount++;
            modifiedDrivers.add(config.driverId);
        }
    }

    console.log(`\x1b[32m[SUCCESS]\x1b[0m Injected ${addedCount} missing fingerprints across ${modifiedDrivers.size} drivers.`);
    if (missingDriversCount > 0) {
        console.log(`\x1b[33m[INFO]\x1b[0m Skipped ${missingDriversCount} fingerprints due to missing drivers.`);
    }

} catch (err) {
    console.error(`\x1b[31m[FATAL]\x1b[0m Script crashed: ${err.message}`);
    process.exit(1);
}
