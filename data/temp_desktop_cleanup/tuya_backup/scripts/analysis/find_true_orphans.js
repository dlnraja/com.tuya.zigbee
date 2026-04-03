const fs = require('fs');
const path = require('path');

// Read removed IDs
const removedIds = fs.readFileSync('removed_ids_raw.txt', 'utf8').trim().split('\n').filter(Boolean);
console.log(`Total removed IDs: ${removedIds.length}`);

// Get all current manufacturerNames from all drivers
const driversDir = path.join(__dirname, 'drivers');
let allCurrentIds = new Set();

function scanDrivers(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDrivers(fullPath);
    } else if (item === 'driver.compose.json') {
      const content = fs.readFileSync(fullPath, 'utf8');
      const matches = content.match(/"_T[^"]+"/gi) || [];
      matches.forEach(m => allCurrentIds.add(m.replace(/"/g, '').toLowerCase()));
    }
  }
}

scanDrivers(driversDir);
console.log(`Total current IDs in drivers: ${allCurrentIds.size}`);

// Find true orphans (case-insensitive check)
const orphans = removedIds.filter(id => !allCurrentIds.has(id.toLowerCase()));
console.log(`\nTrue orphans (need restoration): ${orphans.length}`);

// Save orphans
fs.writeFileSync('true_orphans_final.txt', orphans.join('\n'));
console.log('Saved to true_orphans_final.txt');

// Show all orphans
console.log('\nAll orphans:');
orphans.forEach(id => console.log(`  ${id}`));
