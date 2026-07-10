const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT_DIR, 'drivers');

function main() {
    console.log('--- Starting Intelligent SmartDivisorManager Auto-Fix ---');

    const driverDirs = fs.readdirSync(DRIVERS_DIR);
    let fixedDrivers = 0;

    for (const d of driverDirs) {
        const devicePath = path.join(DRIVERS_DIR, d, 'device.js');

        if (fs.existsSync(devicePath)) {
            let content = fs.readFileSync(devicePath, 'utf8');
            let modified = false;

            const injectSmartParse = () => {
                if (!content.includes('smartParse') && !content.includes('SmartDivisorManager')) {
                    if (content.includes('require(')) {
                        content = content.replace(/(const {[^}]+}\s*=\s*require\('[^']+'\);)/, `$1\nconst { smartParse } = require('../../lib/managers/SmartDivisorManager');`);
                    } else {
                        content = `const { smartParse } = require('../../lib/managers/SmartDivisorManager');\n` + content;
                    }
                }
            };

            // Fix temp = data.measuredValue / 100;
            if (content.match(/(temp|temperature)\s*=\s*(?:Math\.round\()?\(?(data\.measuredValue\s*\/\s*100)/i)) {
                injectSmartParse();
                content = content.replace(/(temp|temperature)\s*=\s*Math\.round\(\(data\.measuredValue\s*\/\s*100\)\s*\*\s*10\)\s*\/\s*10/g, "$1 = smartParse(data.measuredValue, null, { capability: 'measure_temperature' })");
                content = content.replace(/(temp|temperature)\s*=\s*data\.measuredValue\s*\/\s*100/g, "$1 = smartParse(data.measuredValue, null, { capability: 'measure_temperature' })");
                modified = true;
            }

            // Fix hum = data.measuredValue / 100;
            if (content.match(/(hum|humidity)\s*=\s*(?:Math\.round\()?\(?(data\.measuredValue\s*\/\s*100)/i)) {
                injectSmartParse();
                content = content.replace(/(hum|humidity)\s*=\s*Math\.round\(data\.measuredValue\s*\/\s*100\)/g, "$1 = smartParse(data.measuredValue, null, { capability: 'measure_humidity' })");
                content = content.replace(/(hum|humidity)\s*=\s*data\.measuredValue\s*\/\s*100/g, "$1 = smartParse(data.measuredValue, null, { capability: 'measure_humidity' })");
                modified = true;
            }

            // Fix watts = value / 10;
            if (content.match(/watts\s*=\s*value\s*\/\s*10/)) {
                injectSmartParse();
                content = content.replace(/watts\s*=\s*value\s*\/\s*10/g, "watts = smartParse(value, null, { capability: 'measure_power' })");
                modified = true;
            }

            // Fix volts = value / 10;
            if (content.match(/volts\s*=\s*value\s*\/\s*10/)) {
                injectSmartParse();
                content = content.replace(/volts\s*=\s*value\s*\/\s*10/g, "volts = smartParse(value, null, { capability: 'measure_voltage' })");
                modified = true;
            }

            // Fix voltage = value / 10;
            if (content.match(/voltage\s*=\s*value\s*\/\s*10/)) {
                injectSmartParse();
                content = content.replace(/voltage\s*=\s*value\s*\/\s*10/g, "voltage = smartParse(value, null, { capability: 'measure_voltage' })");
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(devicePath, content, 'utf8');
                console.log(`[FIXED] Replaced hardcoded math intelligently in ${d}`);
                fixedDrivers++;
            }
        }
    }

    console.log('--- Summary ---');
    console.log(`Fixed Drivers: ${fixedDrivers}`);
}

main();
