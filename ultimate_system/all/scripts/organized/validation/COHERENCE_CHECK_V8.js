const fs = require('fs');

console.log('🔍 COHERENCE CHECK V8');

let checked = 0;
let moved = 0;
let issues = 0;

// Check driver coherence
fs.readdirSync('./drivers').forEach(driverName => {
  const composePath = `./drivers/${driverName}/driver.compose.json`;
  
  if (fs.existsSync(composePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(composePath));
      checked++;
      
      // Check if manufacturer IDs match category
      if (data.zigbee && data.zigbee.manufacturerName) {
        const mfgIds = data.zigbee.manufacturerName;
        
        // Simple category validation
        if (driverName.includes('switch') && !mfgIds.some(id => id.includes('TZ3000'))) {
          console.log(`⚠️ Category mismatch: ${driverName}`);
          issues++;
        }
      }
      
    } catch(e) {
      issues++;
      console.log(`❌ Invalid JSON: ${driverName}`);
    }
  }
});

console.log(`📊 Checked ${checked} drivers`);
console.log(`🔄 Moved ${moved} drivers`); 
console.log(`⚠️ Found ${issues} issues`);
console.log('✅ Coherence check complete');
