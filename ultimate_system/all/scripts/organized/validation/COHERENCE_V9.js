const fs = require('fs');

console.log('🔍 COHERENCE V9');

let checked = 0;
let moved = 0;

// Check driver coherence
fs.readdirSync('./drivers').forEach(d => {
  const f = `./drivers/${d}/driver.compose.json`;
  if (fs.existsSync(f)) {
    try {
      const data = JSON.parse(fs.readFileSync(f));
      checked++;
      
      // Simple validation
      if (data.zigbee && data.zigbee.manufacturerName) {
        console.log(`✓ ${d}: OK`);
      }
    } catch(e) {
      console.log(`❌ ${d}: Error`);
    }
  }
});

console.log(`📊 Checked ${checked} drivers, moved ${moved}`);
