const fs = require('fs');
const file = 'drivers/switch_1gang/driver.js';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
console.log('--- Lines 100-110 ---');
for (let i = 98; i < 110; i++) {
  if (lines[i] !== undefined) {
    console.log(`${i+1}: ${lines[i]}`);
  }
}
