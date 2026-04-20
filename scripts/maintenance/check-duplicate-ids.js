const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

async function checkDuplicateIds() {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  const ids = new Map();

  for (const driverDir of drivers) {
    const composePath = path.join(DRIVERS_DIR, driverDir, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      const compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const id = compose.id || driverDir;
      
      if (ids.has(id)) {
        console.error(`COLLISION: Driver ID "${id}" is used by both:`);
        console.error(`  1. ${ids.get(id)}`);
        console.error(`  2. ${driverDir}`);
      } else {
        ids.set(id, driverDir);
      }
    } catch (e) {
      console.error(`Error reading ${driverDir}: ${e.message}`);
    }
  }
}

checkDuplicateIds().catch(console.error);
