const fs = require('fs');
const path = require('path');
const d = 'drivers';
const fpMap = {};
const collisions = [];

fs.readdirSync(d).forEach(dr => {
  const f = path.join(d, dr, 'driver.compose.json');
  if (!fs.existsSync(f)) return;
  try {
    const c = JSON.parse(fs.readFileSync(f, 'utf8'));
    const z = Array.isArray(c.zigbee) ? c.zigbee : c.zigbee ? [c.zigbee] : []      ;
    z.forEach(entry => {
      const mfrs = entry.manufacturerName || [];
      const pids = entry.productId || [];
      mfrs.forEach(mfr => pids.forEach(pid => {
        const key = mfr + '|' + pid;
        if (fpMap[key] && fpMap[key] !== dr) {
          collisions.push({ key, driver1: fpMap[key], driver2: dr });
        }
        if (!fpMap[key]) fpMap[key] = dr;
      }));
    });
  } catch(e) {}
});

// Group by driver pair
const pairs = {};
collisions.forEach(c => {
  const pairKey = [c.driver1, c.driver2].sort().join(' <> ');
  if (!pairs[pairKey]) pairs[pairKey] = [];
  pairs[pairKey].push(c.key);
});

console.log('Collision pairs: ' + Object.keys(pairs).length);
Object.entries(pairs).forEach(([pair, keys]) => {
  console.log('\n' + pair + ' (' + keys.length + ' collisions)');
  // Show first 3
  keys.slice(0, 3).forEach(k => console.log('  ' + k));
  if (keys.length > 3) console.log('  ... and ' + (keys.length - 3) + ' more');
});
