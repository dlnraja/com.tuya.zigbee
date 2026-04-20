const fs = require('fs');
const path = require('path');

const rootPath = path.join(__dirname, '..', '..');
const driversPath = path.join(rootPath, 'drivers');
const drivers = fs.readdirSync(driversPath);

drivers.forEach(driver => {
  const composePath = path.join(driversPath, driver, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      let content = fs.readFileSync(composePath, 'utf8');
      const placeholder = '{{driverAssetsPath}}';
      const actualPath = `drivers/${driver}/assets`;
      
      if (content.includes(placeholder)) {
        console.log(`[FIXING] ${driver}: Replacing ${placeholder}`);
        const newContent = content.split(placeholder).join(actualPath);
        fs.writeFileSync(composePath, newContent, 'utf8');
      }
    } catch (e) {
      console.log(`[ERROR] ${driver}: ${e.message}`);
    }
  }
});
