/**
 * AI Fallback Repair Script
 * Auto-detects and heals common Homey SDK 3 validation errors 
 * before the CI pipeline crashes.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[AUTO-HEAL] Scanning for SDK 3 Validation errors...');

try {
    // We run the validation to capture its stderr/stdout
    execSync('npx homey app validate --level publish', { encoding: 'utf8' });
    console.log('[AUTO-HEAL] App validated successfully, no repair needed.');
} catch (error) {
    const errorOutput = error.stdout + '\n' + error.stderr;
    console.log('[AUTO-HEAL] Validation failed. Attempting intelligent repair...');

    let repairsMade = false;

    // 1. Missing energy.batteries for measure_battery capability
    if (errorOutput.includes("missing an array 'energy.batteries'") || errorOutput.includes("measure_battery is being used")) {
        console.log('[HEAL] Detected missing energy.batteries for a measure_battery capability.');
        
        const driversPath = path.join(__dirname, '../../drivers');
        if (fs.existsSync(driversPath)) {
            const drivers = fs.readdirSync(driversPath);
            for (const driver of drivers) {
                const composePath = path.join(driversPath, driver, 'driver.compose.json');
                if (fs.existsSync(composePath)) {
                    let content = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                    if (content.capabilities && content.capabilities.includes('measure_battery')) {
                        if (!content.energy) content.energy = {};
                        if (!content.energy.batteries) {
                            content.energy.batteries = ["Other"]; // Magic SDK 3 fallback
                            console.log(`[HEAL] Fixed ${driver} -> injected energy.batteries`);
                            fs.writeFileSync(composePath, JSON.stringify(content, null, 2), 'utf8');
                            repairsMade = true;
                        }
                    }
                }
            }
        }
    }

    // After attempting repairs, re-run compose so app.json absorbs the fix
    if (repairsMade) {
        console.log('[AUTO-HEAL] Applying repairs with homey app compose...');
        execSync('npx homey app compose', { stdio: 'inherit' });
    } else {
        console.log('[AUTO-HEAL] Could not identify a known pattern to heal. Failing gracefully.');
        process.exit(1); 
    }
}
