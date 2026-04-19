const fs = require('fs');
const file = 'drivers/switch_1gang/driver.js';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("this.log('[FLOW] ")) {
    // Determine what follows or just fix it directly
    if (!lines[i].includes("');") && !lines[i].includes('");')) {
      fixedLines.push("    this.log('[FLOW]  Scene mode registered');");
    } else {
      fixedLines.push(lines[i]);
    }
  } else {
    fixedLines.push(lines[i]);
  }
}

fs.writeFileSync(file, fixedLines.join('\n'));
console.log(' Fixed syntax error in switch_1gang/driver.js');
