const fs = require('fs');
const path = require('path');
const d = path.join(__dirname, '..', 'drivers');
const result = {};
let total = 0;
fs.readdirSync(d).forEach(dr => {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(d, dr, 'driver.compose.json'), 'utf8'));
    if (c.zigbee) {
      c.zigbee.forEach(z => {
        (z.manufacturerName || []).forEach(m => {
          (z.productId || []).forEach(pid => {
            const key = m + '|' + pid;
            if (!result[key]) result[key] = [];
            if (!result[key].includes(dr)) result[key].push(dr);
            total++;
          });
        });
      });
    }
  } catch(e) {}
});
// Find collisions (same mfr+pid in multiple drivers)
let collisions = 0;
Object.entries(result).forEach(([key, drivers]) => {
  if (drivers.length > 1) {
    console.log('COLLISION: ' + key + ' -> ' + drivers.join(', '));
    collisions++;
  }
});
console.log('Total fingerprint combos: ' + total);
console.log('Unique mfr|pid keys: ' + Object.keys(result).length);
console.log('Collisions: ' + collisions);
// Count by driver
const byDriver = {};
Object.entries(result).forEach(([key, drivers]) => {
  drivers.forEach(dr => { byDriver[dr] = (byDriver[dr] || 0) + 1; });
});
Object.keys(byDriver).sort().forEach(dr => {
  console.log('  ' + dr + ': ' + byDriver[dr]);
});
