const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..', '..');
const driversPath = path.join(rootPath, 'drivers');
const drivers = fs.readdirSync(driversPath);

let brokenCount = 0;

drivers.forEach(driver => {
  const composePath = path.join(driversPath, driver, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (compose.images) {
        Object.values(compose.images).forEach(imagePath => {
          const fullPath = path.join(rootPath, imagePath);
          if (!fs.existsSync(fullPath)) {
            console.log(`[BROKEN] ${driver}: ${imagePath}`);
            brokenCount++;
          }
        });
      }
    } catch (e) {
      // console.log(`[ERROR] ${driver}: Failed to parse manifest`);
    }
  }
});

console.log(`Total broken images found: ${brokenCount}`);
