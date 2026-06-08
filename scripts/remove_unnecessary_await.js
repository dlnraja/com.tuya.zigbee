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

    // Remove 'await ' from 'await this.setCapabilityValue'
    content = content.replace(/await\s+this\.setCapabilityValue/g, 'this.setCapabilityValue');
    
    // Some others from the log:
    // await tuya.datapoint
    // await super.onNodeInit -> leave these alone because onNodeInit is definitely async
    
    if (content !== original) {
        fs.writeFileSync(deviceJsPath, content, 'utf8');
        fixedCount++;
    }
}

console.log(`Removed unnecessary awaits in ${fixedCount} drivers.`);
