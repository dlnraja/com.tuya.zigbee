const fs = require('fs');
const file = 'drivers/switch_2gang/driver.js';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
console.log('--- Lines 120-130 ---');
for (let i = 118; i < 130; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
