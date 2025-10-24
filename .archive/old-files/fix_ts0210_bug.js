const fs = require('fs');
const path = require('path');

console.log('🔧 FIXING TS0210 BUG - Removing from all drivers except vibration_sensor\n');

const driversDir = path.join(__dirname, '..', 'drivers');
const drivers = fs.readdirSync(driversDir);

let fixedCount = 0;
let skippedCount = 0;

drivers.forEach(driverName => {
  const driverPath = path.join(driversDir, driverName);
  const composePath = path.join(driverPath, 'driver.compose.json');
  
  // Skip if not a directory or no compose file
  if (!fs.statSync(driverPath).isDirectory() || !fs.existsSync(composePath)) {
    return;
  }
  
  // Skip vibration_sensor - it's the correct driver for TS0210
  if (driverName === 'vibration_sensor') {
    console.log(`✅ SKIP: ${driverName} (correct driver for TS0210)`);
    skippedCount++;
    return;
  }
  
  // Read and parse
  const content = fs.readFileSync(composePath, 'utf8');
  const data = JSON.parse(content);
  
  let modified = false;
  
  // Check manufacturerName array
  if (data.zigbee && data.zigbee.manufacturerName) {
    const before = data.zigbee.manufacturerName.length;
    data.zigbee.manufacturerName = data.zigbee.manufacturerName.filter(id => id !== 'TS0210');
    if (data.zigbee.manufacturerName.length < before) {
      console.log(`🔨 FIX: ${driverName} - Removed TS0210 from manufacturerName`);
      modified = true;
    }
  }
  
  // Check productId array
  if (data.zigbee && data.zigbee.productId) {
    const before = data.zigbee.productId.length;
    data.zigbee.productId = data.zigbee.productId.filter(id => id !== 'TS0210');
    if (data.zigbee.productId.length < before) {
      console.log(`🔨 FIX: ${driverName} - Removed TS0210 from productId`);
      modified = true;
    }
  }
  
  // Write back if modified
  if (modified) {
    fs.writeFileSync(composePath, JSON.stringify(data, null, 2) + '\n');
    fixedCount++;
  }
});

console.log(`\n✅ DONE!`);
console.log(`📊 Fixed: ${fixedCount} drivers`);
console.log(`⏭️  Skipped: ${skippedCount} drivers (vibration_sensor)`);
console.log(`\n🎯 Next step: Run "homey app build" to regenerate app.json`);
