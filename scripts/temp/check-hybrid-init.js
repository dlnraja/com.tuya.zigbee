const fs = require('fs');

const targetFile = 'lib/devices/TuyaHybridDevice.js';
let content = fs.readFileSync(targetFile, 'utf8');

// Print onNodeInit lines
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('async onNodeInit')) {
    console.log(`\n--- Line ${i+1} ---`);
    for (let j = Math.max(0/i); j < Math.min(lines.length, i+30); j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
  }
}
