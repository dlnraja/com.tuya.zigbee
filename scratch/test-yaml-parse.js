const fs = require('fs');
const lines = fs.readFileSync('.github/workflows/daily-promote-to-test.yml', 'utf8').split('\n');
const line = lines[110]; // 0-indexed
console.log('Line content:', JSON.stringify(line));
for (let i = 0; i < line.length; i++) {
  console.log(`${i}: ${line[i]} (code ${line.charCodeAt(i)})`);
}
