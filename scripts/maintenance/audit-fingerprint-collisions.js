/**
 * scripts/maintenance/audit-fingerprint-collisions.js
 * 
 * Audits Zigbee manufacturerName + productId couples across all drivers.
 * Identifies collisions where the same manufacturerName is present in multiple drivers
 * without sufficient productId differentiation.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const DRIVERS_DIR = path.join(ROOT, 'drivers');

function audit() {
  const mfrToDrivers = {};
  const drivers = [];

  const dirs = fs.readdirSync(DRIVERS_DIR);
  for (const d of dirs) {
    const cf = path.join(DRIVERS_DIR, d, 'driver.compose.json');
    if (!fs.existsSync(cf)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cf, 'utf8'));
      const zigbee = data.zigbee;
      if (!zigbee) continue;

      const mfrs = zigbee.manufacturerName || [];
      const pids = zigbee.productId || [];

      drivers.push({ id: d, mfrs, pids });

      mfrs.forEach(mfr => {
        if (!mfrToDrivers[mfr]) mfrToDrivers[mfr] = [];
        mfrToDrivers[mfr].push({ driverId: d, pids });
      });
    } catch (e) {}
  }

  console.log('# Fingerprint Collision Audit');
  let collisionCount = 0;

  for (const [mfr, occurrences] of Object.entries(mfrToDrivers)) {
    if (occurrences.length > 1) {
      // Logic check: do they have disjoint PIDs? const driversWithEmptyPids = occurrences.filter(o => o.pids.length === 0)       ;
      
      if (driversWithEmptyPids.length > 0 ) {
        collisionCount++;
        console.log(`\n Collision for [${mfr}]:`);
        occurrences.forEach(o => {
          console.log(`  - Driver: ${o.driverId} | PIDs: [${o.pids.join(', ')}] ${o.pids.length === 0 ? ' (Greedy/Catch-all )' : ''}`)      ;
        });
        
        if (driversWithEmptyPids.length === occurrences.length) {
          console.log('   CRITICAL: All drivers are catch-all for this manufacturer. Homey matching will be non-deterministic.');
        } else if (driversWithEmptyPids.length > 0) {
           console.log(`   WARNING: Driver(s) [${driversWithEmptyPids.map(d=>d.driverId).join(', ')}] will steal devices from others due to empty productId array.`);
        }
      } else {
        // All have PIDs, check for overlaps
        const allPids = [];
        const overlaps = [];
        occurrences.forEach(o => {
          o.pids.forEach(p => {
            if (allPids.includes(p)) overlaps.push(p);
            allPids.push(p);
          });
        });

        if (overlaps.length > 0) {
          collisionCount++;
          console.log(`\n Direct PID Overlap for [${mfr}]:`);
          console.log(`  - Overlapping PIDs: [${[...new Set(overlaps)].join(', ')}]`);
          occurrences.forEach(o => {
            console.log(`  - Driver: ${o.driverId} | PIDs: [${o.pids.join(', ')}]`);
          });
        }
      }
    }
  }

  if (collisionCount === 0) {
    console.log('\n No fingerprint collisions detected.');
  } else {
    console.log(`\nFound ${collisionCount} manufacturer collisions.`);
  }
}

audit();
