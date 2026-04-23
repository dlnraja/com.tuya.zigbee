const fs = require('fs');
const path = require('path');
const d = 'drivers';
const result = {};
let total = 0;
fs.readdirSync(d).forEach(dr => {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(d, dr, 'driver.compose.json'), 'utf8'));
    const z = c.zigbee;
    if (!z) return;
    // zigbee can be object or array
    const entries = Array.isArray(z) ? z : [z]      ;
    entries.forEach(entry => {
      const mfrs = entry.manufacturerName || [];
      const pids = entry.productId || [];
      mfrs.forEach(m => {
        pids.forEach(pid => {
          const key = m + '|' + pid;
          if (!result[key]) result[key] = [];
          if (!result[key].includes(dr)) result[key].push(dr);
          total++;
        });
      });
    });
  } catch(e) {}
});
// Collisions
let collisions = 0;
Object.entries(result).forEach(([key, drivers]) => {
  if (drivers.length > 1) {
    console.log('COLLISION: ' + key + ' -> ' + drivers.join(', '));
    collisions++;
  }
});
// Stats
const byDriver = {};
Object.entries(result).forEach(([key, drivers]) => {
  drivers.forEach(dr => { byDriver[dr] = (byDriver[dr] || 0) + 1; });
});
console.log('\nTotal combos: ' + total + ', Unique keys: ' + Object.keys(result).length + ', Collisions: ' + collisions);
// Top 15 drivers by fingerprint count
const sorted = Object.entries(byDriver).sort((a,b) => b[1]-a[1]);
console.log('\nTop 15 drivers by fingerprint count:');
sorted.slice(0,15).forEach(([dr,cnt]) => console.log('  ' + dr + ': ' + cnt));
