const fs = require('fs');
const path = require('path');

console.log('Adding images object to all drivers...\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir).filter(d => 
  fs.statSync(path.join(driversDir, d)).isDirectory()
);

let added = 0;
let skipped = 0;

for (const driverName of drivers) {
  const composeJsonPath = path.join(driversDir, driverName, 'driver.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    skipped++;
    continue;
  }
  
  try {
    const driver = JSON.parse(fs.readFileSync(composeJsonPath, 'utf8'));
    
    let needsUpdate = false;
    
    if (!driver.images) {
      needsUpdate = true;
    } else if (!driver.images.small || !driver.images.small.includes('assets/images')) {
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      driver.images = {
        small: './assets/images/small.png',
        large: './assets/images/large.png',
        xlarge: './assets/images/xlarge.png'
      };
      
      fs.writeFileSync(composeJsonPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
      console.log(`✅ ${driverName}`);
      added++;
    } else {
      skipped++;
    }
    
  } catch (err) {
    console.error(`❌ ${driverName}: ${err.message}`);
  }
}

console.log(`\nAdded: ${added}, Skipped: ${skipped}`);
console.log('Done!');
