const fs = require('fs');
const path = require('path');
const driversDir = './drivers';
let fixed = 0;
const dirs = fs.readdirSync(driversDir);

for (const dir of dirs) {
  const filePath = path.join(driversDir, dir, 'driver.compose.json');
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix numeric keys that should be "onoff"
  if (content.includes('6: {') || content.includes('6:{')) {
    content = content.replace(/(\s+)6:\s*\{/g, '$1"onoff": {');
    fs.writeFileSync(filePath, content);
    fixed++;
    console.log('Fixed:', dir);
  }
}

console.log('Total fixed:', fixed);
