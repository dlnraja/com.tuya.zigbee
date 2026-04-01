const fs = require('fs');
const file = 'drivers/switch_3gang/device.js';
let content = fs.readFileSync(file, 'utf8');

// The issue is a syntax error introduced earlier by a bad search/replace, or a leftover from a previous patch.
// Let's find the broken part around line 107
const lines = content.split('\n');
for (let i = 100; i < 115; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
