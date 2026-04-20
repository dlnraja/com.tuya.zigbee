const fs = require('fs');
const path = require('path');

// Extract battery related code from HybridSensorBase.js
const file = 'lib/devices/HybridSensorBase.js';
let content = fs.readFileSync(file, 'utf8');

// Print lines around measure_battery removal
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('removeCapability(\'measure_battery\')')) {
    console.log(`\n--- Line ${i+1} ---`);
    for (let j = Math.max(0, i-5); j < Math.min(lines.length, i+15); j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
  }
}
