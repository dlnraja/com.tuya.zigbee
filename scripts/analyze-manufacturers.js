const fs = require('fs');
const path = require('path');

const manufacturers = [];
const driversDir = 'drivers';

fs.readdirSync(driversDir).forEach(driver => {
  const composePath = path.join(driversDir, driver, 'driver.compose.json');
  if (fs.existsSync(composePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(composePath, 'utf8'));
      const mfrList = data?.zigbee?.manufacturerName || [];
      manufacturers.push(...mfrList);
    } catch(e) {}
  }
});

const counts = {};
manufacturers.forEach(m => counts[m] = (counts[m] || 0) + 1);

const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
console.log(`Total manufacturers: ${manufacturers.length}`);
console.log(`Unique manufacturers: ${sorted.length}`);
console.log(`\nTop 50 most used:`);
sorted.slice(0, 50).forEach(([m, c]) => console.log(`${String(c).padStart(3)} ${m}`));

// Save top 200 to file for batch processing
const top200 = sorted.slice(0, 200).map(([m]) => m);
fs.writeFileSync('data/enrichment/priority-manufacturers.txt', top200.join('\n'));
console.log(`\nSaved top 200 to data/enrichment/priority-manufacturers.txt`);
