const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, 'drivers');
const appJsonPath = path.join(__dirname, 'app.json');

const PLACEHOLDER_MF = '_TZE200_placeholder_generic';
const PLACEHOLDER_PID = 'TS0601'; // Common generic Tuya PID

let fixedCount = 0;

console.log('Scanning drivers...');

// 1. Fix driver.compose.json files
fs.readdirSync(driversDir).forEach(driverDir => {
    const driverPath = path.join(driversDir, driverDir, 'driver.compose.json');
    if (!fs.existsSync(driverPath)) return;

    try {
        const content = fs.readFileSync(driverPath, 'utf8');
        const driver = JSON.parse(content);
        let changed = false;

        // Fix empty manufacturerName
        if (driver.zigbee && Array.isArray(driver.zigbee.manufacturerName) && driver.zigbee.manufacturerName.length === 0) {
            console.log(`  [FIX] ${driverDir}: Adding placeholder manufacturerName`);
            driver.zigbee.manufacturerName = [PLACEHOLDER_MF];
            changed = true;
        }

        // Fix empty productId
        if (driver.zigbee && Array.isArray(driver.zigbee.productId) && driver.zigbee.productId.length === 0) {
            console.log(`  [FIX] ${driverDir}: Adding placeholder productId`);
            driver.zigbee.productId = [PLACEHOLDER_PID];
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(driverPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
            fixedCount++;
        }
    } catch (e) {
        console.error(`  [ERROR] Failed to process ${driverDir}: ${e.message}`);
    }
});

// 2. Fix app.json
console.log('Scanning app.json...');
try {
    const appContent = fs.readFileSync(appJsonPath, 'utf8');
    const app = JSON.parse(appContent);
    let appChanged = false;

    if (app.drivers && Array.isArray(app.drivers)) {
        app.drivers.forEach(d => {
            // Fix empty manufacturerName
            if (d.zigbee && Array.isArray(d.zigbee.manufacturerName) && d.zigbee.manufacturerName.length === 0) {
                console.log(`  [FIX] app.json driver ${d.id}: Adding placeholder manufacturerName`);
                d.zigbee.manufacturerName = [PLACEHOLDER_MF];
                appChanged = true;
            }
            // Fix empty productId
            if (d.zigbee && Array.isArray(d.zigbee.productId) && d.zigbee.productId.length === 0) {
                console.log(`  [FIX] app.json driver ${d.id}: Adding placeholder productId`);
                d.zigbee.productId = [PLACEHOLDER_PID];
                appChanged = true;
            }
        });
    }

    if (appChanged) {
        fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n', 'utf8');
        fixedCount++;
    }
} catch (e) {
    console.error(`[ERROR] Failed to process app.json: ${e.message}`);
}

console.log(`\nDone. Fixed ${fixedCount} files.`);
