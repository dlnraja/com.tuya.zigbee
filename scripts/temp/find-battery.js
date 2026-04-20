const fs = require('fs');
const path = require('path');

// Analyze existing battery removal patterns
const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir);
let batteryRemovedDrivers = [];

for (const driver of drivers) {
  const devicePath = path.join(driversDir, driver, 'device.js');
  if (fs.existsSync(devicePath)) {
    const content = fs.readFileSync(devicePath, 'utf8');
    if (content.includes("removeCapability('measure_battery')")) {
      batteryRemovedDrivers.push(driver);
    }
  }
}

console.log('Drivers with hardcoded removeCapability(\'measure_battery\'):');
console.log(batteryRemovedDrivers.join('\n'));
console.log(`\nTotal: ${batteryRemovedDrivers.length} drivers`);
