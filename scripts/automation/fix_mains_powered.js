const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');

function main() {
    console.log('--- Starting Mains-Powered Battery Auto-Fix (JSON) ---');

    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    let fixedDrivers = 0;

    for (const d of driverDirs) {
        const devicePath = path.join(DRIVERS_DIR, d, 'device.js');
        const composePath = path.join(DRIVERS_DIR, d, 'driver.compose.json');

        if (fs.existsSync(devicePath) && fs.existsSync(composePath)) {
            try {
                let content = fs.readFileSync(devicePath, 'utf8');
                
                // Identify if it's mainsPowered
                if (content.includes('get mainsPowered()') && content.includes('return true')) {
                    
                    const composeData = JSON.parse(fs.readFileSync(composePath, 'utf8'));
                    let modified = false;

                    if (composeData.capabilities) {
                        const originalLength = composeData.capabilities.length;
                        composeData.capabilities = composeData.capabilities.filter(c => c !== 'measure_battery' && c !== 'alarm_battery');
                        
                        if (composeData.capabilities.length !== originalLength) {
                            modified = true;
                        }
                    }
                    
                    if (composeData.energy && composeData.energy.batteries) {
                        delete composeData.energy.batteries;
                        modified = true;
                    }

                    if (modified) {
                        fs.writeFileSync(composePath, JSON.stringify(composeData, null, 2) + '\n', 'utf8');
                        console.log(`[FIXED] Removed battery capabilities from mainsPowered driver: ${d}`);
                        fixedDrivers++;
                    }
                }
            } catch (e) {
                console.error(`Error processing ${d}: ${e.message}`);
            }
        }
    }

    console.log('--- Summary ---');
    console.log(`Fixed Drivers: ${fixedDrivers}`);
}

main();
