const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');

function main() {
    console.log('--- Starting Architecture Consolidation Audit ---');

    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    let batteryConflicts = 0;
    let hardcodedDivisions = 0;

    for (const d of driverDirs) {
        const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');
        const devicePath = path.join(DRIVERS_DIR, d, 'device.js');

        if (fs.existsSync(composePath)) {
            try {
                const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                const capabilities = composeData.capabilities || [];
                
                // Note: SDK v3 allows BOTH in compose as long as they are removed at RUNTIME.
                // "But BOTH should be declared as POSSIBLE in compose for hybrid variants"
                // Actually the rule says: "NEVER combine measure_battery + alarm_battery on same device, but BOTH should be declared as POSSIBLE in compose for hybrid variants".
                // Wait, if it's declared in compose, it's fine. The rule is at runtime. 
                // So checking compose for both is not necessarily an error, it's allowed for hybrid.
            } catch (e) {
                console.error(`Error reading compose for ${d}: ${e.message}`);
            }
        }

        if (fs.existsSync(devicePath)) {
            try {
                const deviceContent = fs.readFileSync(devicePath, 'utf8');
                
                // Check for hardcoded divisions like "value / 10" or "value / 100"
                if (deviceContent.match(/value\s*\/\s*100/) || deviceContent.match(/value\s*\/\s*10\b/)) {
                    // console.warn(`[WARN] Hardcoded division found in ${d}/device.js`);
                    // We will replace these or flag them.
                    hardcodedDivisions++;
                }

                // Check for mainsPowered definition
                if (deviceContent.includes('mainsPowered')) {
                    if (!deviceContent.includes('removeCapability(\'measure_battery\')') && !deviceContent.includes('removeCapability("measure_battery")')) {
                        console.warn(`[WARN] Mains-Powered device ${d} may not be removing battery capabilities on init.`);
                    }
                }
            } catch (e) {
                console.error(`Error reading device.js for ${d}: ${e.message}`);
            }
        }
    }

    console.log('--- Summary ---');
    console.log(`Hardcoded Divisions Found: ${hardcodedDivisions}`);
}

main();
