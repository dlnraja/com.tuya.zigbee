const fs = require('fs');
const path = require('path');

console.log('🔧 Adding zigbee.learnmode to all drivers...\n');

const driversDir = path.join(__dirname, '..', '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

let fixed = 0;
let skipped = 0;
let errors = 0;

for (const driverName of drivers) {
  const driverPath = path.join(driversDir, driverName);
  const composeJsonPath = path.join(driverPath, 'driver.compose.json');
  
  if (!fs.existsSync(composeJsonPath)) {
    continue;
  }
  
  try {
    const content = fs.readFileSync(composeJsonPath, 'utf8');
    const driver = JSON.parse(content);
    
    // Skip if not a Zigbee driver
    if (!driver.zigbee) {
      skipped++;
      continue;
    }
    
    // Skip if already has learnmode
    if (driver.zigbee.learnmode) {
      skipped++;
      continue;
    }
    
    // Add learnmode
    driver.zigbee.learnmode = {
      "instruction": {
        "en": "Press the pairing button on your device to start pairing.\n\nIf your device does not have a pairing button, check the device manual for pairing instructions."
      }
    };
    
    // Write back
    fs.writeFileSync(composeJsonPath, JSON.stringify(driver, null, 2) + '\n', 'utf8');
    
    console.log(`✅ ${driverName}`);
    fixed++;
    
  } catch (err) {
    console.error(`❌ ${driverName}: ${err.message}`);
    errors++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`   ✅ Fixed: ${fixed}`);
console.log(`   ⏭️  Skipped: ${skipped}`);
console.log(`   ❌ Errors: ${errors}`);
console.log(`\n🎉 Done!`);
