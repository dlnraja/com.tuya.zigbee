const fs = require('fs');
const path = require('path');

// Fix "this.homey.flow.getDeviceConditionCard is not a function" error
const searchDir = 'drivers';
let fixedCount = 0;

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'driver.js') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('getDeviceConditionCard')) {
        // Fix the typo (it's actually getConditionCard, not getDeviceConditionCard)
        content = content.replace(/this\.homey\.flow\.getDeviceConditionCard/g, 'this.homey.flow.getConditionCard');
        fs.writeFileSync(fullPath, content);
        console.log(` Fixed getDeviceConditionCard typo in ${fullPath}`);
        fixedCount++;
      }
    }
  }
}

walk(searchDir);
console.log(`\n Fixed getDeviceConditionCard typo in ${fixedCount} files`);
