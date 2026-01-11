/**
 * Script to add lowercase versions of manufacturer IDs
 * Homey manufacturerName is CASE SENSITIVE!
 * This script adds lowercase variants for all uppercase IDs
 */

const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, '..', 'drivers');

function processDriver(driverPath) {
  const filePath = path.join(driverPath, 'driver.compose.json');
  if (!fs.existsSync(filePath)) return { name: path.basename(driverPath), added: 0 };

  let content = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    return { name: path.basename(driverPath), added: 0, error: 'parse error' };
  }

  if (!data.zigbee || !data.zigbee.manufacturerName) {
    return { name: path.basename(driverPath), added: 0 };
  }

  const mfNames = data.zigbee.manufacturerName;
  const newNames = [];
  let added = 0;

  mfNames.forEach(name => {
    newNames.push(name);

    // Check if it's an uppercase Tuya ID pattern
    if (/^_T[ZE][A-Z0-9]+_[A-Z0-9]+$/.test(name)) {
      const lowerName = name.toLowerCase();
      if (!mfNames.includes(lowerName) && !newNames.includes(lowerName)) {
        newNames.push(lowerName);
        added++;
      }
    }
  });

  if (added > 0) {
    data.zigbee.manufacturerName = newNames;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  return { name: path.basename(driverPath), added };
}

// Process all drivers
const drivers = fs.readdirSync(driversDir).filter(d =>
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let totalAdded = 0;
const results = [];

drivers.forEach(driver => {
  const result = processDriver(path.join(driversDir, driver));
  if (result.added > 0) {
    results.push(result);
    totalAdded += result.added;
  }
});

console.log(`\n=== CASE SENSITIVITY FIX ===`);
console.log(`Total lowercase IDs added: ${totalAdded}`);
console.log(`\nDrivers modified:`);
results.forEach(r => console.log(`  ${r.name}: +${r.added} lowercase IDs`));
