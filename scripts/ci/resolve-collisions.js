const fs = require('fs');
const path = require('path');

const DRIVERS_DIR = path.join(__dirname, '../../drivers');

function getCompose(driver) {
  const p = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveCompose(driver, data) {
  const p = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
}

// Read all drivers and build FP map
const fpMap = new Map();
const dirs = fs.readdirSync(DRIVERS_DIR).filter(d => fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory());

const composeCache = new Map();
const modifiedDrivers = new Set();

function getComposeCached(driver) {
  if (!composeCache.has(driver)) {
    composeCache.set(driver, getCompose(driver));
  }
  return composeCache.get(driver);
}

for (const dir of dirs) {
  const comp = getComposeCached(dir);
  if (!comp || !comp.zigbee || !comp.zigbee.manufacturerName || !comp.zigbee.productId) continue;
  
  for (const mfr of comp.zigbee.manufacturerName) {
    for (const pid of comp.zigbee.productId) {
      const key = `${mfr}|${pid}`;
      if (!fpMap.has(key)) fpMap.set(key, []);
      fpMap.get(key).push(dir);
    }
  }
}

// Determine which driver to remove from
const PRIMARY_DRIVERS = [
  'switch_2gang', 'button_wireless_plug', 'button_wireless_2', 'climate_sensor', 
  'device_din_rail', 'presence_sensor_radar', 'switch_1gang'
];

for (const [key, drvs] of fpMap) {
  const uniqueDrivers = [...new Set(drvs)];
  if (uniqueDrivers.length > 1) {
    const [mfr, pid] = key.split('|');
    
    // Pick the victim driver (the one NOT in PRIMARY_DRIVERS, or just the last one)
    let victim = uniqueDrivers.find(d => !PRIMARY_DRIVERS.includes(d));
    if (!victim) victim = uniqueDrivers[1]; // fallback
    
    const comp = getComposeCached(victim);
    if (comp && comp.zigbee && comp.zigbee.manufacturerName && comp.zigbee.manufacturerName.includes(mfr)) {
      const updatedMfrs = comp.zigbee.manufacturerName.filter(m => m !== mfr);
      if (updatedMfrs.length > 0) {
        console.log(`Resolving collision for ${mfr}|${pid} between ${uniqueDrivers.join(', ')} -> Removing from ${victim}`);
        comp.zigbee.manufacturerName = updatedMfrs;
        modifiedDrivers.add(victim);
      } else {
        console.log(`Resolving collision for ${mfr}|${pid} between ${uniqueDrivers.join(', ')} -> Skipping removal from ${victim} to prevent empty fingerprints`);
      }
    }
  }
}

for (const driver of modifiedDrivers) {
  console.log(`Saving updated compose JSON for ${driver}...`);
  saveCompose(driver, composeCache.get(driver));
}

console.log('Done resolving collisions.');
