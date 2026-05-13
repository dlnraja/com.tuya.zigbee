const fs = require('fs');
const path = require('path');

const driversDir = 'drivers';
const drivers = fs.readdirSync(driversDir);

drivers.forEach(driver => {
  const devicePath = path.join(driversDir, driver, 'device.js');
  const driverPath = path.join(driversDir, driver, 'driver.js');
  
  [devicePath, driverPath].forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/getTriggerCard(\?\.)?\(/g);
      if (matches) {
        console.log(`${filePath}: Found ${matches.length} matches`);
      }
    }
  });
});
