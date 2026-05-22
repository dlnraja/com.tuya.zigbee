const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');

function main() {
    console.log('--- Starting SmartDivisorManager Auto-Fix ---');

    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    let fixedDrivers = 0;

    for (const d of driverDirs) {
        const devicePath = path.join(DRIVERS_DIR, d, 'device.js');

        if (fs.existsSync(devicePath)) {
            let content = fs.readFileSync(devicePath, 'utf8');
            let modified = false;

            // Simple replacement for dpMappings hardcoded divisors
            // If they have divisor: 10 or divisor: 100 inside dpMappings, we can remove it or set it to 1,
            // but AdaptiveDataParser already handles it. The rule says "Use smartDivisorDetect() for measure_temperature and measure_humidity in device classes. Do NOT hardcode `value / 100` or `value / 10` manually."
            
            // Let's replace some known hardcoded divisions in custom datapoint handlers
            // For example in switch_temp_sensor/device.js
            if (content.includes('value / 10') || content.includes('value / 100')) {
                // If it doesn't import SmartDivisorManager, add it
                if (!content.includes('smartParse') && !content.includes('SmartDivisorManager')) {
                    if (content.includes('require(')) {
                        content = content.replace(/(const {[^}]+}\s*=\s*require\('[^']+'\);)/, `$1\nconst { smartParse } = require('../../lib/managers/SmartDivisorManager');`);
                    }
                }
                
                // We'll replace specific patterns
                // const temp = typeof value === 'number' ? value / 100 : value;
                content = content.replace(/typeof value === 'number'\s*\?\s*value\s*\/\s*100\s*:\s*value/g, "typeof value === 'number' ? smartParse(value, null, { capability: 'measure_temperature' }) : value");
                content = content.replace(/typeof value === 'number'\s*\?\s*value\s*\/\s*10\s*:\s*value/g, "typeof value === 'number' ? smartParse(value, null, { capability: 'measure_temperature' }) : value");
                
                // value / 100
                content = content.replace(/value \/ 100/g, "smartParse(value, null, { capability: 'measure_temperature' })");

                fs.writeFileSync(devicePath, content, 'utf8');
                modified = true;
            }

            if (modified) {
                console.log(`[FIXED] Replaced hardcoded math in ${d}`);
                fixedDrivers++;
            }
        }
    }

    console.log('--- Summary ---');
    console.log(`Fixed Drivers: ${fixedDrivers}`);
}

main();
