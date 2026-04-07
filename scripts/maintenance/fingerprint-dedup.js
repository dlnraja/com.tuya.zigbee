'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function findFiles(dir, suffix) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(file, suffix));
    } else if (file.endsWith(suffix)) {
      results.push(file);
    }
  });
  return results;
}

const composeFiles = findFiles(DRIVERS_DIR, 'driver.compose.json');

const fingerprintMap = {}; // key -> [driverPath]

composeFiles.forEach(file => {
  try {
    const compose = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!compose.zigbee) return;

    const mfrNames = Array.isArray(compose.zigbee.manufacturerName) ? compose.zigbee.manufacturerName : [compose.zigbee.manufacturerName];
    const productIds = Array.isArray(compose.zigbee.productId) ? compose.zigbee.productId : [compose.zigbee.productId];

    mfrNames.forEach(mfr => {
      productIds.forEach(pid => {
        if (!mfr || !pid) return;
        const key = `${mfr}|${pid}`.toLowerCase();
        if (!fingerprintMap[key]) fingerprintMap[key] = [];
        fingerprintMap[key].push(file);
      });
    });
  } catch (e) {}
});

const duplicates = Object.keys(fingerprintMap).filter(key => fingerprintMap[key].length > 1);

console.log(`Found ${duplicates.length} duplicated fingerprints.`);

// Priority ranking (lower is better/more specific)
function getPriority(filePath) {
  const name = path.basename(path.dirname(filePath));
  if (name.includes('hybrid')) return 1;
  if (name.includes('shutter') || name.includes('roller')) return 2;
  if (name.includes('thermostat') || name.includes('climate')) return 3;
  if (name.includes('dimmer')) return 4;
  if (name.includes('plug_energy')) return 5;
  if (name.includes('plug')) return 6;
  if (name.includes('switch')) return 7;
  if (name.includes('button')) return 8;
  if (name.includes('sensor')) return 9;
  if (name === 'generic_tuya' || name === 'universal_fallback') return 100;
  return 50;
}

let fixes = 0;
duplicates.forEach(key => {
  const files = fingerprintMap[key];
  files.sort((a, b) => getPriority(a) - getPriority(b));

  const winner = files[0];
  const losers = files.slice(1);

  losers.forEach(loserFile => {
    try {
      const compose = JSON.parse(fs.readFileSync(loserFile, 'utf8'));
      const [mfr, pid] = key.split('|');

      let changed = false;
      if (Array.isArray(compose.zigbee.manufacturerName)) {
        const index = compose.zigbee.manufacturerName.findIndex(n => n.toLowerCase() === mfr);
        if (index !== -1 && compose.zigbee.manufacturerName.length > 1) {
           // We can only remove it if there are other fingerprints left or if we remove the whole entry
           // But actually we should only remove the specific combination.
           // Zigbee matching in Homey matches ANY mfr + ANY pid in the arrays.
           // So if we have Mfr=[A, B] Pid=[X, Y], it matches A|X, A|Y, B|X, B|Y.
           // This is the problem!
        }
      }
      
      // For now, just Log who would be removed.
      // console.log(`  - Would remove ${key} from ${path.relative(ROOT, loserFile)} (Winner: ${path.relative(ROOT, winner)})`);
      fixes++;
    } catch (e) {}
  });
});

console.log(`Total removals planned: ${fixes}`);
