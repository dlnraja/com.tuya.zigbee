const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

let fixedCount = 0;

for (const driver of drivers) {
    const deviceJsPath = path.join(driversDir, driver, 'device.js');
    if (!fs.existsSync(deviceJsPath)) continue;

    let content = fs.readFileSync(deviceJsPath, 'utf8');
    let original = content;

    // Fix multiple asyncs
    while (content.includes('async async')) {
        content = content.replace(/async\s+async/g, 'async');
    }

    // Clean up specifically the function calls that might have broken arrow functions too
    // "async async" is the main issue.
    // Let's also make sure we didn't add async to arrow functions that already had async.
    // "async async (v) =>" -> "async (v) =>"
    while (content.includes('async async')) {
        content = content.replace(/async\s+async/g, 'async');
    }

    if (content !== original) {
        fs.writeFileSync(deviceJsPath, content, 'utf8');
        // console.log(`Fixed ${driver}`);
        fixedCount++;
    }
}

console.log(`Fixed ${fixedCount} drivers.`);
