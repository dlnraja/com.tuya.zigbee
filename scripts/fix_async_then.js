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

    content = content.replace(/\.async\s+then\(/g, '.then(');

    if (content !== original) {
        fs.writeFileSync(deviceJsPath, content, 'utf8');
        fixedCount++;
    }
}

console.log(`Fixed async then in ${fixedCount} drivers.`);
