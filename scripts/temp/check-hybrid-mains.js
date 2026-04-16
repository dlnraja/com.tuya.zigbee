const fs = require('fs');
const path = require('path');

// Extract battery related code from TuyaHybridDevice.js
const file = 'lib/devices/TuyaHybridDevice.js';
let content = fs.readFileSync(file, 'utf8');

// Look for mainsPowered getter
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('mainsPowered')) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
