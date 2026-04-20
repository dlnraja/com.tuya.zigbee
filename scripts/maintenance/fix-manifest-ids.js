const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function fixAllManifestIds() {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  let fixed = 0;

  for (const driverDir of drivers) {
    const composePath = path.join(DRIVERS_DIR, driverDir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const content = fs.readFileSync(composePath, 'utf8');
      const compose = JSON.parse(content);
      
      // If id exists and is different from folder name, or if we just want to enforce folder name
      if (compose.id !== driverDir) {
        console.log(`Fixing ID for ${driverDir}: "${compose.id || 'missing'}" -> "${driverDir}"`);
        compose.id = driverDir;
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        fixed++;
      }
    } catch (e) {
      console.error(`Error processing ${driverDir}: ${e.message}`);
    }
  }
  console.log(`Done. Fixed ${fixed} manifests.`);
}

fixAllManifestIds().catch(console.error);
