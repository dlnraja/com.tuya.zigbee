#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

/**
 * verify_fingerprints_integrity.js
 * Automatically verifies that:
 * 1. Every fingerprint listed in `fingerprints.json` maps to a valid existing driver
 * 2. Every fingerprint in `fingerprints.json` is correctly embedded in its target `driver.compose.json`
 *
 * Usage: node scripts/validation/verify_fingerprints_integrity.js [--fix]
 * Exit codes: 0 = pass, 1 = failures found, 2 = script error
 */

const projectRoot = path.join(__dirname, '../..');
const fingerprintsPath = fs.existsSync(path.join(projectRoot, 'data/fingerprints.json'))
  ? path.join(projectRoot, 'data/fingerprints.json')
  : path.join(projectRoot, 'lib/tuya/fingerprints.json');
const driversDir = path.join(projectRoot, 'drivers');
const isFixMode = process.argv.includes('--fix');

let errors = 0;
let warnings = 0;
let fixed = 0;

console.log('\x1b[36m[VALIDATION] Verifying fingerprints integrity...\x1b[0m');
if (isFixMode) console.log('\x1b[35m[INFO] Running in AUTO-HEAL mode (--fix)\x1b[0m');

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
            if (isFixMode) {
                try {
                    const composeJson = JSON.parse(composeContent);
                    if (!composeJson.zigbee) composeJson.zigbee = {};
                    if (!composeJson.zigbee.manufacturerName) composeJson.zigbee.manufacturerName = [];
                    
                    if (Array.isArray(composeJson.zigbee.manufacturerName) && !composeJson.zigbee.manufacturerName.includes(fingerprint)) {
                        composeJson.zigbee.manufacturerName.push(fingerprint);
                        
                        // Sort them for cleanliness
                        composeJson.zigbee.manufacturerName.sort();
                        
                        fs.writeFileSync(driverComposePath, JSON.stringify(composeJson, null, 2) + '\n', 'utf8');
                        console.log(`\x1b[32m[HEALED]\x1b[0m Injected ${fingerprint} into ${config.driverId}`);
                        fixed++;
                    } else if (typeof composeJson.zigbee.manufacturerName === 'string') {
                        if (composeJson.zigbee.manufacturerName !== fingerprint) {
                            composeJson.zigbee.manufacturerName = [composeJson.zigbee.manufacturerName, fingerprint].sort();
                            fs.writeFileSync(driverComposePath, JSON.stringify(composeJson, null, 2) + '\n', 'utf8');
                            console.log(`\x1b[32m[HEALED]\x1b[0m Converted string to array and injected ${fingerprint} into ${config.driverId}`);
                            fixed++;
                        }
                    }
                } catch(e) {
                    console.error(`\x1b[31m[ERROR]\x1b[0m Failed to parse/heal ${config.driverId}/driver.compose.json: ${e.message}`);
                    errors++;
                }
            } else {
                console.error(`\x1b[31m[ERROR]\x1b[0m Fingerprint ${fingerprint} is defined in fingerprints.json but MISSING from drivers/${config.driverId}/driver.compose.json!`);
                console.error(`  -> You must add "${fingerprint}" to the zigbee manufacturerName array in ${config.driverId}`);
                errors++;
            }
        }
    }

    if (errors > 0 && !isFixMode) {
        console.error(`\n\x1b[31m[FAILED] Fingerprints integrity check failed with ${errors} errors and ${warnings} warnings.\x1b[0m`);
        console.log(`\n\x1b[36m💡 Tip: Run 'node scripts/validation/verify_fingerprints_integrity.js --fix' to auto-heal these missing fingerprints!\x1b[0m\n`);
        process.exit(1);
    } else if (isFixMode) {
        console.log(`\n\x1b[32m[OK] Auto-Heal complete! Fixed ${fixed} missing fingerprints. Errors remaining: ${errors}\x1b[0m`);
        process.exit(errors > 0 ? 1 : 0);
    } else {
        console.log(`\x1b[32m[OK] Fingerprints integrity verified successfully (${warnings} warnings).\x1b[0m`);
        process.exit(0);
    }

} catch (err) {
    console.error(`\x1b[31m[FATAL]\x1b[0m Script crashed: ${err.message}`);
    process.exit(1);
}
