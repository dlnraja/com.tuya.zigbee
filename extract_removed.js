const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get all removed manufacturerNames from all drivers in commit 3f58bd6ab6
const diff = execSync('git diff 3f58bd6ab6^..3f58bd6ab6 -- drivers/', { encoding: 'utf8' });

// Extract removed lines with manufacturerNames
const removedLines = diff.split('\n').filter(line => line.startsWith('-') && line.includes('"_T'));
const removedIds = [...new Set(removedLines.map(line => {
  const match = line.match(/"(_T[^"]+)"/);
  return match ? match[1] : null;
}).filter(Boolean))];

console.log(`Total unique removed manufacturerNames: ${removedIds.length}`);

// Get all current manufacturerNames in drivers
const driversDir = path.join(__dirname, 'drivers');
let allCurrentIds = new Set();

function scanDrivers(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDrivers(fullPath);
    } else if (item === 'driver.compose.json') {
      const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
      const matches = content.match(/"_t[^"]+"/g) || [];
      matches.forEach(m => allCurrentIds.add(m.replace(/"/g, '')));
    }
  }
}

scanDrivers(driversDir);
console.log(`Total current manufacturerNames: ${allCurrentIds.size}`);

// Find truly orphaned IDs (not in any driver)
const orphans = removedIds.filter(id => !allCurrentIds.has(id.toLowerCase()));
console.log(`\nOrphaned manufacturerNames (need restoration): ${orphans.length}`);

// Save orphans to file for research
fs.writeFileSync('orphans_to_research.json', JSON.stringify(orphans, null, 2));
console.log('\nSaved to orphans_to_research.json');

// Show first 50 for quick view
console.log('\nFirst 50 orphans:');
orphans.slice(0, 50).forEach(id => console.log(`  ${id}`));
