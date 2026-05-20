const fs = require('fs');
const path = require('path');

const ROOT = 'C:\\Users\\HP\\Desktop\\homey app\\tuya_repair';
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const fpMap = new Map();

const drivers = fs.readdirSync(DRIVERS_DIR).filter(d =>
  fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
);

for (const driver of drivers) {
  const composeFile = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
  if (!fs.existsSync(composeFile)) continue;

  try {
    const compose = JSON.parse(fs.readFileSync(composeFile, 'utf8'));
    const mfrNames = compose.zigbee?.manufacturerName || [];
    const pIdNames = compose.zigbee?.productId || [];

    for (const mfr of mfrNames) {
      for (const pid of pIdNames) {
        const key = `${mfr}|${pid}`;
        if (!fpMap.has(key)) fpMap.set(key, []);
        fpMap.get(key).push(driver);
      }
    }
  } catch (e) {}
}

const targetKey = '_tz3210_4ubylghk|TS1101';
if (fpMap.has(targetKey)) {
  console.log(`Drivers matching "${targetKey}":`, fpMap.get(targetKey));
} else {
  console.log(`No match for "${targetKey}"`);
  // Print all keys containing TS1101
  console.log("All TS1101 matches:");
  for (const [key, drvs] of fpMap.entries()) {
    if (key.includes('TS1101') && drvs.length > 1) {
      console.log(`- ${key}: ${drvs.join(', ')}`);
    }
  }
}
