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

    // Fix bad regex replacements from earlier scripts
    content = content.replace(/async\s+if\s*\(/g, 'if (');
    content = content.replace(/\} else async if\s*\(/g, '} else if (');
    content = content.replace(/async\s+for\s*\(/g, 'for (');
    content = content.replace(/\.onasync\s*\(/g, '.on(');
    content = content.replace(/async\s+catch\s*\(/g, 'catch (');
    content = content.replace(/async\s+switch\s*\(/g, 'switch (');
    content = content.replace(/async\s+while\s*\(/g, 'while (');

    if (content !== original) {
        fs.writeFileSync(deviceJsPath, content, 'utf8');
        fixedCount++;
    }
}

console.log(`Fixed bad tokens in ${fixedCount} drivers.`);
