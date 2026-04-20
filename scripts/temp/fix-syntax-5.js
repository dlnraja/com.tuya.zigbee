const fs = require('fs');
const file = 'drivers/switch_1gang/driver.js';
const content = fs.readFileSync(file, 'utf8');

const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("1-Gang switch flow cards registered (v5.5.930)'))")) {
     fixedLines.push(lines[i]);
  } else if (lines[i].includes("1-Gang switch flow cards registered (v5.5.930)');")) {
     fixedLines.push("    this.log('[FLOW]  1-Gang switch flow cards registered (v5.5.930)');");
  } else {
    fixedLines.push(lines[i]);
  }
}

fs.writeFileSync(file, fixedLines.join('\n'));
console.log(' Fixed syntax error in switch_1gang/driver.js');
