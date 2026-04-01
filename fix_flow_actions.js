const fs = require('fs');
const path = require('path');
const glob = require('glob');

const driversDir = path.join(__dirname, 'drivers');
const driverFiles = glob.sync(driversDir + '/*/driver.js');

let changedFiles = 0;

driverFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('setCapabilityValue') && 
       (lines[i].includes('return true') || lines[i].includes('args.device') || lines[i].includes('{device}'))) {
      
      lines[i] = lines[i].replace(/setCapabilityValue/g, 'triggerCapabilityListener');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Updated ' + file);
    changedFiles++;
  }
});

console.log('Total files updated: ' + changedFiles);
