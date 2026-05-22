const fs = require('fs');
const path = require('path');

/**
 * verify_fingerprints_integrity.js
 * Automatically verifies that:
 * 1. Every fingerprint listed in `fingerprints.json` maps to a valid existing driver
 * 2. Every fingerprint in `fingerprints.json` is correctly embedded in its target `driver.compose.json`
 */

const projectRoot = path.join(__dirname, '../..');
const fingerprintsPath = path.join(projectRoot, 'lib/tuya/fingerprints.json');
const driversDir = path.join(projectRoot, 'drivers');

let errors = 0;
let warnings = 0;

console.log('\x1b[36m[VALIDATION] Verifying fingerprints integrity...\x1b[0m');

try {
    const fingerprintsData = JSON.parse(fs.readFileSync(fingerprintsPath, 'utf8'));
    
    // Check each fingerprint mapping
    for (const [fingerprint, config] of Object.entries(fingerprintsData)) {
        if (!config.driverId) {
            console.error(`\x1b[31m[ERROR]\x1b[0m Fingerprint ${fingerprint} is missing 'driverId'`);
            errors++;
            continue;
        }

        const driverPath = path.join(driversDir, config.driverId);
        const driverComposePath = path.join(driverPath, 'driver.compose.json');

        if (!fs.existsSync(driverPath)) {
            console.error(`\x1b[31m[ERROR]\x1b[0m Fingerprint ${fingerprint} points to missing driver folder: ${config.driverId}`);
            errors++;
            continue;
        }

        if (!fs.existsSync(driverComposePath)) {
            console.warn(`\x1b[33m[WARNING]\x1b[0m Driver ${config.driverId} is missing driver.compose.json`);
            warnings++;
            continue;
        }

        // Verify fingerprint is inside driver.compose.json
        const composeContent = fs.readFileSync(driverComposePath, 'utf8');
        if (!composeContent.includes(`"${fingerprint}"`)) {
            console.error(`\x1b[31m[ERROR]\x1b[0m Fingerprint ${fingerprint} is defined in fingerprints.json but MISSING from drivers/${config.driverId}/driver.compose.json!`);
            console.error(`  -> You must add "${fingerprint}" to the zigbee manufacturerName array in ${config.driverId}`);
            errors++;
        }
    }

    if (errors > 0) {
        console.error(`\n\x1b[31m[FAILED] Fingerprints integrity check failed with ${errors} errors and ${warnings} warnings.\x1b[0m`);
        process.exit(1);
    } else {
        console.log(`\x1b[32m[OK] Fingerprints integrity verified successfully (${warnings} warnings).\x1b[0m`);
        process.exit(0);
    }

} catch (err) {
    console.error(`\x1b[31m[FATAL]\x1b[0m Script crashed: ${err.message}`);
    process.exit(1);
}
