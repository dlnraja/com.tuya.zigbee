// Count FPs in fingerprints.json
const fs = require('fs');
const c = fs.readFileSync('lib/tuya/fingerprints.json', 'utf8');
const j = JSON.parse(c);
console.log('Total FPs:', Object.keys(j).length);
// Count drivers used
const drivers = new Set();
for (const fp of Object.values(j)) {
  if (fp.driverId) drivers.add(fp.driverId);
}
console.log('Unique drivers:', drivers.size);
console.log('First 5 drivers:', [...drivers].slice(0, 5));
