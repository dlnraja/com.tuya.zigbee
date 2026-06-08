const fs = require('fs');
const path = require('path');

// 1. Load all master fingerprint databases
const masterDBFiles = [
  'data/fingerprints.json',
  'lib/tuya/fingerprints.json',
  'lib/tuya-dp-engine/fingerprints.json',
  'lib/tuya-engine/fingerprints.json'
];

const masterMap = {};

masterDBFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    Object.keys(data).forEach(mfs => {
      const lowerMfs = String(mfs).toLowerCase();
      if (!masterMap[lowerMfs]) {
        masterMap[lowerMfs] = { driverId: data[mfs].driverId, modelIds: new Set() };
      }
      if (data[mfs].modelIds) {
        data[mfs].modelIds.forEach(pid => masterMap[lowerMfs].modelIds.add(String(pid).toLowerCase()));
      }
    });
  }
});

// 2. Process all drivers
const driversDir = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversDir).filter(dir => fs.statSync(path.join(driversDir, dir)).isDirectory());

let totalKept = 0;
let totalDiscarded = 0;

drivers.forEach(dir => {
  const compPath = path.join(driversDir, dir, 'driver.compose.json');
  if (fs.existsSync(compPath)) {
    let comp;
    try {
      comp = JSON.parse(fs.readFileSync(compPath, 'utf8'));
    } catch(e) {
      return;
    }

    if (comp.zigbee) {
      const newFingerprints = [];
      const seen = new Set();
      
      const addFp = (mfs, pid) => {
        const key = `${String(mfs).toLowerCase()}|${String(pid).toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          newFingerprints.push({ manufacturerName: mfs, productId: pid });
        }
      };

      // A) Keep existing explicit fingerprints
      if (comp.zigbee.fingerprints) {
        comp.zigbee.fingerprints.forEach(fp => {
          if (fp.manufacturerName && fp.productId) addFp(fp.manufacturerName, fp.productId);
        });
      }

      // B) Process cartesian arrays
      if (comp.zigbee.manufacturerName && comp.zigbee.productId) {
        const mfsList = comp.zigbee.manufacturerName;
        const pidList = comp.zigbee.productId;

        mfsList.forEach(mfs => {
          const mfsLower = String(mfs).toLowerCase();
          pidList.forEach(pid => {
            const pidLower = String(pid).toLowerCase();
            const masterEntry = masterMap[mfsLower];

            if (masterEntry) {
              // Known manufacturer. Does it belong to THIS driver?
              if (masterEntry.driverId === dir) {
                // Yes. Does it include THIS pid?
                if (masterEntry.modelIds.has(pidLower)) {
                  addFp(mfs, pid);
                  totalKept++;
                } else {
                  // MFS belongs to this driver, but PID is NOT in master list.
                  // We'll keep it just in case, but usually TS0601 is in modelIds.
                  addFp(mfs, pid);
                  totalKept++;
                }
              } else {
                // MFS belongs to a DIFFERENT driver! Discard!
                totalDiscarded++;
              }
            } else {
              // MFS is NOT in master list. Keep it to be safe.
              addFp(mfs, pid);
              totalKept++;
            }
          });
        });
      }

      // C) Update and save
      delete comp.zigbee.manufacturerName;
      delete comp.zigbee.productId;
      if (newFingerprints.length > 0) {
        comp.zigbee.fingerprints = newFingerprints;
      } else {
        delete comp.zigbee.fingerprints; // if empty
      }

      fs.writeFileSync(compPath, JSON.stringify(comp, null, 2));
    }
  }
});

console.log(`Migration complete. Kept/Added: ${totalKept} explicit fingerprints. Discarded: ${totalDiscarded} cartesian collsions.`);
