const fs = require('fs');

const targetFile = 'lib/devices/TuyaHybridDevice.js';
let content = fs.readFileSync(targetFile, 'utf8');

// Look for a good injection point in TuyaHybridDevice.js
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('this.log(\'\');') && lines[i+1]?.includes('this.log(\' STEP ')) {
    console.log(`\n--- Line ${i+1} ---`) ;
    for (let j = Math.max(0, i-2 ); j < Math.min(lines.length, i+5); j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
  }
}
