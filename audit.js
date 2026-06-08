const fs = require('fs');
const path = require('path');

const driversDir = path.join(__dirname, 'drivers');
const drivers = fs.readdirSync(driversDir).filter(dir => fs.statSync(path.join(driversDir, dir)).isDirectory());

const map = {};

drivers.forEach(dir => {
  const compPath = path.join(driversDir, dir, 'driver.compose.json');
  if (fs.existsSync(compPath)) {
    try {
      const comp = JSON.parse(fs.readFileSync(compPath, 'utf8'));
      if (comp.zigbee && comp.zigbee.manufacturerName && comp.zigbee.productId) {
        // use Set to remove duplicates in the driver's arrays itself
        const uniqueMfs = [...new Set(comp.zigbee.manufacturerName.map(m => m.toLowerCase()))];
        const uniquePid = [...new Set(comp.zigbee.productId.map(p => p.toLowerCase()))];

        uniqueMfs.forEach(mfs => {
          uniquePid.forEach(pid => {
            const key = `${pid}|${mfs}`;
            if (!map[key]) {
              map[key] = new Set();
            }
            map[key].add(dir);
          });
        });
      }
      
      // Also check explicit fingerprints array!
      if (comp.zigbee && comp.zigbee.fingerprints) {
        comp.zigbee.fingerprints.forEach(fp => {
          if (fp.manufacturerName && fp.productId) {
             const key = `${String(fp.productId).toLowerCase()}|${fp.manufacturerName.toLowerCase()}`;
             if (!map[key]) map[key] = new Set();
             map[key].add(dir);
          }
        });
      }
    } catch (e) {
      console.error(`Error parsing ${compPath}: ${e.message}`);
    }
  }
});

let collisionCount = 0;
let output = "# Fingerprint Collision Audit\n\n";

Object.keys(map).forEach(key => {
  const driverList = Array.from(map[key]);
  if (driverList.length > 1) {
    collisionCount++;
    output += `- EXACT COLLISION: ${key} is mapped in ${driverList.length} drivers: ${driverList.join(', ')}\n`;
  }
});

output = `Found ${collisionCount} exact collisions (Same manufacturerName AND Same productId across multiple drivers).\n\n` + output;

fs.writeFileSync('audit_report.md', output);
console.log(`Audit complete. Found ${collisionCount} exact collisions. Saved to audit_report.md`);
