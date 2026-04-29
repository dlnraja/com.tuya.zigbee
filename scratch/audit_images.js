
const fs = require('fs');
const path = require('path');
const driversDir = path.join(process.cwd(), 'drivers');
const drivers = fs.readdirSync(driversDir);

let missingTotal = 0;

drivers.forEach(driver => {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      if (compose.images) {
        Object.entries(compose.images).forEach(([key, val]) => {
          // Path is usually "drivers/name/assets/images/small.png"
          // but sometimes it's relative to driver dir or root
          let fullPath = path.join(process.cwd(), val);
          if (!fs.existsSync(fullPath)) {
             console.log(`[${driver}] Missing ${key} image: ${val}`);
             missingTotal++;
          }
        });
      }
    } catch (e) {
      console.log(`[${driver}] Failed to parse compose.json: ${e.message}`);
    }
  }
});

console.log(`\nTotal missing images: ${missingTotal}`);
