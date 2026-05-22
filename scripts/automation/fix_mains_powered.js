const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');

function main() {
    console.log('--- Starting Mains-Powered Battery Auto-Fix ---');

    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    let fixedDrivers = 0;

    for (const d of driverDirs) {
        const devicePath = path.join(DRIVERS_DIR, d, 'device.js');

        if (fs.existsSync(devicePath)) {
            try {
                let content = fs.readFileSync(devicePath, 'utf8');
                
                // Identify if it's mainsPowered
                if (content.includes('get mainsPowered()') && content.includes('return true')) {
                    
                    // Check if it's already removing measure_battery
                    if (!content.includes('removeCapability(\'measure_battery\')') && !content.includes('removeCapability("measure_battery")')) {
                        
                        // We need to inject it into onNodeInit
                        // Try to find async onNodeInit({ zclNode }) or similar
                        
                        const initMatch = content.match(/async\s+onNodeInit\s*\([^)]*\)\s*\{/);
                        if (initMatch) {
                            const injectStr = `\n    // Auto-fix: Remove battery capabilities for mains-powered devices\n    await this.removeCapability('measure_battery').catch(() => {});\n    await this.removeCapability('alarm_battery').catch(() => {});`;
                            content = content.replace(initMatch[0], initMatch[0] + injectStr);
                            
                            fs.writeFileSync(devicePath, content, 'utf8');
                            console.log(`[FIXED] Injected removeCapability to ${d}`);
                            fixedDrivers++;
                        } else {
                            // No onNodeInit found, we might need to add it, but it's tricky.
                            // Let's just log it.
                            console.warn(`[WARN] Could not find onNodeInit in ${d} to inject removeCapability`);
                        }
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
