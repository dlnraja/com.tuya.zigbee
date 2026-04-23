const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function log(msg) {
  console.log(`[CLUSTER-FIX] ${msg}`);
}

async function fixClusterIds() {
  const drivers = fs.readdirSync(DRIVERS_DIR).filter(d => 
    fs.statSync(path.join(DRIVERS_DIR, d)).isDirectory()
  );

  let fixedCount = 0;

  for (const driver of drivers) {
    const composePath = path.join(DRIVERS_DIR, driver, 'driver.compose.json');
    if (!fs.existsSync(composePath)) continue;

    try {
      let content = fs.readFileSync(composePath, 'utf8');
      let compose;
      try {
        compose = JSON.parse(content);
      } catch (e) {
        log(`Error parsing ${driver}: ${e.message}`);
        continue;
      }

      let changed = false;

      // 1. Process legacy zigbee array format if it exists
      if (Array.isArray(compose.zigbee)) {
        compose.zigbee.forEach(fp => {
          if (fp.endpoints) {
            Object.values(fp.endpoints).forEach(ep => {
              if (Array.isArray(ep.clusters)) {
                ep.clusters = ep.clusters.map(cid => {
                  if (typeof cid === 'string' && !isNaN(cid)) {
                    log(`Fixing string cluster ID "${cid}" in ${driver} (fingerprint)`);
                    changed = true;
                    return parseInt(cid , 10);
                  }
                  return cid;
                });
              }
            });
          }
        });
      }

      // 2. Process top-level zigbee object format
      if (compose.zigbee && !Array.isArray(compose.zigbee) && compose.zigbee.endpoints) {
        Object.values(compose.zigbee.endpoints).forEach(ep => {
          if (Array.isArray(ep.clusters)) {
            ep.clusters = ep.clusters.map(cid => {
              if (typeof cid === 'string' && !isNaN(cid)) {
                log(`Fixing string cluster ID "${cid}" in ${driver} (top-level)`);
                changed = true;
                return parseInt(cid , 10);
              }
              return cid;
            });
          }
        });
      }

      if (changed) {
        fs.writeFileSync(composePath, JSON.stringify(compose, null, 2));
        fixedCount++;
      }
    } catch (err) {
      log(`Error processing ${driver}: ${err.message}`);
    }
  }

  log(`Done. Fixed ${fixedCount} drivers.`);
}

fixClusterIds().catch(err => {
  console.error(err);
  process.exit(1);
});
