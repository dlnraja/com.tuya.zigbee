const fs = require('fs');
const glob = require('glob');

const driverFiles = glob.sync('drivers/switch_*/driver.js');

let changedFiles = 0;

driverFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (content.includes('ganggang')) {
    content = content.replace(/ganggang/g, 'gang');
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
    changedFiles++;
  }
});

console.log('Total files updated: ' + changedFiles);
