const fs = require('fs');
const path = require('path');

// Extract battery related code from BatteryManagerV4.js
const file = 'lib/BatteryManagerV4.js';
let content = fs.readFileSync(file, 'utf8');

// Look for mainsPowered check
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('isMainsPowered')) {
    console.log(`\n--- Line ${i+1} ---`);
    for (let j = Math.max(0, i-5); j < Math.min(lines.length, i+15); j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
  }
}
