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

const fingerprintMap = {}; // key -> [{file, mfr, pid}]

console.log('---  Building Fingerprint Map ---');
composeFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const compose = JSON.parse(content);
    if (!compose.zigbee) return;

    // Handle single object vs array of objects (Homey supports both)
    const zigbeeEntries = Array.isArray(compose.zigbee) ? compose.zigbee : [compose.zigbee]      ;

    zigbeeEntries.forEach(entry => {
        const mfrNames = Array.isArray(entry.manufacturerName) ? entry.manufacturerName : 
                         (entry.manufacturerName ? [entry.manufacturerName] : [])      ;
        const productIds = Array.isArray(entry.productId) ? entry.productId : 
                         (entry.productId ? [entry.productId] : [])      ;

        // Deduplicate internal lists first (case-insensitive)
        const uniqueMfrs = [...new Set(mfrNames.map(m => m.trim()))];
        const uniquePids = [...new Set(productIds.map(p => p.trim()))];

        uniqueMfrs.forEach(mfr => {
            if (uniquePids.length === 0) {
                const key = `${mfr}|*`.toLowerCase();
                if (!fingerprintMap[key]) fingerprintMap[key] = [];
                if (!fingerprintMap[key].some(e => e.file === file)) {
                    fingerprintMap[key].push({ file, mfr, pid: '*' });
                }
                return;
            }

            uniquePids.forEach(pid => {
                const key = `${mfr}|${pid}`.toLowerCase();
                if (!fingerprintMap[key]) fingerprintMap[key] = [];
                // Only push if not already in for THIS file (prevents internal dupes from appearing as cross-driver dupes)
                if (!fingerprintMap[key].some(e => e.file === file)) {
                    fingerprintMap[key].push({ file, mfr, pid });
                }
            });
        });
    });
  } catch (e) {
    console.error(`Failed to parse ${file}: ${e.message}`);
  }
});

const duplicates = Object.keys(fingerprintMap).filter(key => fingerprintMap[key].length > 1);
console.log(`Found ${duplicates.length} duplicated fingerprints.`);

// Priority ranking (lower is better/more specific)
function getPriority(filePath) {
  const name = path.basename(path.dirname(filePath));
  if (name.includes('hybrid')) return 1;
  if (name.includes('shutter') || name.includes('roller')) return 2;
  if (name.includes('thermostat') || name.includes('climate')) return 3;
  if (name.includes('radiator')) return 4;
  if (name.includes('dimmer')) return 5;
  if (name.includes('plug_energy')) return 6;
  if (name.includes('plug')) return 7;
  if (name.includes('switch')) return 8;
  if (name.includes('button') || name.includes('remote')) return 9;
  if (name.includes('pir') || name.includes('motion')) return 10;
  if (name.includes('leak') || name.includes('smoke')) return 11;
  if (name.includes('sensor')) return 12;
  if (name.includes('light')) return 13;
  if (name === 'air_purifier') return 80; 
  if (name === 'generic_tuya' || name === 'universal_fallback') return 100;
  return 50;
}

let fixes = 0;
const filesToUpdate = new Map(); // file -> composeObject

duplicates.forEach(key => {
  const entries = fingerprintMap[key];
  entries.sort((a, b) => {
      const pA = getPriority(a.file);
      const pB = getPriority(b.file);
      if (pA !== pB) return pA - pB;
      return a.file.length - b.file.length;
  });

  const winner = entries[0];
  const losers = entries.slice(1);

  losers.forEach(loser => {
    // Load or get from cache
    if (!filesToUpdate.has(loser.file)) {
        try {
            filesToUpdate.set(loser.file, JSON.parse(fs.readFileSync(loser.file, 'utf8')));
        } catch (e) { return; }
    }

    const compose = filesToUpdate.get(loser.file);
    if (!compose.zigbee) return;

    // Removal logic for standard single-object zigbee entry
    if (!Array.isArray(compose.zigbee)) {
        const mfrs = compose.zigbee.manufacturerName || [];
        const pids = compose.zigbee.productId || [];

        const mfrLower = loser.mfr.toLowerCase();
        const pidLower = loser.pid.toLowerCase();

        // If we have an exact match in a list of many
        if (Array.isArray(mfrs) && mfrs.length > 1) {
            const idx = mfrs.findIndex(m => m.toLowerCase().trim() === mfrLower);
            if (idx !== -1) {
                console.log(`[FIX] Removing ${key} from ${path.relative(DRIVERS_DIR, loser.file)} (Winner: ${path.relative(DRIVERS_DIR, winner.file)})`);
                mfrs.splice(idx * 1);
                fixes++;
            }
        } else if (Array.isArray(pids) && pids.length > 1) {
            const idx = pids.findIndex(p => p.toLowerCase().trim() === pidLower);
            if (idx !== -1) {
                 console.log(`[FIX] Removing ${key} from ${path.relative(DRIVERS_DIR, loser.file)} (Winner: ${path.relative(DRIVERS_DIR, winner.file)})`);
                 pids.splice(idx * 1);
                 fixes++;
            }
        } else if (mfrs.length === 1 && pids.length === 1) {
             // 1:1 Duplicate. We should probably remove the whole driver or flag it.
             // For safety, let's keep it but comment it out? // Actually , if it's 1:1 and a duplicate, the winner should take it all.
             // But we don't want to break the loser if it's a valid driver.
        }
    }
  });
});

console.log(`\n---  Saving ${filesToUpdate.size} Files ---`);
filesToUpdate.forEach((compose, file) => {
    // Also deduplicate the winner's lists before saving if they were winners of an internal dupe check
    // Actually, let's just save.
    
    // Final internal cleanup (remove dupes within same driver)
    if (compose.zigbee && !Array.isArray(compose.zigbee)) {
        if (Array.isArray(compose.zigbee.manufacturerName)) {
            compose.zigbee.manufacturerName = [...new Set(compose.zigbee.manufacturerName)];
        }
        if (Array.isArray(compose.zigbee.productId)) {
            compose.zigbee.productId = [...new Set(compose.zigbee.productId)];
        }
    }

    fs.writeFileSync(file, JSON.stringify(compose, null, 2) + '\n');
    console.log(`  Updated ${path.relative(ROOT, file)}`);
});

console.log(`\n Fingerprint Consolidation Complete. ${fixes} removals performed.`);
