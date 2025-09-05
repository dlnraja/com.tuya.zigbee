const fs = require('fs');
const path = require('path');
const { generateSmartMetadata } = require('./lib/ai-metadata');

async function enrichDrivers() {
  const driversDir = path.join(__dirname, 'drivers');
  const driverDirs = fs.readdirSync(driversDir).filter(dir => {
    return fs.statSync(path.join(driversDir, dir)).isDirectory();
  });

  for (const driverDir of driverDirs) {
    const driverPath = path.join(driversDir, driverDir);
    const deviceJsPath = path.join(driverPath, 'device.js');
    
    if (fs.existsSync(deviceJsPath)) {
      const deviceCode = fs.readFileSync(deviceJsPath, 'utf8');
      const metadata = await generateSmartMetadata(deviceCode);
      
      // Update driver.compose.json with metadata
      const composePath = path.join(driverPath, 'driver.compose.json');
      if (fs.existsSync(composePath)) {
        const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
        compose.metadata = metadata;
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
      }
    }
  }
}

enrichDrivers().catch(console.error);
