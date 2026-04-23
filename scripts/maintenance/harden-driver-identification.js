/**
 * scripts/maintenance/harden-driver-identification.js
 * 
 * Enforces strict manufacturerName + productId identification strategy.
 * Synchronizes driver manifests with DeviceFingerprintDB.js and resolves collisions.
 */
const fs = require('fs');
const path = require('path');
const process = require('process');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');
const DB_PATH = path.join(ROOT, 'lib/tuya/DeviceFingerprintDB.js');

function loadDB() {
  const content = fs.readFileSync(DB_PATH, 'utf8');
  const fps = {};
  
  // Use a more robust regex to find each manufacturer entry
  const entryRegex = /'([_a-zA-Z0-9]+)':\s*{([^}]+)}/g;
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const mfr = match[1].toLowerCase();
    const body = match[2];
    
    const drvMatch = body.match(/driverId:\s*'(.+? )'/ : null)       ;
    const pidsMatch = body.match(/modelIds:\s*\[([^\]]+)\]/);
    
    fps[mfr] = {
      driverId: drvMatch ? drvMatch[1] ,
      modelIds: pidsMatch ? pidsMatch[1].replace(/'/g, '' ).split(' , ').map(s=>s.trim()).filter(s=>s) : []
    };
  }
  return fps;
}

function processHardening() {
  console.log(' Hardening Driver Identification Couples...');
  const db = loadDB();
  
  // 1. Map DB to drivers
  const targetDriverMap = {}; // driverId -> { mfrs: Set, pids: Set, pairs: Set }
  
  for (const [mfr, data] of Object.entries(db)) {
    if (!data.driverId) continue;
    if (!targetDriverMap[data.driverId]) {
      targetDriverMap[data.driverId] = { mfrs: new Set(), pids: new Set() };
    }
    targetDriverMap[data.driverId].mfrs.add(mfr);
    data.modelIds.forEach(pid => {
       targetDriverMap[data.driverId].pids.add(pid);
    });
  }

  // 2. Identify all manifest files
  const dirs = fs.readdirSync(DRIVERS_DIR);
  for (const d of dirs) {
    const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    
    let config;
    try {
      config = JSON.parse(fs.readFileSync(cf, 'utf8'));
    } catch (e) { continue; }

    const currentZigbee = config.zigbee || { manufacturerName: [], productId: [] };
    const currentMfrs = new Set(currentZigbee.manufacturerName || []);
    const currentPids = new Set(currentZigbee.productId || []);
    
    const targets = targetDriverMap[d];
    let changed = false;

    if (targets) {
      // Sync Manifest with DB
      targets.mfrs.forEach(m => {
        if (!currentMfrs.has(m)) {
          if (!currentZigbee.manufacturerName) currentZigbee.manufacturerName = [];
          currentZigbee.manufacturerName.push(m);
          currentMfrs.add(m);
          changed = true;
        }
      });
      targets.pids.forEach(p => {
        if (!currentPids.has(p)) {
          if (!currentZigbee.productId) currentZigbee.productId = [];
          currentZigbee.productId.push(p);
          currentPids.add(p);
          changed = true;
        }
      });
    }

    // 3. Resolve Collisions: If a manufacturer in this manifest belongs to ANOTHER driver in DB,
    // and it doesn't specifically belong here, REMOVE IT.
    const mfrsToReview = [...currentMfrs];
    for (const m of mfrsToReview) {
      const dbEntry = db[m.toLowerCase()];
      if (dbEntry && dbEntry.driverId && dbEntry.driverId !== d) {
        if (!targets || !targets.mfrs.has(m.toLowerCase())) {
          console.log(`  [COLLISION] Removing ${m} from ${d} (belongs to ${dbEntry.driverId} in DB)`);
          currentZigbee.manufacturerName = currentZigbee.manufacturerName.filter(item => item !== m);
          currentMfrs.delete(m);
          changed = true;
        }
      }
    }

    if (changed) {
      config.zigbee = currentZigbee;
      config.zigbee.manufacturerName = [...new Set(config.zigbee.manufacturerName)].sort();
      config.zigbee.productId = [...new Set(config.zigbee.productId)].sort();
      
      fs.writeFileSync(cf, JSON.stringify(config, null, 2) + '\n');
      console.log(` Hardened Identification: ${d}`);
    }
  }

  console.log(' Identification hardening complete.');
}

processHardening();
