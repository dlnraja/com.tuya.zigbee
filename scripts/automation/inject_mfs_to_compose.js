const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const MFS_DB_PATH = path.join(REPO_ROOT, 'data', 'mfs_db.json');
const DRIVERS_DIR = path.join(REPO_ROOT, 'drivers');

function injectMFS() {
  if (!fs.existsSync(MFS_DB_PATH)) {
    console.log('MFS DB not found at', MFS_DB_PATH);
    return;
  }

  let db;
  try {
    db = JSON.parse(fs.readFileSync(MFS_DB_PATH, 'utf8'));
  } catch (e) {
    console.error('Failed to parse MFS DB:', e.message);
    return;
  }

  // devices could be an object or an array. Let's handle both.
  let devices = db.devices || [];
  if (!Array.isArray(devices) && typeof devices === 'object') {
    devices = Object.values(devices);
  }

  const driverMfrs = {};

  // Group manufacturer names by driverHint
  for (const device of devices) {
    if (!device.driverHint || !device.manufacturerId) continue;
    
    // Some hints might be mapped incorrectly, ensure the driver exists
    const driverHint = device.driverHint;
    if (!driverMfrs[driverHint]) {
      driverMfrs[driverHint] = new Set();
    }
    
    driverMfrs[driverHint].add(device.manufacturerId);
  }

  let changedCount = 0;

  for (const [driverId, mfrs] of Object.entries(driverMfrs)) {
    const composePath = path.join(DRIVERS_DIR, driverId, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    let compose;
    try {
      compose = JSON.parse(fs.readFileSync(composePath, 'utf8'));
    } catch (e) {
      console.error(`Failed to parse ${composePath}:`, e.message);
      continue;
    }

    if (!compose.zigbee) compose.zigbee = {};
    if (!compose.zigbee.manufacturerName) compose.zigbee.manufacturerName = [];

    const existingMfrs = new Set(compose.zigbee.manufacturerName);
    let added = 0;

    for (const mfr of mfrs) {
      if (!existingMfrs.has(mfr)) {
        compose.zigbee.manufacturerName.push(mfr);
        added++;
      }
    }

    if (added > 0) {
      fs.writeFileSync(composePath, JSON.stringify(compose, null, 2) + '\n');
      console.log(`[${driverId}] Added ${added} new manufacturer signatures.`);
      changedCount++;
    }
  }

  console.log(`Injection complete. Updated ${changedCount} drivers.`);
}

injectMFS();
